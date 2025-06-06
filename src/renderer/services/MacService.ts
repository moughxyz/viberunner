import { RunnerConfig } from "../types"

// Direct Node.js access with full integration
const { ipcRenderer } = require("electron")

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
      console.log(`Creating new Electron window for runner: "${runner.name}" (ID: ${runner.id})`)

      // Use IPC to communicate with main process to create new window
      const result = await ipcRenderer.invoke("create-runner-window", runner.id)

      if (!result.success) {
        throw new Error(result.error || "Failed to create runner window")
      }

      console.log(`Successfully created new window for runner "${runner.name}"`)
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

  /**
   * Adds a runner to the macOS menu bar as a tray icon
   * When clicked, opens a new window with only that runner in single app mode
   */
  public async addRunnerToMenuBar(runner: RunnerConfig): Promise<void> {
    try {
      console.log(`Adding runner to menu bar: "${runner.name}" (ID: ${runner.id})`)

      // Get the runner's icon path if available
      const iconPath = runner.icon ? runner.icon : undefined

      // Use IPC to communicate with main process to create tray icon
      const result = await ipcRenderer.invoke("add-runner-to-menubar", runner.id, runner.name, iconPath)

      if (!result.success) {
        throw new Error(result.error || "Failed to add runner to menu bar")
      }

      console.log(`Successfully added runner "${runner.name}" to menu bar`)
    } catch (error) {
      console.error(`Failed to add runner "${runner.name}" to menu bar:`, error)
      throw error
    }
  }

  /**
   * Removes a runner from the macOS menu bar
   */
  public async removeRunnerFromMenuBar(runnerId: string): Promise<void> {
    try {
      console.log(`Removing runner from menu bar: ${runnerId}`)

      const result = await ipcRenderer.invoke("remove-runner-from-menubar", runnerId)

      if (!result.success) {
        throw new Error(result.error || "Failed to remove runner from menu bar")
      }

      console.log(`Successfully removed runner from menu bar: ${runnerId}`)
    } catch (error) {
      console.error(`Failed to remove runner from menu bar:`, error)
      throw error
    }
  }
}

// Export singleton instance
export const macService = MacService.getInstance()