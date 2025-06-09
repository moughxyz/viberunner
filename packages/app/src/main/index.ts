import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Menu,
  shell,
  Tray,
  nativeImage,
} from "electron"
import { loadIconAsNativeImage } from "../lib/iconUtils"
import { spawn } from "child_process"
import path from "path"
import fixPath from "fix-path"
import log from "electron-log"
import { updateElectronApp } from "update-electron-app"

// By default your repository URL is found in your app's package.json file, repository entry.
updateElectronApp({
  logger: log,
})

// Configure logging
log.transports.file.level = "debug"
log.transports.console.level = "debug"

// Initialize fix-path
fixPath()

// Enable remote module for renderer access to app.getPath
import "@electron/remote/main"
const remoteMain = require("@electron/remote/main")
remoteMain.initialize()

// Create the application menu bar
const createMenuBar = (): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "File",
      submenu: [
        {
          role: "quit",
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [{ role: "minimize" }, { role: "close" }],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Open Data Directory",
          click: async () => {
            const userDataPath = app.getPath("userData")
            try {
              await shell.openPath(userDataPath)
              console.log("Opened data directory:", userDataPath)
            } catch (error) {
              console.error("Failed to open data directory:", error)
              dialog.showErrorBox(
                "Error",
                `Failed to open data directory: ${error}`
              )
            }
          },
        },
      ],
    },
  ]

  // macOS specific adjustments
  if (process.platform === "darwin") {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    })

    // Window menu
    const windowMenu = template.find((item) => item.label === "Window")
    if (windowMenu && windowMenu.submenu && Array.isArray(windowMenu.submenu)) {
      windowMenu.submenu = [
        { role: "close" },
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ]
    }
  }

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Keep track of runner processes for dock management
const runnerProcesses = new Map<string, any>()

// Keep track of tray icons for menu bar management
const runnerTrays = new Map<string, Tray>()
const runnerPopups = new Map<string, BrowserWindow>()

// Load fallback icon for menu bar
const loadFallbackIcon = async (): Promise<Electron.NativeImage> => {
  // Try multiple possible paths for the icon
  const possiblePaths = [
    path.join(__dirname, "../assets/icon.png"),
    path.join(__dirname, "../../assets/icon.png"),
    path.join(__dirname, "../../../packages/app/assets/icon.png"),
    path.join(process.cwd(), "packages/app/assets/icon.png"),
  ]

  for (const iconPath of possiblePaths) {
    try {
      console.log(`Trying to load fallback icon from: ${iconPath}`)
      const icon = nativeImage.createFromPath(iconPath)
      if (!icon.isEmpty()) {
        console.log(`Successfully loaded fallback icon from: ${iconPath}`)
        return icon
      }
    } catch (error) {
      console.warn(`Failed to load from ${iconPath}:`, error)
    }
  }

  console.warn("All fallback icon paths failed, creating empty square fallback")
  // Create a simple empty square as final fallback
  const size = 16
  const buffer = Buffer.alloc(size * size * 4)

  // Create empty square with border
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4
      const isBorder = x === 0 || x === size - 1 || y === 0 || y === size - 1

      if (isBorder) {
        buffer[index] = 128 // R - gray
        buffer[index + 1] = 128 // G - gray
        buffer[index + 2] = 128 // B - gray
        buffer[index + 3] = 255 // A - opaque
      } else {
        buffer[index] = 0 // R - transparent
        buffer[index + 1] = 0 // G - transparent
        buffer[index + 2] = 0 // B - transparent
        buffer[index + 3] = 0 // A - transparent
      }
    }
  }

  return nativeImage.createFromBuffer(buffer, { width: size, height: size })
}

