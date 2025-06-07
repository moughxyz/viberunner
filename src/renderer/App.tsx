import React, { useEffect, useState, useRef, useCallback } from "react"
import { createRoot } from "react-dom/client"
import UpdateNotification, {
  UpdateNotificationRef,
} from "./components/UpdateNotification"
import BuildPrompt from "./components/BuildPrompt"
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
} from "./runnerPreferences"
import { getViberunnerLogoPath } from "./util"
import { useRunnerService } from "./hooks/useRunnerService"
import { useTabService } from "./hooks/useTabService"
import { runnerService } from "./services/RunnerService"
import { FileManagerService } from "./services/FileManagerService"
import { CommandExecutorService } from "./services/CommandExecutorService"
import { getSupportedFormats } from "../lib/utils"

// Direct Node.js access with full integration
const { ipcRenderer } = require("electron")
const fs = require("fs")
const path = require("path")
const mime = require("mime-types")

// Expose React and ReactDOM globally for runners
;(window as any).React = React
;(window as any).ReactDOM = { createRoot }

// Create command executor service instance for runners
const commandExecutorService = new CommandExecutorService()

// Simplified API - only direct operations, no IPC
const api = {
  // User Preferences API for runners
  getRunnerPreferences: getRunnerPreferences,
  setRunnerPreferences: setRunnerPreferences,
  updateRunnerPreference: updateRunnerPreference,
  removeRunnerPreference: removeRunnerPreference,
  getRunnerPreference: getRunnerPreference,

  // Command execution API for runners
  executeCommand: async (command: string) => {
    return await commandExecutorService.executeCommand(command)
  },
  executeCommandWithArgs: async (executable: string, args: string[] = []) => {
    return await commandExecutorService.executeCommandWithArgs(executable, args)
  },
}

// Make API available globally for runners
;(window as any).api = api

// Helper functions for direct file operations moved to RunnerService

// Runner loading is now handled by RunnerService

