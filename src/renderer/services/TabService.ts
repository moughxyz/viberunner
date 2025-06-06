import React from "react"
import { createRoot } from "react-dom/client"
import { OpenTab, RunnerConfig, FileInput, RunnerProps } from "../types"
import { createRunnerLoader, getRunnerUserDataDirectory } from "../util"
import AIAgentInterface from "../components/AIAgentInterface"
import { RunnerService } from "./RunnerService"

const fs = require("fs")

// Tab cleanup system
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

interface TabContainer {
  domElement: HTMLDivElement
  reactRoot: any
  styleElement?: HTMLStyleElement
}

export class TabService {
  private tabContainers = new Map<string, TabContainer>()
  private appRootRef: React.RefObject<HTMLDivElement>

  constructor(appRootRef: React.RefObject<HTMLDivElement>) {
    this.appRootRef = appRootRef
  }

  generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Switch tab visibility
  switchToTab(
    tabId: string,
    openTabs: OpenTab[],
    setActiveTabId: (id: string) => void,
    tabData?: OpenTab
  ): void {
    const activeTab = tabData || openTabs.find((tab) => tab.id === tabId)

    console.log("Switching to tab:", tabId, "type:", activeTab?.type)

    // Hide all app containers with enhanced visibility control
    this.tabContainers.forEach((container, id) => {
      console.log("Hiding container for tab:", id)
      const element = container.domElement
      element.style.display = "none"
      element.style.visibility = "hidden"
      element.style.zIndex = "-1"
      element.style.opacity = "0"
    })

    // Show the active tab's container if it's not a new tab
    if (activeTab && activeTab.type !== "newtab") {
      const container = this.tabContainers.get(tabId)
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

  // Create a new tab
  createNewTab(
    openTabs: OpenTab[],
    setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
    setActiveTabId: (id: string) => void,
    setShowAppSelection: (show: boolean) => void,
    setPendingFileInput: (input: FileInput | null) => void
  ): void {
    const tabId = this.generateTabId()
    const newTab: OpenTab = {
      id: tabId,
      title: "New Tab",
      type: "newtab",
    }

    setOpenTabs((prev) => [...prev, newTab])
    this.switchToTab(tabId, [...openTabs, newTab], setActiveTabId)
    setShowAppSelection(false)
    setPendingFileInput(null)
  }

  // Close tab
  closeTab(
    tabId: string,
    _openTabs: OpenTab[],
    activeTabId: string,
    setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
    setActiveTabId: (id: string) => void
  ): void {
    console.log("Closing tab:", tabId)

    // Execute cleanup callbacks for this tab
    executeCleanup(tabId)

    // Cleanup the tab's container
    const container = this.tabContainers.get(tabId)
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
          this.appRootRef.current &&
          this.appRootRef.current.contains(container.domElement)
        ) {
          this.appRootRef.current.removeChild(container.domElement)
        }
      } catch (error) {
        console.warn("Error cleaning up tab container:", error)
      }
      this.tabContainers.delete(tabId)
    }