// Create a tray icon for a runner in the menu bar
const createRunnerTray = async (
  runnerId: string,
  runnerName: string,
  iconPath?: string
): Promise<void> => {
  try {
    // Check if tray already exists
    if (runnerTrays.has(runnerId)) {
      console.log(`Tray already exists for runner: ${runnerId}`)
      return
    }

            // Use provided runner icon or default Viberunner logo
    let trayIcon
    if (iconPath) {
      try {
        console.log(`Loading custom icon for tray: ${iconPath}`)

        // For tray icons, try the utility function with dock context to bypass menu bar restrictions
        if (iconPath.toLowerCase().endsWith('.svg')) {
          console.log(`SVG detected, using loadIconAsNativeImage with dock context`)
          trayIcon = await loadIconAsNativeImage(iconPath, 'dock')
        } else {
          // For non-SVG files, use createFromPath directly
          trayIcon = nativeImage.createFromPath(iconPath)
        }

        console.log(`Custom icon loaded. isEmpty: ${trayIcon.isEmpty()}, size: ${JSON.stringify(trayIcon.getSize())}`)

        // Check if the loaded icon is actually valid
        if (trayIcon.isEmpty()) {
          console.warn(`Custom icon is empty, using fallback`)
          trayIcon = await loadFallbackIcon()
        }
      } catch (error) {
        console.warn(
          `Failed to load runner icon from "${iconPath}", using fallback: ${error}`
        )
        trayIcon = await loadFallbackIcon()
      }
    } else {
      console.log(`No runner icon provided, using fallback icon`)
      trayIcon = await loadFallbackIcon()
    }

    // Resize icon appropriately for the platform's menu bar/system tray
    // Note: SVG icons are already sized correctly by the loadIconAsNativeImage utility
    if (!trayIcon.isEmpty() && !iconPath?.toLowerCase().endsWith(".svg")) {
      const iconSize = process.platform === "darwin" ? 16 : 24 // 16px for macOS, 24px for others
      trayIcon = trayIcon.resize({ width: iconSize, height: iconSize })
      console.log(
        `Resized tray icon to ${iconSize}x${iconSize} for platform: ${process.platform}`
      )
    }

    console.log(
      `Creating Tray with icon. Icon isEmpty: ${trayIcon.isEmpty()}, Icon size: ${JSON.stringify(
        trayIcon.getSize()
      )}`
    )

    // Create tray
    const tray = new Tray(trayIcon)

    console.log(`Tray created successfully. isDestroyed: ${tray.isDestroyed()}`)

    // Set tooltip
    tray.setToolTip(`${runnerName} - Click to open`)
    console.log(`Tooltip set for tray: ${runnerName}`)

    // Handle click - toggle popup visibility
    tray.on("click", (_event, bounds) => {
      console.log(`Tray clicked for runner: ${runnerName}`)
      toggleRunnerPopup(runnerId, runnerName, bounds)
    })

    // Handle right-click separately for context menu
    tray.on("right-click", () => {
      console.log(`Tray right-clicked for runner: ${runnerName}`)
      const contextMenu = Menu.buildFromTemplate([
        {
          label: "Remove from Menu Bar",
          click: () => removeRunnerFromTray(runnerId),
        },
      ])
      tray.popUpContextMenu(contextMenu)
    })

    // Store tray reference
    runnerTrays.set(runnerId, tray)

    console.log(
      `Successfully created tray icon for runner: ${runnerName}. Total trays: ${runnerTrays.size}`
    )
  } catch (error) {
    console.error(`Failed to create tray for runner ${runnerId}:`, error)
    throw error
  }
}

// Remove a runner from the menu bar
const removeRunnerFromTray = (runnerId: string): void => {
  try {
    // Close popup if open
    const popup = runnerPopups.get(runnerId)
    if (popup && !popup.isDestroyed()) {
      popup.close()
    }
    runnerPopups.delete(runnerId)

    // Remove tray icon
    const tray = runnerTrays.get(runnerId)
    if (tray) {
      tray.destroy()
      runnerTrays.delete(runnerId)
      console.log(`Removed tray icon for runner: ${runnerId}`)
    }
  } catch (error) {
    console.error(`Failed to remove tray for runner ${runnerId}:`, error)
  }
}

