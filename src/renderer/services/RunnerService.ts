import { RunnerConfig } from "../types"
import { getRunnersDirectory } from "../util"

const fs = require("fs")
const path = require("path")

export interface RunnerServiceState {
  runners: RunnerConfig[]
  isLoading: boolean
  error: string | null
}

type RunnerServiceListener = (state: RunnerServiceState) => void

export class RunnerService {
  private static instance: RunnerService | null = null
  private state: RunnerServiceState = {
    runners: [],
    isLoading: false,
    error: null,
  }
  private listeners = new Set<RunnerServiceListener>()

  // Singleton pattern
  public static getInstance(): RunnerService {
    if (!RunnerService.instance) {
      RunnerService.instance = new RunnerService()
    }
    return RunnerService.instance
  }

  private constructor() {
    // Private constructor to enforce singleton
  }

  // Subscribe to runner state changes
  public subscribe(listener: RunnerServiceListener): () => void {
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
    this.listeners.forEach(listener => {
      try {
        listener(this.state)
      } catch (error) {
        console.error("Error in RunnerService listener:", error)
      }
    })
  }

  // Update state and notify listeners
  private setState(partialState: Partial<RunnerServiceState>): void {
    this.state = { ...this.state, ...partialState }
    this.notifyListeners()
  }

  // Get current state (synchronous)
  public getState(): RunnerServiceState {
    return { ...this.state }
  }

  // Get current runners (synchronous)
  public getRunners(): RunnerConfig[] {
    return [...this.state.runners]
  }

  // Check if currently loading
  public isLoading(): boolean {
    return this.state.isLoading
  }

  // Get current error
  public getError(): string | null {
    return this.state.error
  }

  // Load runners from filesystem
  private async loadRunners(): Promise<RunnerConfig[]> {
    const RUNNERS_DIR = getRunnersDirectory()
    console.log("RunnerService: Looking for runners in:", RUNNERS_DIR)

    if (!fs.existsSync(RUNNERS_DIR)) {
      console.log("RunnerService: Directory does not exist, creating it")
      fs.mkdirSync(RUNNERS_DIR, { recursive: true })
      return []
    }

    try {
      const dirContents = fs.readdirSync(RUNNERS_DIR)
      console.log("RunnerService: Directory contents:", dirContents)

      const directories = dirContents.filter((dir: string) => {
        const fullPath = path.join(RUNNERS_DIR, dir)
        const isDir = fs.statSync(fullPath).isDirectory()
        console.log(`RunnerService: ${dir} is directory: ${isDir}`)
        return isDir
      })
      console.log("RunnerService: Found directories:", directories)

      const runners = directories
        .map((dir: string) => {
          const runnerPath = path.join(RUNNERS_DIR, dir)
          const packageJsonPath = path.join(runnerPath, "package.json")
          console.log(`RunnerService: Checking for metadata at: ${packageJsonPath}`)

          if (!fs.existsSync(packageJsonPath)) {
            console.log(`RunnerService: No package.json found for ${dir}`)
            return null
          }

          try {
            const metadataContent = fs.readFileSync(packageJsonPath, "utf-8")
            const metadata = JSON.parse(metadataContent).viberunner
            console.log(
              `RunnerService: Successfully loaded metadata for ${dir}:`,
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

      console.log("RunnerService: Final runners array:", runners)
      return runners
    } catch (error) {
      console.error("Error in RunnerService loadRunners function:", error)
      throw error
    }
  }

  // Public method to refresh/reload runners
  public async refresh(): Promise<void> {
    if (this.state.isLoading) {
      console.log("RunnerService: Refresh already in progress, skipping")
      return
    }

    console.log("RunnerService: Starting refresh...")
    this.setState({ isLoading: true, error: null })

    try {
      const runners = await this.loadRunners()
      this.setState({
        runners,
        isLoading: false,
        error: null
      })
      console.log(`RunnerService: Successfully refreshed ${runners.length} runners`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("RunnerService: Failed to refresh runners:", error)
      this.setState({
        isLoading: false,
        error: errorMessage
      })
    }
  }

  // Initialize the service (call this once at app startup)
  public async initialize(): Promise<void> {
    console.log("RunnerService: Initializing...")
    await this.refresh()
  }

  // Load a specific app bundle and config
  public async loadApp(id: string): Promise<{ bundleContent: string; config: any }> {
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

  // Find a runner by ID
  public findRunner(id: string): RunnerConfig | undefined {
    return this.state.runners.find(runner => runner.id === id)
  }

  // Find runners by criteria
  public findRunners(predicate: (runner: RunnerConfig) => boolean): RunnerConfig[] {
    return this.state.runners.filter(predicate)
  }

  // Get standalone runners
  public getStandaloneRunners(): RunnerConfig[] {
    return this.state.runners.filter(runner => runner.standalone)
  }

  // Get contextual runners (non-standalone)
  public getContextualRunners(): RunnerConfig[] {
    return this.state.runners.filter(runner => !runner.standalone)
  }
}

// Export singleton instance for easy access
export const runnerService = RunnerService.getInstance()