    setOpenTabs((prev) => {
      const filtered = prev.filter((tab) => tab.id !== tabId)

      // If we closed the active tab, activate another one
      if (activeTabId === tabId) {
        const currentIndex = prev.findIndex((tab) => tab.id === tabId)
        if (filtered.length > 0) {
          const newActiveIndex = Math.min(currentIndex, filtered.length - 1)
          const newActiveTab = filtered[newActiveIndex]
          this.switchToTab(newActiveTab.id, filtered, setActiveTabId)
        } else {
          // If no tabs left, create a new tab
          const newTab: OpenTab = {
            id: this.generateTabId(),
            title: "New Tab",
            type: "newtab",
          }
          setActiveTabId(newTab.id)
          return [newTab]
        }
      }

      return filtered
    })
  }

  // Create app container
  async createAppContainer(tab: OpenTab): Promise<boolean> {
    if (!this.appRootRef.current || !tab.runner || !tab.runnerData) {
      console.error("Cannot create runner container:", {
        hasAppRoot: !!this.appRootRef.current,
        hasApp: !!tab.runner,
        hasAppData: !!tab.runnerData,
      })
      return false
    }

    // console.log("Creating app container for tab:", tab.id)

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
    this.appRootRef.current.appendChild(container)

    // Create data directory for the runner
    const dataDirectory = getRunnerUserDataDirectory(tab.runner.id)

    // Ensure data directory exists
    try {
      if (!fs.existsSync(dataDirectory)) {
        fs.mkdirSync(dataDirectory, { recursive: true })
        console.log(`Created data directory: ${dataDirectory}`)
      }
    } catch (error) {
      console.error(
        `Failed to create data directory for ${tab.runner.id}:`,
        error
      )
    }

    // Prepare props with cleanup support
    const props: RunnerProps = {
      dataDirectory: dataDirectory,
      fileInput: tab.fileInput, // This will be undefined for standalone runners
      tabId: tab.id,
    }

    return new Promise<boolean>((resolve) => {
      // Create script and load runner
      const script = document.createElement("script")
      script.type = "text/javascript"

      let processedBundleContent = tab.runnerData.bundleContent

      // Safe CSS scoping - only process strings that are clearly CSS
      // Use conservative patterns to avoid corrupting JavaScript code
      const safeCssPatterns = [
        // Match .css file imports/requires
        /(['"`])([^'"`]*\.css[^'"`]*)\1/g,

        // Match strings that clearly look like CSS (contain CSS selectors + rules)
        // Only match if it contains CSS selector patterns AND CSS properties
        /(['"`])([^'"`]*(?:\.[\w-]+|#[\w-]+|[a-zA-Z][\w-]*)\s*\{[^}]*(?:color|background|margin|padding|font|border|width|height|display|position)[^}]*\}[^'"`]*)\1/g,

        // Match template literals that contain CSS (tagged templates like css`...`)
        /css\s*`([^`]*(?:\.[\w-]+|#[\w-]+|[a-zA-Z][\w-]*)\s*\{[^}]*\}[^`]*)`/g,

        // Match styled-components or similar CSS-in-JS patterns
        /styled\.[a-zA-Z]+\s*`([^`]*(?:\.[\w-]+|#[\w-]+|[a-zA-Z][\w-]*)\s*\{[^}]*\}[^`]*)`/g,
      ]

      safeCssPatterns.forEach((pattern, index) => {
        processedBundleContent = processedBundleContent.replace(
          pattern,
          (match: string, ...args: string[]) => {
            // Extract CSS content based on pattern type
            let cssContent: string
            let quote: string = ""

            if (index <= 1) {
              // Standard quoted strings
              quote = args[0]
              cssContent = args[1]
            } else {
              // Template literals (css`` or styled.div``)
              cssContent = args[0]
            }

            if (!cssContent) return match

            // Additional safety check - skip if this looks like JavaScript
            if (
              cssContent.includes("export") ||
              cssContent.includes("import") ||
              cssContent.includes("function") ||
              cssContent.includes("const ") ||
              cssContent.includes("let ") ||
              cssContent.includes("var ") ||
              cssContent.includes("=>") ||
              cssContent.includes("return")
            ) {
              return match // Don't process JavaScript code
            }

            // Don't process if already scoped
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
                /^(\s*)([a-zA-Z][\w-]*)\s*\{/gm,
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
              // Scope complex selectors
              .replace(
                /^(\s*)([.#]?[\w-]+(?:\s*[>+~]\s*[.#]?[\w-]+)*)\s*\{/gm,
                `$1[data-app-id="${tab.id}"] $2 {`
              )
              // Handle @media queries
              .replace(
                /@media[^{]+\{([^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g,
                (mediaMatch: string, mediaContent: string) => {
                  const scopedMediaContent = mediaContent
                    .replace(/^\s*\*\s*\{/gm, `[data-app-id="${tab.id}"] * {`)
                    .replace(
                      /^(\s*)([a-zA-Z][\w-]*)\s*\{/gm,
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

            // Return with appropriate wrapper
            if (index <= 1) {
              return quote ? `${quote}${scopedCSS}${quote}` : scopedCSS
            } else {
              // Template literals
              return match.replace(cssContent, scopedCSS)
            }
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

      const runnerLoader = createRunnerLoader({
        container: container,
        appId: tab.id,
        props: props,
        useGlobalReact: true,
        onSuccess: (root) => {
          // Store container reference in tabContainers for tab switching
          this.tabContainers.set(tab.id, {
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
        },
        onError: (error) => {
          console.error("Error rendering app:", error)
          resolve(false)
        },
      })

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

  // Create AI Agent container
  async createAIAgentContainer(
    tab: OpenTab,
    openTabs: OpenTab[],
    activeTabId: string,
    setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
    setActiveTabId: (id: string) => void
  ): Promise<boolean> {
    if (!this.appRootRef.current || tab.type !== "ai-agent") {
      console.error("Cannot create AI Agent container:", {
        hasAppRoot: !!this.appRootRef.current,
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
    this.appRootRef.current.appendChild(container)

    return new Promise<boolean>((resolve) => {
      try {
        // Create React root and render AI Agent
        const root = createRoot(container)
        root.render(
          React.createElement(AIAgentInterface, {
            onClose: () =>
              this.closeTab(
                tab.id,
                openTabs,
                activeTabId,
                setOpenTabs,
                setActiveTabId
              ),
            inTab: true,
            initialPrompt: tab.prompt,
            existingRunnerName: tab.existingRunnerName,
          })
        )

        // Store container reference in tabContainers for tab switching
        this.tabContainers.set(tab.id, {
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

  // Open app in new tab
  async openAppInNewTab(
    runner: RunnerConfig,
    openTabs: OpenTab[],
    activeTabId: string,
    setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
    setActiveTabId: (id: string) => void,
    setShowAppSelection: (show: boolean) => void,
    setPendingFileInput: (input: FileInput | null) => void,
    fileInput?: FileInput,
    forceNewTab: boolean = false,
    switchToTab_: boolean = true
  ): Promise<void> {
    const title = fileInput
      ? fileInput.path.split("/").pop() || "Unknown File"
      : runner.name

    let appData

    // Load app data
    try {
      appData = await RunnerService.getInstance().loadApp(runner.id)
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
      const success = await this.createAppContainer(transformedTab)

      if (success) {
        // Only switch to this tab if switchToTab_ is true
        if (switchToTab_) {
          this.switchToTab(
            transformedTab.id,
            openTabs,
            setActiveTabId,
            transformedTab
          )
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
      const tabId = this.generateTabId()
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
      const success = await this.createAppContainer(newTab)

      if (success) {
        // Only switch to this tab if switchToTab_ is true
        if (switchToTab_) {
          this.switchToTab(tabId, [...openTabs, newTab], setActiveTabId, newTab)
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

  // Open AI Agent for editing existing runner
  async openAIAgentForExistingRunner(
    existingRunnerName: string,
    prompt: string | undefined,
    openTabs: OpenTab[],
    activeTabId: string,
    setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
    setActiveTabId: (id: string) => void
  ): Promise<void> {
    const tabId = this.generateTabId()
    const newTab: OpenTab = {
      id: tabId,
      title: `Editing: ${existingRunnerName}`,
      type: "ai-agent",
      prompt: prompt,
      existingRunnerName: existingRunnerName,
    }

    // Check if we have an active new tab to transform
    const currentTab = openTabs.find((tab) => tab.id === activeTabId)

    if (currentTab && currentTab.type === "newtab") {
      // Transform the current new tab
      const transformedTab: OpenTab = {
        ...currentTab,
        title: `Editing: ${existingRunnerName}`,
        type: "ai-agent",
        prompt: prompt,
        existingRunnerName: existingRunnerName,
      }

      setOpenTabs((prev) =>
        prev.map((tab) => (tab.id === activeTabId ? transformedTab : tab))
      )

      // Create the AI Agent container with proper state management functions
      const success = await this.createAIAgentContainer(
        transformedTab,
        openTabs,
        activeTabId,
        setOpenTabs,
        setActiveTabId
      )
      if (success) {
        this.switchToTab(
          transformedTab.id,
          openTabs,
          setActiveTabId,
          transformedTab
        )
      }
    } else {
      // Create a new tab
      setOpenTabs((prev) => [...prev, newTab])

      // Create the AI Agent container with proper state management functions
      const success = await this.createAIAgentContainer(
        newTab,
        [...openTabs, newTab],
        activeTabId,
        setOpenTabs,
        setActiveTabId
      )
      if (success) {
        this.switchToTab(tabId, [...openTabs, newTab], setActiveTabId, newTab)
      }
    }
  }

  // Open AI Agent in new tab
  async openAIAgentInNewTab(
    prompt: string | undefined,
    openTabs: OpenTab[],
    activeTabId: string,
    setOpenTabs: (updater: (prev: OpenTab[]) => OpenTab[]) => void,
    setActiveTabId: (id: string) => void
  ): Promise<void> {
    const tabId = this.generateTabId()
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

      // Create the AI Agent container with proper state management functions
      const success = await this.createAIAgentContainer(
        transformedTab,
        openTabs,
        activeTabId,
        setOpenTabs,
        setActiveTabId
      )
      if (success) {
        this.switchToTab(
          transformedTab.id,
          openTabs,
          setActiveTabId,
          transformedTab
        )
      }
    } else {
      // Create a new tab
      setOpenTabs((prev) => [...prev, newTab])

      // Create the AI Agent container with proper state management functions
      const success = await this.createAIAgentContainer(
        newTab,
        [...openTabs, newTab],
        activeTabId,
        setOpenTabs,
        setActiveTabId
      )
      if (success) {
        this.switchToTab(tabId, [...openTabs, newTab], setActiveTabId, newTab)
      }
    }
  }
}
