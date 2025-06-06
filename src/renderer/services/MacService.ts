import { RunnerConfig } from "../types"

// Direct Node.js access with full integration
const { BrowserWindow, app } = require("@electron/remote")

export interface MacServiceState {
  // TODO: Add Mac-specific state properties as needed
  runnerWindows: Map<string, any> // Track runner-specific windows
}

type MacServiceListener = (state: MacServiceState) => void

export class MacService {
  private static instance: MacService | null = null
  private state: MacServiceState = {
    runnerWindows: new Map(),
  }
  private listeners = new Set<MacServiceListener>()

  // Singleton pattern
  public static getInstance(): MacService {
    if (!MacService.instance) {
      MacService.instance = new MacService()
    }
    return MacService.instance
  }

  private constructor() {
    // Private constructor to enforce singleton
  }

  // Subscribe to Mac service state changes
  public subscribe(listener: MacServiceListener): () => void {
    this.listeners.add(listener)

    // Immediately notify new subscriber of current state
    listener(this.state)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  // Notify all listeners of state changes
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state)
      } catch (error) {
        console.error("Error in MacService listener:", error)
      }
    })
  }

  // Update state and notify listeners (currently unused but ready for future features)
  // private setState(partialState: Partial<MacServiceState>): void {
  //   this.state = { ...this.state, ...partialState }
  //   this.notifyListeners()
  // }

  // Get current state (synchronous)
  public getState(): MacServiceState {
    return { ...this.state }
  }

  /**
   * Adds a runner as a separate dock icon in the macOS dock
   * When clicked, opens a new window with only that runner
   */
  public async addRunnerToDock(runner: RunnerConfig): Promise<void> {
    try {
      // Check if we're on macOS
      if (process.platform !== "darwin") {
        console.warn("addRunnerToDock is only supported on macOS")
        return
      }

      // Check if window already exists for this runner
      if (this.state.runnerWindows.has(runner.id)) {
        const existingWindow = this.state.runnerWindows.get(runner.id)
        if (existingWindow && !existingWindow.isDestroyed()) {
          existingWindow.focus()
          return
        }
      }

      // Create a new window for the runner
      const runnerWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        title: runner.name,
        icon: runner.icon || undefined,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
          enableRemoteModule: true,
        },
        show: false, // Don't show immediately
      })

      // Load the runner in the new window
      // We'll create a special renderer page for single-runner windows
      const runnerUrl = `file://${__dirname}/../runner-window.html?runnerId=${encodeURIComponent(runner.id)}`
      await runnerWindow.loadURL(runnerUrl)

      // Show the window once it's ready
      runnerWindow.once("ready-to-show", () => {
        runnerWindow.show()
      })

      // Handle window closed
      runnerWindow.on("closed", () => {
        this.state.runnerWindows.delete(runner.id)
        this.notifyListeners()
      })

      // Store the window reference
      this.state.runnerWindows.set(runner.id, runnerWindow)
      this.notifyListeners()

      // Set up dock integration
      if (app && app.dock) {
        // Set the dock icon if the runner has a custom icon
        if (runner.icon) {
          try {
            // Note: This sets the app icon, but for individual runner icons
            // we might need a different approach or use app.dock.setBadge()
            app.dock.setBadge(runner.name.charAt(0).toUpperCase())
          } catch (error) {
            console.warn("Could not set dock badge:", error)
          }
        }

        // Ensure the app appears in the dock
        app.dock.show()
      }

      console.log(`Successfully added runner "${runner.name}" to dock`)
    } catch (error) {
      console.error(`Failed to add runner "${runner.name}" to dock:`, error)
      throw error
    }
  }

  /**
   * Removes a runner from the dock by closing its dedicated window
   */
  public async removeRunnerFromDock(runnerId: string): Promise<void> {
    try {
      const runnerWindow = this.state.runnerWindows.get(runnerId)
      if (runnerWindow && !runnerWindow.isDestroyed()) {
        runnerWindow.close()
      }
      this.state.runnerWindows.delete(runnerId)
      this.notifyListeners()
    } catch (error) {
      console.error(`Failed to remove runner "${runnerId}" from dock:`, error)
      throw error
    }
  }

  /**
   * Gets all active runner windows
   */
  public getRunnerWindows(): Map<string, any> {
    return new Map(this.state.runnerWindows)
  }

  /**
   * Checks if a runner has an active dock window
   */
  public hasRunnerInDock(runnerId: string): boolean {
    const window = this.state.runnerWindows.get(runnerId)
    return window && !window.isDestroyed()
  }
}

// Export singleton instance
export const macService = MacService.getInstance()