// Toggle popup visibility for a runner
const toggleRunnerPopup = (
  runnerId: string,
  runnerName: string,
  bounds: Electron.Rectangle
): void => {
  try {
    const existingPopup = runnerPopups.get(runnerId)

    if (existingPopup && !existingPopup.isDestroyed()) {
      if (existingPopup.isVisible()) {
        // Hide existing popup
        existingPopup.hide()
        return
      } else {
        // Show existing popup and reposition it
        const windowBounds = existingPopup.getBounds()
        const x = Math.round(
          bounds.x + bounds.width / 2 - windowBounds.width / 2
        )
        const y = Math.round(bounds.y + bounds.height + 4) // 4px gap below tray

        existingPopup.setPosition(x, y, false)
        existingPopup.show()
        return
      }
    }

    console.log(`Creating popup for runner: ${runnerName}`)

    // Create popup window
    const popupWindow = new BrowserWindow({
      width: 400,
      height: 600,
      show: false,
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webSecurity: true,
      },
      vibrancy: "under-window",
      backgroundColor: "#1a1a1a",
    })

    // Position popup under tray icon
    const windowBounds = popupWindow.getBounds()
    const x = Math.round(bounds.x + bounds.width / 2 - windowBounds.width / 2)
    const y = Math.round(bounds.y + bounds.height + 4) // 4px gap below tray

    popupWindow.setPosition(x, y, false)

    // Store popup reference
    runnerPopups.set(runnerId, popupWindow)

    // Handle popup losing focus - hide it
    popupWindow.on("blur", () => {
      popupWindow.hide()
    })

    // Clean up when closed
    popupWindow.on("closed", () => {
      runnerPopups.delete(runnerId)
    })

    // Enable remote module
    remoteMain.enable(popupWindow.webContents)

    // Load the app with the runner ID
    const queryParams = `?runnerId=${encodeURIComponent(runnerId)}&popup=true`

    if (process.env.VITE_DEV_SERVER_URL) {
      popupWindow.loadURL(process.env.VITE_DEV_SERVER_URL + queryParams)
    } else {
      const isDev = process.env.NODE_ENV === "development"
      const rendererPath = isDev
        ? path.join(
            __dirname,
            `../renderer/${process.env.VITE_DEV_NAME}/index.html`
          )
        : path.join(__dirname, "../dist/index.html")

      popupWindow.loadFile(rendererPath, { query: { runnerId, popup: "true" } })
    }

    // Show popup once ready
    popupWindow.once("ready-to-show", () => {
      popupWindow.show()
    })

    console.log(`Successfully created popup for runner: ${runnerName}`)
  } catch (error) {
    console.error(`Failed to create popup for runner ${runnerId}:`, error)
  }
}

// Set dock icon for runner window
const setDockIconForRunner = async (iconPath: string): Promise<void> => {
  try {
    console.log(`Setting dock icon to runner icon: ${iconPath}`)

    // Load the runner icon as native image for dock usage
    const runnerIcon = await loadIconAsNativeImage(iconPath, "dock")

    // Set the dock icon (macOS only)
    if (app.dock && !runnerIcon.isEmpty()) {
      app.dock.setIcon(runnerIcon)
      console.log(`Successfully set dock icon to: ${iconPath}`)
    } else {
      console.warn(
        "Could not set dock icon - either not macOS or icon is empty"
      )
    }
  } catch (error) {
    console.error(`Failed to set dock icon for runner:`, error)
    // Don't throw - this is not critical functionality
  }
}

// Create a separate Electron process for a runner (separate dock icon)
const createRunnerProcess = async (
  runnerId: string,
  runnerName: string,
  iconPath?: string
): Promise<void> => {
  try {
    // Check if process already exists
    if (runnerProcesses.has(runnerId)) {
      console.log(`Runner process already exists for: ${runnerId}`)
      return
    }

    // Get the current executable path
    const electronPath = process.execPath
    const appPath = app.getAppPath()

    console.log(
      `Creating separate Electron process for runner: ${runnerName} (${runnerId})`
    )
    console.log(`Electron path: ${electronPath}`)
    console.log(`App path: ${appPath}`)

    // Spawn new Electron process with runner ID, name, and optional icon path as arguments
    const args = [appPath, "--runner-id", runnerId, "--runner-name", runnerName]
    if (iconPath) {
      args.push("--icon-path", iconPath)
    }

    const runnerProcess = spawn(electronPath, args, {
      detached: true,
      stdio: "ignore",
    })

    // Store process reference
    runnerProcesses.set(runnerId, runnerProcess)

    // Handle process exit
    runnerProcess.on("exit", (code) => {
      console.log(`Runner process exited: ${runnerId} (code: ${code})`)
      runnerProcesses.delete(runnerId)
    })

    // Detach the process so it runs independently
    runnerProcess.unref()

    console.log(
      `Successfully spawned runner process: ${runnerName} (${runnerId}, PID: ${runnerProcess.pid})`
    )
  } catch (error) {
    console.error(`Failed to create runner process for ${runnerId}:`, error)
    throw error
  }
}

