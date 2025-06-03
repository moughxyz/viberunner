/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useRef, useCallback } from "react"
import { createRoot } from "react-dom/client"
import UpdateNotification, {
  UpdateNotificationRef,
} from "./components/UpdateNotification"
import BuildPrompt from "./components/BuildPrompt"
import {
  getRunnerPreference,
  getRunnerPreferences,
  updateRunnerPreference,
  removeRunnerPreference,
  setRunnerPreferences,
} from "./preferences"
import { getRunnersDirectory } from "./util"

// Direct Node.js access with full integration
const { ipcRenderer } = require("electron")
const fs = require("fs")
const path = require("path")
const mime = require("mime-types")

// Expose React and ReactDOM globally for runners
;(window as any).React = React
;(window as any).ReactDOM = { createRoot }

// Simplified API - only direct operations, no IPC
const api = {
  exists: (filePath: string) => fs.existsSync(filePath),
  stat: (filePath: string) => fs.statSync(filePath),
  readDir: (dirPath: string) => fs.readdirSync(dirPath),

  // User Preferences API for runners
  getRunnerPreferences: getRunnerPreferences,
  setRunnerPreferences: setRunnerPreferences,
  updateRunnerPreference: updateRunnerPreference,
  removeRunnerPreference: removeRunnerPreference,
  getRunnerPreference: getRunnerPreference,

  // Helper functions
  path: path,
  mime: mime,

  // Exposed modules for advanced usage
  fs: fs,
  require: require,
}

// Make API available globally for runners
;(window as any).api = api

// App cleanup system
const runnerCleanupCallbacks = new Map<string, (() => void)[]>()

// Global cleanup registration function for runners
const registerCleanup = (tabId: string, cleanupFn: () => void) => {
  if (!runnerCleanupCallbacks.has(tabId)) {
    runnerCleanupCallbacks.set(tabId, [])
  }
  runnerCleanupCallbacks.get(tabId)!.push(cleanupFn)
}

// Global cleanup execution function
const executeCleanup = (tabId: string) => {
  const callbacks = runnerCleanupCallbacks.get(tabId)
  if (callbacks) {
    console.log(
      `Executing ${callbacks.length} cleanup callbacks for tab ${tabId}`
    )
    callbacks.forEach((callback) => {
      try {
        callback()
      } catch (error) {
        console.error("Error in runner cleanup callback:", error)
      }
    })
    runnerCleanupCallbacks.delete(tabId)
  }
}

// Make cleanup functions available globally for runners
;(window as any).registerCleanup = registerCleanup

// Helper functions for direct file operations
async function getMimetype(filePath: string): Promise<string> {
  try {
    const stats = fs.statSync(filePath)
    if (stats.isDirectory()) {
      return "inode/directory"
    }
  } catch (error) {
    // File doesn't exist or can't be accessed
  }

  const mimetype = mime.lookup(filePath)
  return mimetype || "application/octet-stream"
}

interface FileAnalysis {
  path: string
  filename: string
  mimetype: string
  content: string
  size: number
  isJson?: boolean
  jsonContent?: any
}

async function analyzeFile(filePath: string): Promise<FileAnalysis> {
  const stats = fs.statSync(filePath)
  const filename = path.basename(filePath)
  const mimetype = await getMimetype(filePath)

  // Simplified analysis - just basic metadata for matching
  return {
    path: filePath,
    filename,
    mimetype,
    content: "", // Don't read content here anymore
    size: stats.size,
    isJson: mimetype === "application/json" || filename.endsWith(".json"),
    jsonContent: null, // Don't parse JSON here anymore
  }
}

async function loadRunners(): Promise<RunnerConfig[]> {
  const RUNNERS_DIR = getRunnersDirectory()
  console.log("loadRunners: Looking for runners in:", RUNNERS_DIR)

  if (!fs.existsSync(RUNNERS_DIR)) {
    console.log("loadRunners: Directory does not exist, creating it")
    fs.mkdirSync(RUNNERS_DIR, { recursive: true })
    return []
  }

  try {
    const dirContents = fs.readdirSync(RUNNERS_DIR)
    console.log("loadRunners: Directory contents:", dirContents)

    const directories = dirContents.filter((dir: string) => {
      const fullPath = path.join(RUNNERS_DIR, dir)
      const isDir = fs.statSync(fullPath).isDirectory()
      console.log(`loadRunners: ${dir} is directory: ${isDir}`)
      return isDir
    })
    console.log("loadRunners: Found directories:", directories)

    const runners = directories
      .map((dir: string) => {
        const runnerPath = path.join(RUNNERS_DIR, dir)
        const packageJsonPath = path.join(runnerPath, "package.json")
        console.log(`loadRunners: Checking for metadata at: ${packageJsonPath}`)

        if (!fs.existsSync(packageJsonPath)) {
          console.log(`loadRunners: No package.json found for ${dir}`)
          return null
        }

        try {
          const metadataContent = fs.readFileSync(packageJsonPath, "utf-8")
          const metadata = JSON.parse(metadataContent).viberunner
          console.log(
            `loadRunners: Successfully loaded metadata for ${dir}:`,
            metadata
          )
          return {
            ...metadata,
            id: dir,
          }
        } catch (parseError) {
          console.error(`Error parsing metadata for ${dir}:`, parseError)
          return null
        }
      })
      .filter(Boolean) as RunnerConfig[]

    console.log("loadRunners: Final runners array:", runners)
    return runners
  } catch (error) {
    console.error("Error in loadRunners function:", error)
    throw error
  }
}

