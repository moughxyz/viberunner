import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from "electron"
import { autoUpdater } from "electron-updater"
import { spawn } from "child_process"
import path from "path"

// Enable remote module for renderer access to app.getPath
import "@electron/remote/main"
const remoteMain = require("@electron/remote/main")
remoteMain.initialize()

// Configure autoupdate
autoUpdater.checkForUpdatesAndNotify()

// Handle autoupdate events
autoUpdater.on("checking-for-update", () => {
  console.log("Checking for update...")
})

autoUpdater.on("update-available", (info) => {
  console.log("Update available:", info)
})

autoUpdater.on("update-not-available", (info) => {
  console.log("Update not available:", info)
})

autoUpdater.on("error", (err) => {
  console.log("Error in auto-updater:", err)
})

autoUpdater.on("download-progress", (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond
  log_message = log_message + " - Downloaded " + progressObj.percent + "%"
  log_message =
    log_message + " (" + progressObj.transferred + "/" + progressObj.total + ")"
  console.log(log_message)
})

autoUpdater.on("update-downloaded", (info) => {
  console.log("Update downloaded:", info)
  autoUpdater.quitAndInstall()
})

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit()
}

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

// Create a separate Electron process for a runner (separate dock icon)
const createRunnerProcess = async (runnerId: string): Promise<void> => {
  try {
    // Check if process already exists
    if (runnerProcesses.has(runnerId)) {
      console.log(`Runner process already exists for: ${runnerId}`)
      return
    }

    // Get the current executable path
    const electronPath = process.execPath
    const appPath = app.getAppPath()

    console.log(`Creating separate Electron process for runner: ${runnerId}`)
    console.log(`Electron path: ${electronPath}`)
    console.log(`App path: ${appPath}`)

    // Spawn new Electron process with runner ID as argument
    const runnerProcess = spawn(electronPath, [
      appPath,
      '--runner-id',
      runnerId
    ], {
      detached: true,
      stdio: 'ignore'
    })

    // Store process reference
    runnerProcesses.set(runnerId, runnerProcess)

    // Handle process exit
    runnerProcess.on('exit', (code) => {
      console.log(`Runner process exited: ${runnerId} (code: ${code})`)
      runnerProcesses.delete(runnerId)
    })

    // Detach the process so it runs independently
    runnerProcess.unref()

    console.log(`Successfully spawned runner process: ${runnerId} (PID: ${runnerProcess.pid})`)
  } catch (error) {
    console.error(`Failed to create runner process for ${runnerId}:`, error)
    throw error
  }
}

const createWindow = (runnerId?: string): BrowserWindow => {
  // Determine window title
  const windowTitle = runnerId ? `${runnerId}` : "Viberunner"

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

  // Show window once ready to prevent flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (runnerId) {
      mainWindow.focus()
      console.log(`Runner window ready and focused: ${runnerId}`)
    }
  })

  // Enable remote module for this window
  remoteMain.enable(mainWindow.webContents)

  // Build query parameters if runnerId is provided
  const queryParams = runnerId ? `?runnerId=${encodeURIComponent(runnerId)}` : ""

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
const getRunnerIdFromArgs = (): string | null => {
  const args = process.argv
  const runnerIdIndex = args.indexOf('--runner-id')
  if (runnerIdIndex !== -1 && runnerIdIndex + 1 < args.length) {
    return args[runnerIdIndex + 1]
  }
  return null
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  // Register IPC handlers BEFORE creating the window
  registerIpcHandlers()

  // Create menu bar
  createMenuBar()

  // Check if this is a runner process
  const runnerIdFromArgs = getRunnerIdFromArgs()
  if (runnerIdFromArgs) {
    console.log(`Starting as runner process for: ${runnerIdFromArgs}`)
    createWindow(runnerIdFromArgs)
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
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
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

  // Autoupdate handlers
  ipcMain.handle("check-for-updates", async () => {
    try {
      const updateInfo = await autoUpdater.checkForUpdates()
      return {
        success: true,
        updateInfo,
      }
    } catch (error) {
      console.error("Error checking for updates:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  })

  ipcMain.handle("download-update", async () => {
    try {
      await autoUpdater.downloadUpdate()
      return { success: true }
    } catch (error) {
      console.error("Error downloading update:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  })

  ipcMain.handle("quit-and-install", async () => {
    try {
      autoUpdater.quitAndInstall()
      return { success: true }
    } catch (error) {
      console.error("Error installing update:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  })

  ipcMain.handle("get-app-version", async () => {
    return {
      success: true,
      version: app.getVersion(),
    }
  })

    // Handle creating new runner process (separate dock icon)
  ipcMain.handle("create-runner-window", async (event, runnerId: string) => {
    try {
      console.log(`Creating separate Electron process for runner: ${runnerId}`)

      await createRunnerProcess(runnerId)

      console.log(`Successfully created separate process for runner: ${runnerId}`)

      return { success: true }
    } catch (error) {
      console.error("Error creating runner process:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  })

  console.log("All IPC handlers registered successfully")
}