const createWindow = (
  runnerId?: string,
  runnerName?: string,
  iconPath?: string
): BrowserWindow => {
  // Determine window title and app name
  const displayName = runnerName || runnerId || "Viberunner"
  const windowTitle = runnerId ? displayName : "Viberunner"

  // Set app name for dock display if this is a runner window
  if (runnerId) {
    app.setName(displayName)
    console.log(`Set app name to: ${displayName}`)
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 1000,
    width: 1600,
    title: windowTitle,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      // sandbox: false,
      // nodeIntegrationInSubFrames: true,
    },
    titleBarStyle: "hiddenInset",
    vibrancy: "under-window",
    backgroundColor: "#1a1a1a",
    show: false, // Don't show immediately
  })

  // Set dock icon if this is a runner window with custom icon
  if (runnerId && iconPath && process.platform === "darwin") {
    setDockIconForRunner(iconPath)
  }

  // Show window once ready to prevent flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
    if (runnerId) {
      mainWindow.focus()
      console.log(`Runner window ready and focused: ${runnerId}`)
    }
  })

  // Enable remote module for this window
  remoteMain.enable(mainWindow.webContents)

  // Build query parameters if runnerId is provided
  const queryParams = runnerId
    ? `?runnerId=${encodeURIComponent(runnerId)}`
    : ""

  // and load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development mode - load from Vite dev server
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL + queryParams)
  } else {
    // Production mode - load from packaged files
    // In packaged mode, the renderer files are in the app.asar
    const isDev = process.env.NODE_ENV === "development"
    const rendererPath = isDev
      ? path.join(
          __dirname,
          `../renderer/${process.env.VITE_DEV_NAME}/index.html`
        )
      : path.join(__dirname, "../dist/index.html")

    if (runnerId) {
      // For file URLs, we need to handle query parameters differently
      mainWindow.loadFile(rendererPath, { query: { runnerId } })
    } else {
      mainWindow.loadFile(rendererPath)
    }
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  return mainWindow
}

// Check if this is a runner process launched with command line args
const getRunnerArgsFromCommandLine = (): {
  runnerId: string | null
  runnerName: string | null
  iconPath: string | null
} => {
  const args = process.argv

  // Get runner ID
  const runnerIdIndex = args.indexOf("--runner-id")
  const runnerId =
    runnerIdIndex !== -1 && runnerIdIndex + 1 < args.length
      ? args[runnerIdIndex + 1]
      : null

  // Get runner name
  const runnerNameIndex = args.indexOf("--runner-name")
  const runnerName =
    runnerNameIndex !== -1 && runnerNameIndex + 1 < args.length
      ? args[runnerNameIndex + 1]
      : null

  // Get icon path
  const iconPathIndex = args.indexOf("--icon-path")
  const iconPath =
    iconPathIndex !== -1 && iconPathIndex + 1 < args.length
      ? args[iconPathIndex + 1]
      : null

  return { runnerId, runnerName, iconPath }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  // Register IPC handlers BEFORE creating the window
  registerIpcHandlers()

  // Create menu bar
  createMenuBar()

  // Check if this is a runner process
  const runnerArgs = getRunnerArgsFromCommandLine()
  console.log(" app.whenReady > runnerArgs:", runnerArgs)
  if (runnerArgs.runnerId) {
    console.log(
      `Starting as runner process for: ${
        runnerArgs.runnerName || runnerArgs.runnerId
      }`
    )
    createWindow(
      runnerArgs.runnerId,
      runnerArgs.runnerName || undefined,
      runnerArgs.iconPath || undefined
    )
  } else {
    console.log(`Starting as main Viberunner process`)
    createWindow()
  }
})