async function loadApp(id: string) {
  const RUNNERS_DIR = getRunnersDirectory()
  const runnerPath = path.join(RUNNERS_DIR, id)
  const bundlePath = path.join(runnerPath, "dist", "bundle.iife.js")

  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Bundle not found: ${bundlePath}`)
  }

  const bundleContent = fs.readFileSync(bundlePath, "utf-8")

  // Also load the metadata
  const metadataPath = path.join(runnerPath, "package.json")
  let config = null
  if (fs.existsSync(metadataPath)) {
    const metadataContent = fs.readFileSync(metadataPath, "utf-8")
    config = JSON.parse(metadataContent).viberunner
  }

  return { bundleContent, config }
}

interface FileInput {
  path: string
  mimetype: string
}

interface RunnerConfig {
  id: string
  name: string
  description: string
  version: string
  mimetypes: string[]
  author: string
  standalone?: boolean // Optional standalone property
  icon?: string // Custom icon path
  userPreferences?: Record<string, any> // User preferences storage
}

interface OpenTab {
  id: string
  runner?: RunnerConfig // Optional for new tab - represents the runner
  fileInput?: FileInput // undefined for standalone runners and new tab
  title: string
  type: "file" | "standalone" | "newtab"
  runnerData?: any // Store the loaded runner data for reloading
  reactRoot?: any // Store the React root for each tab
  domContainer?: HTMLDivElement // Store the DOM container for each tab
}

// Helper function to get supported formats for a runner
const getSupportedFormats = (runner: any): string => {
  if (runner.standalone) {
    return "Standalone utility"
  }

  if (runner.mimetypes && runner.mimetypes.length > 0) {
    return runner.mimetypes.join(", ")
  }

  if (runner.matchers && runner.matchers.length > 0) {
    const formats = new Set<string>()

    runner.matchers.forEach((matcher: any) => {
      if (matcher.type === "mimetype" && matcher.mimetype) {
        formats.add(matcher.mimetype)
      } else if (matcher.type === "filename" && matcher.pattern) {
        formats.add(`*.${matcher.pattern.split(".").pop() || "file"}`)
      } else if (matcher.type === "filename-contains" && matcher.substring) {
        const ext = matcher.extension ? `.${matcher.extension}` : ""
        formats.add(`*${matcher.substring}*${ext}`)
      } else if (matcher.type === "content-json") {
        formats.add("JSON")
      } else if (matcher.type === "file-size") {
        formats.add("Size-based")
      } else {
        formats.add(matcher.type)
      }
    })

    return Array.from(formats).join(", ") || "Enhanced matching"
  }

  return "All files"
}

const App: React.FC = () => {
  const [runners, setRunners] = useState<RunnerConfig[]>([])
  const [isLoadingRunners, setIsLoadingRunners] = useState(false)
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: "default-tab", title: "New Tab", type: "newtab" },
  ])
  const [activeTabId, setActiveTabId] = useState("default-tab")
  const [showAppSelection, setShowAppSelection] = useState(false)
  const [availableRunners, setAvailableRunners] = useState<RunnerConfig[]>([])
  const [pendingFileInput, setPendingFileInput] = useState<FileInput | null>(
    null
  )
  const [runnerIcons, setRunnerIcons] = useState<Record<string, string>>({})
  const [startupRunners, setStartupRunners] = useState<
    Record<string, { enabled: boolean; tabOrder: number }>
  >({})
  const [showSettings, setShowSettings] = useState(false)

  const appRootRef = useRef<HTMLDivElement>(null)
  const hasLaunchedStartupRunners = useRef<boolean>(false)

  // Ref for update notification component
  const updateNotificationRef = useRef<UpdateNotificationRef>(null)

  // Get the currently active tab
  const activeTab = openTabs.find((tab) => tab.id === activeTabId)

  // Tab drag and drop state
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null)

  // Function to load runner icon
  const loadRunnerIcon = useCallback(
    async (runner: RunnerConfig): Promise<string | null> => {
      if (!runner.icon) return null

      // Check if already cached
      if (runnerIcons[runner.id]) {
        return runnerIcons[runner.id]
      }

      try {
        const RUNNERS_DIR = getRunnersDirectory()
        const runnerDir = path.join(RUNNERS_DIR, runner.id)
        const fullIconPath = path.join(runnerDir, runner.icon)

        // Ensure the icon path is within the runner directory
        if (!fullIconPath.startsWith(runnerDir)) {
          throw new Error("Icon path must be within runner directory")
        }

        if (!fs.existsSync(fullIconPath)) {
          throw new Error(`Icon file not found: ${runner.icon}`)
        }

        // Read the icon file as base64
        const iconBuffer = fs.readFileSync(fullIconPath)
        const mimeType = mime.lookup(fullIconPath) || "application/octet-stream"
        const iconData = `data:${mimeType};base64,${iconBuffer.toString(
          "base64"
        )}`

        setRunnerIcons((prev) => ({ ...prev, [runner.id]: iconData }))
        return iconData
      } catch (error) {
        console.error(`Failed to load icon for ${runner.name}:`, error)
      }

      return null
    },
    [runnerIcons]
  )

  // Load startup runner preferences
  const loadStartupRunners = async () => {
    try {
      const { app } = require("@electron/remote")
      const prefsPath = path.join(app.getPath("userData"), "preferences.json")

      if (fs.existsSync(prefsPath)) {
        const prefsContent = fs.readFileSync(prefsPath, "utf8")
        const prefs = JSON.parse(prefsContent)
        setStartupRunners(prefs.startupRunners || {})
      }
    } catch (error) {
      console.error("Error loading startup runners:", error)
    }
  }

  // Save startup runner preferences
  const saveStartupRunners = (
    newStartupRunners: Record<string, { enabled: boolean; tabOrder: number }>
  ) => {
    try {
      const { app } = require("@electron/remote")
      const prefsPath = path.join(app.getPath("userData"), "preferences.json")

      // Load existing preferences
      let prefs = {}
      if (fs.existsSync(prefsPath)) {
        const prefsContent = fs.readFileSync(prefsPath, "utf8")
        prefs = JSON.parse(prefsContent)
      }

      // Update startup runners
      // eslint-disable-next-line no-extra-semi
      ;(prefs as any).startupRunners = newStartupRunners

      // Save back to file
      fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), "utf8")

      setStartupRunners(newStartupRunners)
    } catch (error) {
      console.error("Error saving startup runners:", error)
    }
  }

  // Toggle startup runner enabled state
  const toggleStartupApp = async (runnerId: string, enabled: boolean) => {
    try {
      const newStartupRunners = { ...startupRunners }

      if (enabled) {
        // If enabling, set a default tab order if not already set
        const currentConfig = startupRunners[runnerId] || {
          enabled: false,
          tabOrder: 1,
        }
        if (!currentConfig.tabOrder) {
          const maxTabOrder = Math.max(
            0,
            ...Object.values(startupRunners).map((runner) => runner.tabOrder)
          )
          currentConfig.tabOrder = maxTabOrder + 1
        }
        newStartupRunners[runnerId] = { ...currentConfig, enabled: true }
      } else {
        delete newStartupRunners[runnerId]
      }

      saveStartupRunners(newStartupRunners)
    } catch (error) {
      console.error("Error toggling startup runner:", error)
    }
  }

  // Update tab order for startup runner
  const updateStartupAppTabOrder = async (
    runnerId: string,
    tabOrder: number
  ) => {
    try {
      const currentConfig = startupRunners[runnerId]
      if (!currentConfig || !currentConfig.enabled) return

      const newStartupRunners = {
        ...startupRunners,
        [runnerId]: { ...currentConfig, tabOrder },
      }

      saveStartupRunners(newStartupRunners)
    } catch (error) {
      console.error("Error updating startup runner tab order:", error)
    }
  }

  // Load icons for all runners when runners change
  useEffect(() => {
    runners.forEach((runner) => {
      if (runner.icon && !runnerIcons[runner.id]) {
        loadRunnerIcon(runner)
      }
    })
  }, [runnerIcons, loadRunnerIcon, runners])

  // Load startup runners when component mounts and when runners change
  useEffect(() => {
    loadStartupRunners()
  }, [runners])

  // Keyboard shortcuts for tab/window management
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+T (macOS) or Ctrl+T (Windows/Linux) - Create new tab
      if ((event.metaKey || event.ctrlKey) && event.key === "t") {
        event.preventDefault()
        createNewTab()
        return
      }

      // Check for Cmd+W (macOS) or Ctrl+W (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === "w") {
        event.preventDefault()

        // If multiple tabs or active tab is not a new tab, close the active tab
        if (openTabs.length > 1 || (activeTab && activeTab.type !== "newtab")) {
          if (activeTabId) {
            closeTab(activeTabId)
          }
        } else {
          // Only a new tab remains or no tabs, close the window
          try {
            ipcRenderer.invoke("close-window")
          } catch (error) {
            console.error("Failed to close window:", error)
            // Fallback: try to close via window object
            window.close()
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [openTabs, activeTabId, activeTab])

  // Auto-launch startup runners when runners are loaded
  useEffect(() => {
    console.log("Auto-launch useEffect triggered:", {
      runnersLength: runners.length,
      startupRunnersCount: Object.keys(startupRunners).length,
      hasLaunched: hasLaunchedStartupRunners.current,
      startupRunners,
    })

    if (
      runners.length > 0 &&
      Object.keys(startupRunners).length > 0 &&
      !hasLaunchedStartupRunners.current
    ) {
      const enabledStartupRunners = Object.entries(startupRunners)
        .filter(([_, config]) => config.enabled)
        .sort(([, a], [, b]) => a.tabOrder - b.tabOrder)

      console.log("Enabled startup runners:", enabledStartupRunners)

      if (enabledStartupRunners.length > 0) {
        console.log(
          `Auto-launching ${enabledStartupRunners.length} startup runners in parallel...`
        )

        // Store the current New Tab ID to maintain focus
        const currentNewTabId = openTabs.find(
          (tab) => tab.type === "newtab"
        )?.id

        // Launch all runners in parallel without delays
        const launchPromises = enabledStartupRunners.map(
          async ([runnerId, config]) => {
            try {
              const runner = runners.find((f) => f.id === runnerId)
              console.log(
                `Launching startup runner: ${runnerId} (tab order: ${config.tabOrder})`
              )

              if (runner && runner.standalone) {
                // Launch the runner but don't wait for tab switching
                await openAppInNewTab(runner, undefined, true, false)
                console.log(`Successfully launched startup runner: ${runnerId}`)
              } else {
                console.warn(`Could not launch ${runnerId}:`, {
                  appFound: !!runner,
                  isStandalone: runner?.standalone,
                })
              }
            } catch (error) {
              console.error(
                `Error launching startup runner ${runnerId}:`,
                error
              )
            }
          }
        )

        // Launch all runners in parallel and then return focus to New Tab
        Promise.all(launchPromises)
          .then(() => {
            console.log(
              "All startup runners launched, maintaining focus on New Tab"
            )

            // Ensure we stay on the New Tab after all runners are launched
            if (currentNewTabId) {
              switchToTab(currentNewTabId)
            }
          })
          .catch((error) => {
            console.error("Error during parallel startup runner launch:", error)
          })
      }
      hasLaunchedStartupRunners.current = true
    }
  }, [runners, startupRunners])

  // Function to get icon for display (returns Viberunner logo fallback if no custom icon)
  const getAppIcon = (runner: RunnerConfig): string => {
    if (runnerIcons[runner.id]) {
      return runnerIcons[runner.id]
    }

    // Return Viberunner SVG logo as fallback
    return getViberunnerLogoPath()
  }

  // Function to get Viberunner logo as data URL
  const getViberunnerLogoPath = (): string => {
    try {
      // Load SVG file and convert to data URL
      const svgPath = path.resolve(__dirname, "../assets/viberunner-logo.svg")
      if (fs.existsSync(svgPath)) {
        const svgContent = fs.readFileSync(svgPath, "utf8")
        return `data:image/svg+xml;base64,${btoa(svgContent)}`
      } else {
        // Try alternative path
        const altPath = path.resolve(
          process.cwd(),
          "src/assets/viberunner-logo.svg"
        )
        if (fs.existsSync(altPath)) {
          const svgContent = fs.readFileSync(altPath, "utf8")
          return `data:image/svg+xml;base64,${btoa(svgContent)}`
        }
        throw new Error("SVG file not found")
      }
    } catch (error) {
      console.warn("Failed to load Viberunner logo SVG, using fallback:", error)
      // Fallback to inline SVG if file loading fails
      const svg = `<svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 50 H25 L35 20 L50 80 L65 20 L75 50 H95" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
      return `data:image/svg+xml;base64,${btoa(svg)}`
    }
  }

  // Imperative tab management - outside React state
  const tabContainersRef = useRef<
    Map<
      string,
      {
        domElement: HTMLDivElement
        reactRoot: any
        styleElement?: HTMLStyleElement
      }
    >
  >(new Map())

  // Load and initialize runners on component mount
  useEffect(() => {
    const loadDirectoryInfo = async () => {
      try {
        setIsLoadingRunners(true)
        const loadedRunners = await loadRunners()
        setRunners(loadedRunners)
        console.log("Successfully loaded runners:", loadedRunners.length)
      } catch (error) {
        console.error("Failed to load runners:", error)
        setRunners([])
      } finally {
        setIsLoadingRunners(false)
      }
    }

    loadDirectoryInfo()
  }, [])

  const generateTabId = () =>
    `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Imperative function to create a runner container
  const createAppContainer = async (tab: OpenTab): Promise<boolean> => {
    if (!appRootRef.current || !tab.runner || !tab.runnerData) {
      console.error("Cannot create runner container:", {
        hasAppRoot: !!appRootRef.current,
        hasApp: !!tab.runner,
        hasAppData: !!tab.runnerData,
      })
      return false
    }

    console.log("Creating app container for tab:", tab.id)

    // Create DOM container
    const container = document.createElement("div")
    container.className = "tab-app-container"
    container.style.position = "absolute"
    container.style.top = "0"
    container.style.left = "0"
    container.style.right = "0"
    container.style.bottom = "0"
    container.style.width = "100%"
    container.style.height = "100%"
    container.style.display = "none" // Start hidden
    container.style.visibility = "hidden"
    container.style.zIndex = "-1"
    container.style.opacity = "0"
    container.style.background = "var(--background)"
    appRootRef.current.appendChild(container)

    // Prepare props with cleanup support
    let props
    if (!tab.fileInput) {
      props = {
        container,
        tabId: tab.id,
        runnerId: tab.runner.id,
      }
    } else {
      props = {
        fileInput: tab.fileInput,
        container,
        tabId: tab.id,
        runnerId: tab.runner.id,
      }
    }

    return new Promise<boolean>((resolve) => {
      // Create script and load runner
      const script = document.createElement("script")
      script.type = "text/javascript"

      let processedBundleContent = tab.runnerData.bundleContent

      // CSS scoping patterns for auto-scoping
      const cssPatterns = [
        /(['"`])([^'"`]*\.css[^'"`]*)\1/g,
        /(['"`])([^'"`]*{[^}]*}[^'"`]*)\1/g,
      ]

      cssPatterns.forEach((pattern) => {
        processedBundleContent = processedBundleContent.replace(
          pattern,
          (match: string, quote: string, cssContent: string) => {
            if (!cssContent) return match

            // Don't process if already scoped to .tab-app-container
            if (
              cssContent.includes(".tab-app-container") ||
              cssContent.includes(`[data-app-id="${tab.id}"]`)
            ) {
              return match
            }

            // Auto-scope CSS selectors
            const scopedCSS = cssContent
              // Scope universal selector
              .replace(/^\s*\*\s*\{/gm, `[data-app-id="${tab.id}"] * {`)
              // Scope element selectors
              .replace(
                /^(\s*)([a-zA-Z][a-zA-Z0-9]*)\s*\{/gm,
                `$1[data-app-id="${tab.id}"] $2 {`
              )
              // Scope class selectors
              .replace(
                /^(\s*)(\.[\w-]+)\s*\{/gm,
                `$1[data-app-id="${tab.id}"] $2 {`
              )
              // Scope ID selectors
              .replace(
                /^(\s*)(#[\w-]+)\s*\{/gm,
                `$1[data-app-id="${tab.id}"] $2 {`
              )
              // Scope descendant selectors
              .replace(
                /^(\s*)([.#]?[\w-]+(?:\s+[.#]?[\w-]+)*)\s*\{/gm,
                `$1[data-app-id="${tab.id}"] $2 {`
              )
              // Handle @media queries by scoping the content inside
              .replace(
                /@media[^{]+\{([^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g,
                (mediaMatch: string, mediaContent: string) => {
                  const scopedMediaContent = mediaContent
                    .replace(/^\s*\*\s*\{/gm, `[data-app-id="${tab.id}"] * {`)
                    .replace(
                      /^(\s*)([a-zA-Z][a-zA-Z0-9]*)\s*\{/gm,
                      `$1[data-app-id="${tab.id}"] $2 {`
                    )
                    .replace(
                      /^(\s*)(\.[\w-]+)\s*\{/gm,
                      `$1[data-app-id="${tab.id}"] $2 {`
                    )
                    .replace(
                      /^(\s*)(#[\w-]+)\s*\{/gm,
                      `$1[data-app-id="${tab.id}"] $2 {`
                    )
                  return mediaMatch.replace(mediaContent, scopedMediaContent)
                }
              )

            return quote ? `${quote}${scopedCSS}${quote}` : scopedCSS
          }
        )
      })

      // Also intercept any dynamic style injection
      const runnerStyleInterceptor = `
        // Intercept style injection for app isolation
        (function() {
          const originalCreateElement = document.createElement;
          const runnerId = "${tab.id}";

          document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);

            if (tagName.toLowerCase() === 'style') {
              // Mark style elements created by this app
              element.setAttribute('data-app-style', runnerId);

              // Override textContent to auto-scope CSS - with safety checks
              try {
                const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'textContent') ||
                                 Object.getOwnPropertyDescriptor(Node.prototype, 'textContent') ||
                                 Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'textContent');

                if (descriptor && descriptor.set) {
                  const originalTextContentSetter = descriptor.set;
                  Object.defineProperty(element, 'textContent', {
                    set: function(value) {
                      if (value && typeof value === 'string') {
                        // Auto-scope the CSS
                        const scopedCSS = value
                          .replace(/^\\s*\\*\\s*\\{/gm, \`[data-app-id="\${runnerId}"] * {\`)
                          .replace(/^(\\s*)([a-zA-Z][a-zA-Z0-9]*)\\s*\\{/gm, \`$1[data-app-id="\${runnerId}"] $2 {\`)
                          .replace(/^(\\s*)(\\.[\\w-]+)\\s*\\{/gm, \`$1[data-app-id="\${runnerId}"] $2 {\`)
                          .replace(/^(\\s*)(#[\\w-]+)\\s*\\{/gm, \`$1[data-app-id="\${runnerId}"] $2 {\`);
                        originalTextContentSetter.call(this, scopedCSS);
                      } else {
                        originalTextContentSetter.call(this, value);
                      }
                    },
                    get: descriptor.get,
                    enumerable: descriptor.enumerable,
                    configurable: descriptor.configurable
                  });
                }
              } catch (err) {
                console.warn('Failed to intercept textContent for app CSS scoping:', err);
              }
            }

            return element;
          };
        })();
      `

      script.textContent =
        runnerStyleInterceptor + "\n" + processedBundleContent

      const runnerLoader = (RunnerComponent: any) => {
        try {
          // Create an isolation wrapper div
          const isolationWrapper = document.createElement("div")
          isolationWrapper.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            position: relative !important;
            overflow: auto !important;
            display: block !important;
            contain: layout style size !important;
            isolation: isolate !important;
            z-index: 1 !important;
          `

          container.appendChild(isolationWrapper)

          // Render directly into the isolation wrapper
          isolationWrapper.setAttribute("data-app-id", tab.id)

          const root = createRoot(isolationWrapper)
          root.render(React.createElement(RunnerComponent, props))

          // Store container reference in tabContainersRef for tab switching
          tabContainersRef.current.set(tab.id, {
            domElement: container,
            reactRoot: root,
            styleElement: undefined,
          })

          // Show the container with proper stacking
          container.style.display = "block"
          container.style.visibility = "visible"
          container.style.zIndex = "10"
          container.style.opacity = "1"

          resolve(true)
        } catch (error) {
          console.error("Error rendering app:", error)
          resolve(false)
        }
      }

      // Make the app loader available globally with backward compatibility
      ;(window as any).__RENDER_RUNNER__ = runnerLoader

      script.onload = () => {
        // Clean up after script loads
        setTimeout(() => {
          if (script.parentNode) {
            script.parentNode.removeChild(script)
          }
          delete (window as any).__RENDER_RUNNER__
        }, 1000)
      }

      script.onerror = (error) => {
        console.error("Script loading error:", error)
        resolve(false)
      }

      document.head.appendChild(script)
    })
  }

  // Imperative function to switch tab visibility
  const switchToTab = (tabId: string, tabData?: OpenTab) => {
    // Use provided tab data or look up from state
    const activeTab = tabData || openTabs.find((tab) => tab.id === tabId)

    console.log("Switching to tab:", tabId, "type:", activeTab?.type)

    // Hide all app containers with enhanced visibility control
    tabContainersRef.current.forEach((container, id) => {
      console.log("Hiding container for tab:", id)
      const element = container.domElement
      element.style.display = "none"
      element.style.visibility = "hidden"
      element.style.zIndex = "-1"
      element.style.opacity = "0"
    })

    // Show the active tab's container if it's not a new tab
    if (activeTab && activeTab.type !== "newtab") {
      const container = tabContainersRef.current.get(tabId)
      if (container) {
        console.log("Showing container for tab:", tabId)
        const element = container.domElement
        element.style.display = "block"
        element.style.visibility = "visible"
        element.style.zIndex = "10"
        element.style.opacity = "1"
      } else {
        console.warn("No container found for tab:", tabId)
      }
    }

    setActiveTabId(tabId)
  }

  const openAppInNewTab = async (
    runner: RunnerConfig,
    fileInput?: FileInput,
    forceNewTab: boolean = false,
    switchToTab_: boolean = true
  ) => {
    const title = fileInput
      ? fileInput.path.split("/").pop() || "Unknown File"
      : runner.name

    let appData

    // Load app data
    try {
      appData = await loadApp(runner.id)
    } catch (error) {
      console.error("Failed to load app data:", error)
      alert(`Failed to load ${runner.name}: ${error}`)
      return
    }

    // Check if we have an active new tab to transform (but not if forceNewTab is true)
    const currentTab = openTabs.find((tab) => tab.id === activeTabId)

    if (!forceNewTab && currentTab && currentTab.type === "newtab") {
      // Transform the current new tab
      const transformedTab: OpenTab = {
        ...currentTab,
        runner: runner,
        fileInput,
        title,
        type: fileInput ? "file" : "standalone",
        runnerData: appData,
      }

      setOpenTabs((prev) =>
        prev.map((tab) => (tab.id === activeTabId ? transformedTab : tab))
      )

      // Create the app container and wait for it to be ready
      const success = await createAppContainer(transformedTab)

      if (success) {
        // Only switch to this tab if switchToTab_ is true
        if (switchToTab_) {
          switchToTab(transformedTab.id, transformedTab)
        }

        // Reorder tabs to keep "New Tab" at the end
        setTimeout(() => {
          setOpenTabs((prev) => {
            const newTabTabs = prev.filter((tab) => tab.type === "newtab")
            const otherTabs = prev.filter((tab) => tab.type !== "newtab")
            return [...otherTabs, ...newTabTabs]
          })
        }, 50) // Small delay to ensure tab is properly added first
      } else {
        console.error("Failed to create app container for transformed tab")
        alert(`Failed to load ${runner.name}`)
      }
    } else {
      // Create a new tab
      const tabId = generateTabId()
      const newTab: OpenTab = {
        id: tabId,
        runner: runner,
        fileInput,
        title,
        type: fileInput ? "file" : "standalone",
        runnerData: appData,
      }

      setOpenTabs((prev) => [...prev, newTab])

      // Create the app container and wait for it to be ready
      const success = await createAppContainer(newTab)

      if (success) {
        // Only switch to this tab if switchToTab_ is true
        if (switchToTab_) {
          switchToTab(tabId, newTab)
        }

        // Reorder tabs to keep "New Tab" at the end
        setTimeout(() => {
          setOpenTabs((prev) => {
            const newTabTabs = prev.filter((tab) => tab.type === "newtab")
            const otherTabs = prev.filter((tab) => tab.type !== "newtab")
            return [...otherTabs, ...newTabTabs]
          })
        }, 50) // Small delay to ensure tab is properly added first
      } else {
        console.error("Failed to create app container for new tab")
        alert(`Failed to load ${runner.name}`)
      }
    }

    setShowAppSelection(false)
    setPendingFileInput(null)
  }

  const closeTab = (tabId: string) => {
    console.log("Closing tab:", tabId)

    // Execute cleanup callbacks for this tab
    executeCleanup(tabId)

    // Cleanup the tab's container
    const container = tabContainersRef.current.get(tabId)
    if (container) {
      console.log("Cleaning up container for tab:", tabId)
      try {
        container.reactRoot.unmount()

        // Remove the app-specific style element
        if (
          container.styleElement &&
          document.head.contains(container.styleElement)
        ) {
          document.head.removeChild(container.styleElement)
        }

        if (
          appRootRef.current &&
          appRootRef.current.contains(container.domElement)
        ) {
          appRootRef.current.removeChild(container.domElement)
        }
      } catch (error) {
        console.warn("Error cleaning up tab container:", error)
      }
      tabContainersRef.current.delete(tabId)
    }

    setOpenTabs((prev) => {
      const filtered = prev.filter((tab) => tab.id !== tabId)

      // If we closed the active tab, activate another one
      if (activeTabId === tabId) {
        const currentIndex = prev.findIndex((tab) => tab.id === tabId)
        if (filtered.length > 0) {
          const newActiveIndex = Math.min(currentIndex, filtered.length - 1)
          const newActiveTab = filtered[newActiveIndex]
          switchToTab(newActiveTab.id)
        } else {
          // If no tabs left, create a new tab
          const newTab: OpenTab = {
            id: generateTabId(),
            title: "New Tab",
            type: "newtab",
          }
          setOpenTabs([newTab])
          switchToTab(newTab.id)
          return [newTab]
        }
      }

      return filtered
    })
  }

  // Handle tab switching
  const handleTabSwitch = (tabId: string) => {
    // Reset app selection state when switching tabs
    setShowAppSelection(false)
    setPendingFileInput(null)
    switchToTab(tabId)
  }

  // Tab drag and drop handlers
  const handleTabDragStart = (e: React.DragEvent, tabId: string) => {
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", tabId)
    setDraggedTabId(tabId)
  }

  const handleTabDragEnd = () => {
    setDraggedTabId(null)
    setDragOverTabId(null)
  }

  const handleTabDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"

    if (draggedTabId && draggedTabId !== tabId) {
      setDragOverTabId(tabId)
    }
  }

  const handleTabDragLeave = (e: React.DragEvent, _tabId: string) => {
    // Only clear if we're actually leaving this tab (not entering a child element)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTabId(null)
    }
  }

  const handleTabDrop = (e: React.DragEvent, dropTargetTabId: string) => {
    e.preventDefault()

    const draggedId = e.dataTransfer.getData("text/plain")
    if (!draggedId || draggedId === dropTargetTabId) {
      return
    }

    // Reorder tabs
    setOpenTabs((prev) => {
      const newTabs = [...prev]
      const draggedIndex = newTabs.findIndex((tab) => tab.id === draggedId)
      const targetIndex = newTabs.findIndex((tab) => tab.id === dropTargetTabId)

      if (draggedIndex === -1 || targetIndex === -1) {
        return prev
      }

      // Remove dragged tab and insert at target position
      const [draggedTab] = newTabs.splice(draggedIndex, 1)
      newTabs.splice(targetIndex, 0, draggedTab)

      return newTabs
    })

    setDraggedTabId(null)
    setDragOverTabId(null)
  }

  const selectApp = async (runner: RunnerConfig) => {
    if (pendingFileInput) {
      await openAppInNewTab(runner, pendingFileInput)
    }
  }

  const launchStandaloneApp = async (runner: RunnerConfig) => {
    try {
      console.log("Launching standalone app:", runner.name, runner.id)
      await openAppInNewTab(runner)
    } catch (error) {
      console.error("Failed to launch standalone app:", error)
      alert(`Failed to launch ${runner.name}: ${error}`)
    }
  }

  // Enhanced file matching functions
  function evaluateMatcher(matcher: any, fileAnalysis: FileAnalysis): boolean {
    switch (matcher.type) {
      case "mimetype":
        return matcher.mimetype === fileAnalysis.mimetype

      case "filename":
        if (matcher.pattern) {
          // Support exact match or glob pattern
          if (matcher.pattern.includes("*") || matcher.pattern.includes("?")) {
            // Simple glob pattern matching
            const regexPattern = matcher.pattern
              .replace(/\*/g, ".*")
              .replace(/\?/g, ".")
            return new RegExp(`^${regexPattern}$`).test(fileAnalysis.filename)
          } else {
            // Exact match
            return matcher.pattern === fileAnalysis.filename
          }
        }
        return false

      case "filename-contains":
        if (matcher.substring) {
          // Case-insensitive substring matching
          const hasSubstring = fileAnalysis.filename
            .toLowerCase()
            .includes(matcher.substring.toLowerCase())

          // If extension is specified, also check that
          if (matcher.extension) {
            const fileExtension = path
              .extname(fileAnalysis.filename)
              .toLowerCase()
            const targetExtension = matcher.extension.startsWith(".")
              ? matcher.extension.toLowerCase()
              : `.${matcher.extension.toLowerCase()}`
            return hasSubstring && fileExtension === targetExtension
          }

          return hasSubstring
        }
        return false

      case "content-json":
        if (!fileAnalysis.isJson || !fileAnalysis.jsonContent) return false
        if (matcher.requiredProperties) {
          return matcher.requiredProperties.every(
            (prop: string) =>
              fileAnalysis.jsonContent &&
              fileAnalysis.jsonContent[prop] !== undefined
          )
        }
        return true

      case "file-size": {
        const size = fileAnalysis.size
        if (matcher.minSize !== undefined && size < matcher.minSize)
          return false
        if (matcher.maxSize !== undefined && size > matcher.maxSize)
          return false
        return true
      }

      default:
        return false
    }
  }

  async function findMatchingRunners(
    filePath: string
  ): Promise<Array<{ runner: RunnerConfig; priority: number }>> {
    const runners = await loadRunners()
    const fileAnalysis = await analyzeFile(filePath)
    const matches: Array<{ runner: RunnerConfig; priority: number }> = []

    for (const runner of runners) {
      let bestPriority = -1

      // Check enhanced matchers first
      if ((runner as any).matchers) {
        for (const matcher of (runner as any).matchers) {
          if (evaluateMatcher(matcher, fileAnalysis)) {
            bestPriority = Math.max(bestPriority, matcher.priority)
          }
        }
      }

      // Fallback to legacy mimetype matching
      if (bestPriority === -1 && runner.mimetypes) {
        if (runner.mimetypes.includes(fileAnalysis.mimetype)) {
          bestPriority = 50 // Default priority for legacy matchers
        }
      }

      if (bestPriority > -1) {
        matches.push({ runner: runner, priority: bestPriority })
      }
    }

    // Sort by priority (highest first)
    return matches.sort((a, b) => b.priority - a.priority)
  }

  useEffect(() => {
    // Handle file drops
    const handleFileDrop = async (filePath: string) => {
      try {
        console.log("=== FILE DROP STARTED ===")
        console.log("handleFileDrop: Processing file:", filePath)

        // Simplified file analysis for matching only
        const fileAnalysis = await analyzeFile(filePath)
        console.log("handleFileDrop: File analysis:", fileAnalysis)

        // Create simplified file input - just path and mimetype
        const fileInput: FileInput = {
          path: filePath,
          mimetype: fileAnalysis.mimetype,
        }
        console.log("handleFileDrop: File input prepared:", fileInput)

        // Find matching runners directly
        const matches = await findMatchingRunners(filePath)
        console.log("handleFileDrop: Found matches:", matches)

        if (matches.length === 0) {
          console.log("handleFileDrop: No matches found")
          alert(
            `No app found for this file.\n\nFile: ${
              fileAnalysis.filename
            }\nType: ${fileAnalysis.mimetype}\nSize: ${(
              fileAnalysis.size / 1024
            ).toFixed(1)} KB`
          )
        } else if (matches.length === 1) {
          console.log(
            "handleFileDrop: Single match found, auto-selecting:",
            matches[0].runner.name
          )
          await openAppInNewTab(matches[0].runner, fileInput)
          console.log("handleFileDrop: Opened in new tab")
        } else {
          console.log(
            "handleFileDrop: Multiple matches found, showing selection"
          )
          setPendingFileInput(fileInput)
          setAvailableRunners(
            matches.map((m: any) => ({
              ...m.app,
              matchPriority: m.priority,
            }))
          )
          setShowAppSelection(true)
          console.log("handleFileDrop: State set for multiple matches")
        }
        console.log("=== FILE DROP COMPLETED ===")
      } catch (error) {
        console.error("Error handling file drop:", error)
        alert(`Error handling file: ${error}`)
      }
    }

    // Listen for file drops
    const onDrop = (event: DragEvent) => {
      event.preventDefault()
      const filePath = event.dataTransfer?.files[0]?.path
      if (filePath) {
        handleFileDrop(filePath)
      }
    }

    const onDragOver = (event: DragEvent) => {
      event.preventDefault()
    }

    window.addEventListener("drop", onDrop)
    window.addEventListener("dragover", onDragOver)

    return () => {
      window.removeEventListener("drop", onDrop)
      window.removeEventListener("dragover", onDragOver)
    }
  }, [runners])

  const createNewTab = () => {
    const tabId = generateTabId()
    const newTab: OpenTab = {
      id: tabId,
      title: "New Tab",
      type: "newtab",
    }

    setOpenTabs((prev) => [...prev, newTab])
    switchToTab(tabId)
    setShowAppSelection(false)
    setPendingFileInput(null)
  }

  // Handler for build prompt submission
  const handleBuildPromptSubmit = (prompt: string) => {
    // TODO: Implement build prompt handling logic
    console.log("App received build prompt:", prompt)
  }

  return (
    <div className="vr-app">
      <header id="vr-header">
        <div className="vr-header-content">
          {/* Tabs first, right after macOS traffic lights */}
          <div className="vr-header-tabs">
            <div className="vr-tabs-list">
              {openTabs.map((tab) => (
                <div
                  key={tab.id}
                  className={`vr-tab ${
                    tab.id === activeTabId ? "vr-tab-active" : ""
                  } ${draggedTabId === tab.id ? "vr-tab-dragging" : ""} ${
                    dragOverTabId === tab.id ? "vr-tab-drop-target" : ""
                  }`}
                  onClick={() => handleTabSwitch(tab.id)}
                  draggable={true}
                  onDragStart={(e) => handleTabDragStart(e, tab.id)}
                  onDragEnd={handleTabDragEnd}
                  onDragOver={(e) => handleTabDragOver(e, tab.id)}
                  onDragLeave={(e) => handleTabDragLeave(e, tab.id)}
                  onDrop={(e) => handleTabDrop(e, tab.id)}
                >
                  <div className="vr-tab-icon">
                    {tab.type === "newtab" ? (
                      <img
                        src={getViberunnerLogoPath()}
                        alt="New Tab"
                        style={{
                          width: "16px",
                          height: "16px",
                          objectFit: "contain",
                        }}
                      />
                    ) : tab.runner ? (
                      <img
                        src={getAppIcon(tab.runner)}
                        alt={tab.runner.name}
                        style={{
                          width: "16px",
                          height: "16px",
                          objectFit: "contain",
                        }}
                      />
                    ) : (
                      <img
                        src={getViberunnerLogoPath()}
                        alt="Default"
                        style={{
                          width: "16px",
                          height: "16px",
                          objectFit: "contain",
                        }}
                      />
                    )}
                  </div>
                  <div className="vr-tab-content">
                    <span className="vr-tab-title">{tab.title}</span>
                    {tab.runner && (
                      <span className="vr-tab-subtitle">{tab.runner.name}</span>
                    )}
                  </div>
                  {tab.type !== "newtab" || openTabs.length > 1 ? (
                    <button
                      className="vr-tab-close"
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTab(tab.id)
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                      }}
                      onDragStart={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                      }}
                      title="Close tab"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              ))}

              {/* New Tab Button */}
              <button
                className="vr-new-tab-btn"
                onClick={createNewTab}
                title="New tab"
              >
                +
              </button>
            </div>
          </div>

          {/* Viberunner logo on the right */}
          <h1 className="vr-app-title">
            <div className="vr-app-icon">
              <img
                src={getViberunnerLogoPath()}
                alt="Viberunner Logo"
                style={{ width: "24px", height: "24px", objectFit: "contain" }}
              />
            </div>
            Viberunner
          </h1>
        </div>
      </header>

      <div id="vr-main-layout">
        <main className="vr-content-area">
          {showAppSelection && activeTab?.type === "newtab" ? (
            <div className="vr-app-selection">
              <div className="selection-header">
                <h2 className="selection-title">Choose an app</h2>
                <p className="selection-subtitle">
                  Multiple runners can handle this file type. Choose one to
                  continue:
                </p>
                <div className="file-meta">
                  <span className="filename">
                    {path.basename(pendingFileInput?.path || "")}
                  </span>
                  <span className="file-type">
                    {pendingFileInput?.mimetype}
                  </span>
                </div>
              </div>

              <div className="app-grid">
                {availableRunners.map((runner) => (
                  <div
                    key={runner.id}
                    className="app-card"
                    onClick={() => selectApp(runner)}
                  >
                    <div className="card-header">
                      <div className="card-icon">
                        <img
                          src={getAppIcon(runner)}
                          alt={runner.name}
                          style={{
                            width: "32px",
                            height: "32px",
                            objectFit: "contain",
                          }}
                        />
                      </div>
                      <div className="card-title-section">
                        <h3 className="card-title">{runner.name}</h3>
                        <div className="card-badge">
                          <div className="badge-dot"></div>
                          Ready
                        </div>
                      </div>
                    </div>
                    <p className="card-description">{runner.description}</p>
                    <div className="card-footer">
                      <div className="supported-formats">
                        {getSupportedFormats(runner)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="selection-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAppSelection(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div className="app-viewport-container">
            {/* Always render app viewport for tab containers */}
            <div ref={appRootRef} className="app-viewport" />

            {/* Unified new tab interface when active tab is new tab */}
            {activeTab?.type === "newtab" && !showAppSelection && (
              <div className="vr-new-tab-unified">
                <div className="unified-content">
                  {/* Build Prompt Component */}
                  <BuildPrompt onSubmit={handleBuildPromptSubmit} />

                  {/* Existing runners section - show only if runners are available */}
                  {runners.length > 0 && (
                    <>
                      {/* Drop zone section */}
                      <div className="drop-zone-section">
                        <div className="section-card">
                          <div className="drop-zone-content">
                            <div className="drop-zone-header">
                              <div className="drop-zone-icon">⬇</div>
                              <h3 className="drop-zone-title">
                                Drop files here
                              </h3>
                            </div>
                            <p className="drop-zone-description">
                              Drag and drop files to automatically find
                              compatible runners
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Utility runners section */}
                      {runners.filter((a) => a.standalone).length > 0 && (
                        <div className="utility-section">
                          <div className="section-card">
                            <div className="section-header">
                              <h4 className="section-title">Utility Runners</h4>
                              <span className="section-count">
                                {runners.filter((a) => a.standalone).length}
                              </span>
                            </div>
                            <div className="utility-cards">
                              {runners
                                .filter((a) => a.standalone)
                                .map((runner) => {
                                  const startupConfig =
                                    startupRunners[runner.id]
                                  const isStartupEnabled =
                                    startupConfig?.enabled || false
                                  const tabOrder = startupConfig?.tabOrder || 1

                                  return (
                                    <div
                                      key={runner.id}
                                      className="utility-card-container"
                                    >
                                      <div
                                        className="utility-card"
                                        onClick={() =>
                                          launchStandaloneApp(runner)
                                        }
                                      >
                                        <div className="utility-icon">
                                          <img
                                            src={getAppIcon(runner)}
                                            alt={runner.name}
                                            style={{
                                              width: "24px",
                                              height: "24px",
                                              objectFit: "contain",
                                            }}
                                          />
                                        </div>
                                        <div className="utility-content">
                                          <h5 className="utility-title">
                                            {runner.name}
                                          </h5>
                                          <p className="utility-description">
                                            {runner.description}
                                          </p>
                                        </div>
                                        <div className="utility-action">
                                          Launch
                                        </div>
                                      </div>

                                      {/* Startup controls */}
                                      <div
                                        className="startup-controls"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="startup-toggle">
                                          <label
                                            className="toggle-label"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isStartupEnabled}
                                              onChange={(e) =>
                                                toggleStartupApp(
                                                  runner.id,
                                                  e.target.checked
                                                )
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="toggle-checkbox"
                                            />
                                            <span className="toggle-slider"></span>
                                            <span className="toggle-text">
                                              Start on launch
                                            </span>
                                          </label>
                                        </div>

                                        {isStartupEnabled && (
                                          <div className="tab-order-control">
                                            <label className="tab-order-label">
                                              Tab order:
                                              <input
                                                type="number"
                                                min="1"
                                                max="99"
                                                value={tabOrder}
                                                onChange={(e) =>
                                                  updateStartupAppTabOrder(
                                                    runner.id,
                                                    parseInt(e.target.value) ||
                                                      1
                                                  )
                                                }
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                                className="tab-order-input"
                                              />
                                            </label>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* File-based runners section */}
                      {runners.filter((f) => !f.standalone).length > 0 && (
                        <div className="runners-section">
                          <div className="section-card">
                            <div className="section-header">
                              <h4 className="section-title">
                                Contextual Runners
                              </h4>
                              <span className="section-count">
                                {runners.filter((f) => !f.standalone).length}
                              </span>
                            </div>
                            {isLoadingRunners ? (
                              <div className="loading-state">
                                <span className="loading-spinner">⟳</span>
                                Loading runners...
                              </div>
                            ) : (
                              <div className="runners-grid">
                                {runners
                                  .filter((f) => !f.standalone)
                                  .map((runner) => (
                                    <div
                                      key={runner.id}
                                      className="app-info-card"
                                    >
                                      <div className="app-info-header">
                                        <h5 className="app-info-title">
                                          {runner.name}
                                        </h5>
                                        <div className="app-info-status">
                                          <span className="status-dot"></span>
                                        </div>
                                      </div>
                                      <p className="app-info-description">
                                        {runner.description}
                                      </p>
                                      <div className="app-info-formats">
                                        {getSupportedFormats(runner)}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Settings Modal - Remove directory controls */}
            {showSettings && (
              <div
                className="settings-modal-overlay"
                onClick={() => setShowSettings(false)}
              >
                <div
                  className="settings-modal"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="settings-header">
                    <h3>Settings</h3>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="close-btn"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="settings-content">
                    <div className="setting-group">
                      <label>Updates</label>
                      <p className="setting-description">
                        Check for the latest version of Viberunner
                      </p>
                      <div className="setting-actions">
                        <button
                          className="btn btn-outline"
                          onClick={() =>
                            updateNotificationRef.current?.checkForUpdates()
                          }
                        >
                          Check for Updates
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Icon */}
            {activeTab?.type === "newtab" && !showAppSelection && (
              <button
                className="settings-icon"
                onClick={() => setShowSettings(true)}
                title="Settings"
              >
                ⚙️
              </button>
            )}
          </div>
        </main>

        {/* Update Notification Component */}
        <UpdateNotification ref={updateNotificationRef} />
      </div>
    </div>
  )
}

export default App
