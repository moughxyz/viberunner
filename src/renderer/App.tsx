import React, { useEffect, useState, useRef, useCallback } from "react"
import { createRoot } from "react-dom/client"
import UpdateNotification, {
  UpdateNotificationRef,
} from "./components/UpdateNotification"
import BuildPrompt from "./components/BuildPrompt"
import AIAgentInterface from "./components/AIAgentInterface"
import RunnersGrid from "./components/RunnersGrid"
import AppSelection from "./components/AppSelection"
import SettingsModal from "./components/SettingsModal"
import TabBar from "./components/TabBar"
import DropZone from "./components/DropZone"
import { FileInput, RunnerConfig, OpenTab } from "./types"
import {
  getRunnerPreference,
  getRunnerPreferences,
  updateRunnerPreference,
  removeRunnerPreference,
  setRunnerPreferences,
} from "./preferences"
import { getRunnersDirectory, getViberunnerLogoPath } from "./util"
import { useRunnerService } from "./hooks/useRunnerService"
import { runnerService } from "./services/RunnerService"

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
  // User Preferences API for runners
  getRunnerPreferences: getRunnerPreferences,
  setRunnerPreferences: setRunnerPreferences,
  updateRunnerPreference: updateRunnerPreference,
  removeRunnerPreference: removeRunnerPreference,
  getRunnerPreference: getRunnerPreference,
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

// Runner loading is now handled by RunnerService

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
  // Use RunnerService instead of local state
  const { runners, isLoading: isLoadingRunners, loadApp } = useRunnerService()
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

  // Initialize RunnerService on component mount
  useEffect(() => {
    runnerService.initialize()
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
    const runners = runnerService.getRunners()
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
  const handleBuildPromptSubmit = async (prompt: string) => {
    // Open AI Agent with the build prompt
    console.log("App received build prompt:", prompt)
    await openAIAgentInNewTab(prompt)
  }

  // Function to open AI Agent in a new tab
  const openAIAgentInNewTab = async (prompt?: string) => {
    const tabId = generateTabId()
    const newTab: OpenTab = {
      id: tabId,
      title: "Runner Builder",
      type: "ai-agent",
      prompt: prompt,
    }

    // Check if we have an active new tab to transform
    const currentTab = openTabs.find((tab) => tab.id === activeTabId)

    if (currentTab && currentTab.type === "newtab") {
      // Transform the current new tab
      const transformedTab: OpenTab = {
        ...currentTab,
        title: "Runner Builder",
        type: "ai-agent",
        prompt: prompt,
      }

      setOpenTabs((prev) =>
        prev.map((tab) => (tab.id === activeTabId ? transformedTab : tab))
      )

      // Create the AI Agent container
      const success = await createAIAgentContainer(transformedTab)
      if (success) {
        switchToTab(transformedTab.id, transformedTab)
      }
    } else {
      // Create a new tab
      setOpenTabs((prev) => [...prev, newTab])

      // Create the AI Agent container
      const success = await createAIAgentContainer(newTab)
      if (success) {
        switchToTab(tabId, newTab)
      }
    }
  }

  // Function to create a persistent AI Agent container
  const createAIAgentContainer = async (tab: OpenTab): Promise<boolean> => {
    if (!appRootRef.current || tab.type !== "ai-agent") {
      console.error("Cannot create AI Agent container:", {
        hasAppRoot: !!appRootRef.current,
        isAIAgent: tab.type === "ai-agent",
      })
      return false
    }

    console.log("Creating AI Agent container for tab:", tab.id)

    // Create DOM container
    const container = document.createElement("div")
    container.className = "tab-ai-agent-container"
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

    return new Promise<boolean>((resolve) => {
      try {
        // Create React root and render AI Agent
        const root = createRoot(container)
        root.render(
          React.createElement(AIAgentInterface, {
            onClose: () => closeTab(tab.id),
            inTab: true,
            initialPrompt: tab.prompt,
          })
        )

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
        console.error("Error creating AI Agent container:", error)
        resolve(false)
      }
    })
  }

  return (
    <div className="vr-app">
      <header id="vr-header">
        <div className="vr-header-content">
          {/* Tabs first, right after macOS traffic lights */}
          <TabBar
            openTabs={openTabs}
            activeTabId={activeTabId}
            onTabsChange={setOpenTabs}
            onActiveTabChange={handleTabSwitch}
            onCloseTab={closeTab}
            onCreateNewTab={createNewTab}
            runnerIcons={runnerIcons}
          />

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
          <AppSelection
            isVisible={showAppSelection && activeTab?.type === "newtab"}
            availableRunners={availableRunners}
            pendingFileInput={pendingFileInput}
            onSelectApp={selectApp}
            onCancel={() => setShowAppSelection(false)}
            getAppIcon={getAppIcon}
            getSupportedFormats={getSupportedFormats}
          />

          <div className="app-viewport-container">
            {/* Always render app viewport for tab containers */}
            <div ref={appRootRef} className="app-viewport" />

            {/* Unified new tab interface when active tab is new tab */}
            {activeTab?.type === "newtab" && !showAppSelection && (
              <div className="vr-new-tab-unified">
                {runners.length === 0 && (
                  <BuildPrompt
                    onSubmit={handleBuildPromptSubmit}
                    condensed={false}
                  />
                )}

                {runners.length > 0 && (
                  <div className="unified-content">
                    <div className="chat-dropzone-columns">
                      <div className="chat-column">
                        <BuildPrompt
                          onSubmit={handleBuildPromptSubmit}
                          condensed={true}
                        />
                      </div>

                      <div className="column-divider"></div>

                      <div className="dropzone-column">
                        <DropZone />
                      </div>
                    </div>

                    <RunnersGrid
                      runners={runners}
                      isLoadingRunners={isLoadingRunners}
                      startupRunners={startupRunners}
                      getAppIcon={getAppIcon}
                      getSupportedFormats={getSupportedFormats}
                      launchStandaloneApp={launchStandaloneApp}
                      toggleStartupApp={toggleStartupApp}
                      updateStartupAppTabOrder={updateStartupAppTabOrder}
                    />
                  </div>
                )}
              </div>
            )}

            <SettingsModal
              isVisible={showSettings}
              onClose={() => setShowSettings(false)}
              updateNotificationRef={updateNotificationRef}
            />

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