// Quit when all windows are closed, except on macOS.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  const allWindows = BrowserWindow.getAllWindows()
  const visibleWindows = allWindows.filter((window) => window.isVisible())

  if (visibleWindows.length === 0) {
    // Check if there are hidden windows we can show
    if (allWindows.length > 0) {
      // Show the first hidden window
      const hiddenWindow = allWindows[0]
      hiddenWindow.show()
      hiddenWindow.focus()
      console.log("Showed existing hidden window")
    } else {
      // No windows exist - create a new one
      // Check if this process was launched as a runner process
      const runnerArgs = getRunnerArgsFromCommandLine()
      if (runnerArgs.runnerId) {
        // This is a runner process - create the runner window
        console.log(
          `Creating runner window for: ${
            runnerArgs.runnerName || runnerArgs.runnerId
          }`
        )
        createWindow(
          runnerArgs.runnerId,
          runnerArgs.runnerName || undefined,
          runnerArgs.iconPath || undefined
        )
      } else {
        // This is the main process - create a generic window
        createWindow()
      }
    }
  }
})

// Handle file drops
app.on("open-file", (event, filePath) => {
  event.preventDefault()
  const mainWindow = BrowserWindow.getAllWindows()[0]
  if (mainWindow) {
    mainWindow.webContents.send("file-dropped", filePath)
  }
})

// Register all IPC handlers
function registerIpcHandlers() {
  console.log("Registering IPC handlers...")

  // Close window handler for keyboard shortcuts
  ipcMain.handle("close-window", async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) {
        focusedWindow.close()
        return { success: true }
      }
      return { success: false, error: "No focused window found" }
    } catch (error) {
      console.error("Error closing window:", error)
      return { success: false, error: (error as Error).message }
    }
  })

  // Hide window handler for single app mode
  ipcMain.handle("hide-window", async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow()
      if (focusedWindow) {
        focusedWindow.hide()
        return { success: true }
      }
      return { success: false, error: "No focused window found" }
    } catch (error) {
      console.error("Error hiding window:", error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.handle("get-app-version", async () => {
    return {
      success: true,
      version: app.getVersion(),
    }
  })

  // Handle creating new runner process (separate dock icon)
  ipcMain.handle(
    "create-runner-window",
    async (_event, runnerId: string, runnerName: string, iconPath?: string) => {
      try {
        console.log(
          `Creating separate Electron process for runner: ${runnerName} (${runnerId})`
        )

        await createRunnerProcess(runnerId, runnerName, iconPath)

        console.log(
          `Successfully created separate process for runner: ${runnerName} (${runnerId})`
        )

        return { success: true }
      } catch (error) {
        console.error("Error creating runner process:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    }
  )

  // Handle adding runner to menu bar (tray)
  ipcMain.handle(
    "add-runner-to-menubar",
    async (_event, runnerId: string, runnerName: string, iconPath?: string) => {
      try {
        console.log(
          `Adding runner to menu bar: ${runnerName} (${runnerId}) with icon: ${iconPath}`
        )

        await createRunnerTray(runnerId, runnerName, iconPath)

        console.log(`Successfully added runner to menu bar: ${runnerName}`)

        return { success: true }
      } catch (error) {
        console.error("Error adding runner to menu bar:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    }
  )

  // Handle removing runner from menu bar
  ipcMain.handle(
    "remove-runner-from-menubar",
    async (_event, runnerId: string) => {
      try {
        console.log(`Removing runner from menu bar: ${runnerId}`)

        removeRunnerFromTray(runnerId)

        console.log(`Successfully removed runner from menu bar: ${runnerId}`)

        return { success: true }
      } catch (error) {
        console.error("Error removing runner from menu bar:", error)
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      }
    }
  )

  console.log("All IPC handlers registered successfully")
}