const App: React.FC = () => {
  // Read runnerId from URL parameters
  const [runnerId, setRunnerId] = useState<string | null>(null)
  const [singleAppMode, setSingleAppMode] = useState<boolean>(false)

  // Use RunnerService instead of local state
  const {
    runners,
    startupRunners,
    getAppIcon,
    runnerIcons,
  } = useRunnerService()

  // Tab-related state
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: "default-tab", title: "New Tab", type: "newtab" },
  ])
  const [activeTabId, setActiveTabId] = useState("default-tab")
  const [showAppSelection, setShowAppSelection] = useState(false)
  const [availableRunners, setAvailableRunners] = useState<RunnerConfig[]>([])
  const [pendingFileInput, setPendingFileInput] = useState<FileInput | null>(
    null
  )
  const [showSettings, setShowSettings] = useState(false)

  const appRootRef = useRef<HTMLDivElement>(null)
  const hasLaunchedStartupRunners = useRef<boolean>(false)

  // Initialize TabService
  const tabService = useTabService(appRootRef)

  // Read runnerId and popup mode from URL parameters on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const runnerIdParam = urlParams.get("runnerId")
    const isPopupMode = urlParams.get("popup") === "true"

    if (runnerIdParam) {
      console.log(
        "Received runnerId from URL:",
        runnerIdParam,
        "popup mode:",
        isPopupMode
      )
      setRunnerId(runnerIdParam)
      setSingleAppMode(true)
    }
  }, [])

  // Handle single app mode - launch the specific runner
  useEffect(() => {
    if (runnerId && singleAppMode && runners.length > 0) {
      console.log("Single app mode: launching runner", runnerId)

      // Find the runner by ID
      const runner = runners.find((r) => r.id === runnerId)
      if (runner) {
        console.log("Found runner for single app mode:", runner.name)
        // Launch the runner in single app mode
        openAppInNewTab(runner, undefined, true, true)
      } else {
        console.error("Runner not found for ID:", runnerId)
      }
    }
  }, [runnerId, singleAppMode, runners])

  // Handle editing an existing runner
  const handleEditRunner = useCallback(
    async (runnerName: string) => {
      try {
        await tabService.openAIAgentForExistingRunner(
          runnerName,
          undefined, // No initial prompt for editing
          openTabs,
          activeTabId,
          setOpenTabs,
          setActiveTabId
        )
      } catch (error) {
        console.error("Error opening AI Agent for existing runner:", error)
        alert(`Failed to open editor for runner "${runnerName}": ${error}`)
      }
    },
    [tabService, openTabs, activeTabId]
  )

  // Handle editing an existing runner with Cursor
  const handleEditRunnerWithCursor = useCallback(async (runnerName: string) => {
    try {
      const fileManagerService = new FileManagerService()
      await fileManagerService.editRunnerWithCursor(runnerName)
    } catch (error) {
      console.error("Error opening runner with Cursor:", error)
      alert(`Failed to open runner "${runnerName}" with Cursor: ${error}`)
    }
  }, [])

  // Ref for update notification component
  const updateNotificationRef = useRef<UpdateNotificationRef>(null)

  // Get the currently active tab
  const activeTab = openTabs.find((tab) => tab.id === activeTabId)



  // Auto-launch startup runners when runners are loaded (but not in single app mode)
  useEffect(() => {
    console.log("Auto-launch useEffect triggered:", {
      runnersLength: runners.length,
      startupRunnersCount: Object.keys(startupRunners).length,
      hasLaunched: hasLaunchedStartupRunners.current,
      singleAppMode,
      startupRunners,
    })

    // Don't auto-launch startup runners in single app mode
    if (singleAppMode) {
      console.log("Skipping auto-launch in single app mode")
      return
    }

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
              tabService.switchToTab(currentNewTabId, openTabs, setActiveTabId)
            }
          })
          .catch((error) => {
            console.error("Error during parallel startup runner launch:", error)
          })
      }
      hasLaunchedStartupRunners.current = true
    }
  }, [runners, startupRunners, singleAppMode])

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

  // Initialize RunnerService on component mount
  useEffect(() => {
    runnerService.initialize()
  }, [])

  const openAppInNewTab = async (
    runner: RunnerConfig,
    fileInput?: FileInput,
    forceNewTab: boolean = false,
    switchToTab_: boolean = true
  ) => {
    await tabService.openAppInNewTab(
      runner,
      openTabs,
      activeTabId,
      setOpenTabs,
      setActiveTabId,
      setShowAppSelection,
      setPendingFileInput,
      fileInput,
      forceNewTab,
      switchToTab_
    )
  }

  const closeTab = (tabId: string) => {
    tabService.closeTab(
      tabId,
      openTabs,
      activeTabId,
      setOpenTabs,
      setActiveTabId
    )
  }

  // Handle tab switching
  const handleTabSwitch = (tabId: string) => {
    tabService.handleTabSwitch(
      tabId,
      openTabs,
      setActiveTabId,
      setShowAppSelection,
      setPendingFileInput
    )
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

  // Enhanced file matching functions moved to RunnerService

  useEffect(() => {
    // Handle file drops
    const handleFileDrop = async (filePath: string) => {
      try {
        console.log("=== FILE DROP STARTED ===")
        console.log("handleFileDrop: Processing file:", filePath)

        // Get file mimetype for the file input
        const stats = fs.statSync(filePath)
        const filename = path.basename(filePath)
        const mimetype = stats.isDirectory()
          ? "inode/directory"
          : mime.lookup(filePath) || "application/octet-stream"

        // Create simplified file input - just path and mimetype
        const fileInput: FileInput = {
          path: filePath,
          mimetype: mimetype,
        }
        console.log("handleFileDrop: File input prepared:", fileInput)

        // Find matching runners using RunnerService
        const matches = await runnerService.findMatchingRunners(filePath)
        console.log("handleFileDrop: Found matches:", matches)

        if (matches.length === 0) {
          console.log("handleFileDrop: No matches found")
          alert(
            `No app found for this file.\n\nFile: ${filename}\nType: ${mimetype}\nSize: ${(
              stats.size / 1024
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
              ...m.runner,
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
    tabService.createNewTab(
      openTabs,
      setOpenTabs,
      setActiveTabId,
      setShowAppSelection,
      setPendingFileInput
    )
  }

  // Handler for build prompt submission
  const handleBuildPromptSubmit = async (prompt: string) => {
    // Open AI Agent with the build prompt
    console.log("App received build prompt:", prompt)
    await openAIAgentInNewTab(prompt)
  }

  // Function to open AI Agent in a new tab
  const openAIAgentInNewTab = async (prompt?: string) => {
    await tabService.openAIAgentInNewTab(
      prompt,
      openTabs,
      activeTabId,
      setOpenTabs,
      setActiveTabId
    )
  }

  // Single app mode - render only the app viewport with draggable area
  if (singleAppMode) {
    return (
      <div className="vr-app vr-single-app-mode">
        <div className="vr-single-app-drag-area" />
        <div ref={appRootRef} className="app-viewport" />
      </div>
    )
  }

  // Normal mode - render full interface
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
                      launchStandaloneApp={launchStandaloneApp}
                      onEditRunner={handleEditRunner}
                      onEditRunnerWithCursor={handleEditRunnerWithCursor}
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
