import { RunnerConfig } from "../types"
import { getRunnersDirectory, getViberunnerLogoPath } from "../util"

const fs = require("fs")
const path = require("path")
const mime = require("mime-types")

// Helper function for MIME type detection
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

// File analysis interface
interface FileAnalysis {
  path: string
  filename: string
  mimetype: string
  content: string
  size: number
  isJson?: boolean
  jsonContent?: any
}

// Helper function for file analysis
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

// Helper function for matcher evaluation
function evaluateMatcher(matcher: any, fileAnalysis: FileAnalysis): boolean {
  switch (matcher.type) {
    case "mimetype":
      // Support wildcards in MIME types (e.g., "image/*", "text/*")
      if (matcher.mimetype.includes("*")) {
        const pattern = matcher.mimetype
          .replace(/\*/g, ".*")
          .replace(/\?/g, ".")
        return new RegExp(`^${pattern}$`).test(fileAnalysis.mimetype)
      }
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
      if (matcher.minSize !== undefined && size < matcher.minSize) return false
      if (matcher.maxSize !== undefined && size > matcher.maxSize) return false
      return true
    }

    default:
      return false
  }
}

// Preferences interface
interface Preferences {
  startupRunners?: Record<string, { enabled: boolean; tabOrder: number }>
  [key: string]: any // Allow other preference keys
}

export interface RunnerServiceState {
  runners: RunnerConfig[]
  isLoading: boolean
  error: string | null
  startupRunners: Record<string, { enabled: boolean; tabOrder: number }>
  runnerIcons: Record<string, string>
}

type RunnerServiceListener = (state: RunnerServiceState) => void

export class RunnerService {
  private static instance: RunnerService | null = null
  private state: RunnerServiceState = {
    runners: [],
    isLoading: false,
    error: null,
    startupRunners: {},
    runnerIcons: {},
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
    this.listeners.forEach((listener) => {
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

  // Get startup runners
  public getStartupRunners(): Record<
    string,
    { enabled: boolean; tabOrder: number }
  > {
    return { ...this.state.startupRunners }
  }

  // Load startup runner preferences
  private async loadStartupRunners(): Promise<
    Record<string, { enabled: boolean; tabOrder: number }>
  > {
    try {
      const { app } = require("@electron/remote")
      const prefsPath = path.join(app.getPath("userData"), "preferences.json")

      if (fs.existsSync(prefsPath)) {
        const prefsContent = fs.readFileSync(prefsPath, "utf8")
        const prefs = JSON.parse(prefsContent)
        return prefs.startupRunners || {}
      }

      return {}
    } catch (error) {
      console.error("Error loading startup runners:", error)
      return {}
    }
  }

  // Save startup runner preferences
  private async saveStartupRunners(
    startupRunners: Record<string, { enabled: boolean; tabOrder: number }>
  ): Promise<void> {
    try {
      const { app } = require("@electron/remote")
      const prefsPath = path.join(app.getPath("userData"), "preferences.json")

      // Load existing preferences
      let prefs: Preferences = {}
      if (fs.existsSync(prefsPath)) {
        const prefsContent = fs.readFileSync(prefsPath, "utf8")
        prefs = JSON.parse(prefsContent)
      }

      // Update startup runners
      prefs.startupRunners = startupRunners

      // Save back to file
      fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), "utf8")

      // Update state
      this.setState({ startupRunners })
    } catch (error) {
      console.error("Error saving startup runners:", error)
      throw error
    }
  }

  // Toggle startup runner enabled state
  public async toggleStartupRunner(
    runnerId: string,
    enabled: boolean
  ): Promise<void> {
    try {
      const newStartupRunners = { ...this.state.startupRunners }

      if (enabled) {
        // If enabling, set a default tab order if not already set
        const currentConfig = this.state.startupRunners[runnerId] || {
          enabled: false,
          tabOrder: 1,
        }
        if (!currentConfig.tabOrder) {
          const maxTabOrder = Math.max(
            0,
            ...Object.values(this.state.startupRunners).map(
              (runner) => runner.tabOrder
            )
          )
          currentConfig.tabOrder = maxTabOrder + 1
        }
        newStartupRunners[runnerId] = { ...currentConfig, enabled: true }
      } else {
        delete newStartupRunners[runnerId]
      }

      await this.saveStartupRunners(newStartupRunners)
    } catch (error) {
      console.error("Error toggling startup runner:", error)
      throw error
    }
  }

  // Update tab order for startup runner
  public async updateStartupRunnerTabOrder(
    runnerId: string,
    tabOrder: number
  ): Promise<void> {
    try {
      const currentConfig = this.state.startupRunners[runnerId]
      if (!currentConfig || !currentConfig.enabled) return

      const newStartupRunners = {
        ...this.state.startupRunners,
        [runnerId]: { ...currentConfig, tabOrder },
      }

      await this.saveStartupRunners(newStartupRunners)
    } catch (error) {
      console.error("Error updating startup runner tab order:", error)
      throw error
    }
  }

  // Change a runner's launch mode
  public async changeRunnerLaunchMode(
    runnerId: string,
    newLaunchMode: "newTab" | "macDock" | "macMenuBar"
  ): Promise<void> {
    try {
      const RUNNERS_DIR = getRunnersDirectory()
      const runnerPath = path.join(RUNNERS_DIR, runnerId)
      const packageJsonPath = path.join(runnerPath, "package.json")

      // Check if runner exists
      if (!fs.existsSync(runnerPath)) {
        throw new Error(`Runner with ID '${runnerId}' not found`)
      }

      if (!fs.existsSync(packageJsonPath)) {
        throw new Error(`package.json not found for runner '${runnerId}'`)
      }

      // Read the current package.json
      const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8")
      const packageJson = JSON.parse(packageJsonContent)

      // Ensure viberunner section exists
      if (!packageJson.viberunner) {
        packageJson.viberunner = {}
      }

      // Update the launch mode
      packageJson.viberunner.launchMode = newLaunchMode

      // Write the updated package.json back to file
      fs.writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2),
        "utf8"
      )

      // Update the in-memory runner config
      const updatedRunners = this.state.runners.map((runner) => {
        if (runner.id === runnerId) {
          return { ...runner, launchMode: newLaunchMode }
        }
        return runner
      })

      // Update state
      this.setState({ runners: updatedRunners })

      console.log(
        `RunnerService: Successfully changed launch mode for '${runnerId}' to '${newLaunchMode}'`
      )
    } catch (error) {
      console.error(
        `RunnerService: Error changing launch mode for runner '${runnerId}':`,
        error
      )
      throw error
    }
  }

  // Delete a runner
  public async deleteRunner(runnerId: string): Promise<void> {
    try {
      const RUNNERS_DIR = getRunnersDirectory()
      const runnerPath = path.join(RUNNERS_DIR, runnerId)

      // Check if runner exists
      if (!fs.existsSync(runnerPath)) {
        throw new Error(`Runner with ID '${runnerId}' not found`)
      }

      // Remove the entire runner directory
      fs.rmSync(runnerPath, { recursive: true, force: true })

      // Remove from startup runners if it exists
      const newStartupRunners = { ...this.state.startupRunners }
      if (newStartupRunners[runnerId]) {
        delete newStartupRunners[runnerId]
        await this.saveStartupRunners(newStartupRunners)
      }

      // Remove from runner icons cache
      const newRunnerIcons = { ...this.state.runnerIcons }
      if (newRunnerIcons[runnerId]) {
        delete newRunnerIcons[runnerId]
      }

      // Remove from runners array
      const newRunners = this.state.runners.filter(
        (runner) => runner.id !== runnerId
      )

      // Update state
      this.setState({
        runners: newRunners,
        runnerIcons: newRunnerIcons,
      })

      console.log(`RunnerService: Successfully deleted runner '${runnerId}'`)
    } catch (error) {
      console.error(
        `RunnerService: Error deleting runner '${runnerId}':`,
        error
      )
      throw error
    }
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

      const directories = dirContents.filter((dir: string) => {
        const fullPath = path.join(RUNNERS_DIR, dir)
        const isDir = fs.statSync(fullPath).isDirectory()
        return isDir
      })

      const runners = directories
        .map((dir: string) => {
          const runnerPath = path.join(RUNNERS_DIR, dir)
          const packageJsonPath = path.join(runnerPath, "package.json")

          if (!fs.existsSync(packageJsonPath)) {
            console.log(`RunnerService: No package.json found for ${dir}`)
            return null
          }

          try {
            const metadataContent = fs.readFileSync(packageJsonPath, "utf-8")
            const metadata = JSON.parse(metadataContent).viberunner
            return {
              ...metadata,
              id: dir,
              // Apply defaults for missing properties
              launchMode: metadata.launchMode || "newTab",
              standalone: metadata.standalone ?? false,
            }
          } catch (parseError) {
            console.error(`Error parsing metadata for ${dir}:`, parseError)
            return null
          }
        })
        .filter(Boolean) as RunnerConfig[]

      return runners
    } catch (error) {
      console.error("Error in RunnerService loadRunners function:", error)
      throw error
    }
  }

  // Get runner icons
  public getRunnerIcons(): Record<string, string> {
    return { ...this.state.runnerIcons }
  }

  // Load runner icon
  private async loadRunnerIcon(runner: RunnerConfig): Promise<string | null> {
    if (!runner.icon) return null

    // Check if already cached
    if (this.state.runnerIcons[runner.id]) {
      return this.state.runnerIcons[runner.id]
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

      // Update state with new icon
      this.setState({
        runnerIcons: {
          ...this.state.runnerIcons,
          [runner.id]: iconData,
        },
      })

      return iconData
    } catch (error) {
      console.warn(`Failed to load icon for ${runner.name}:`, error)
    }

    return null
  }

  // Load all runner icons
  private async loadAllRunnerIcons(): Promise<void> {
    const runners = this.state.runners
    const iconPromises = runners
      .filter((runner) => runner.icon && !this.state.runnerIcons[runner.id])
      .map((runner) => this.loadRunnerIcon(runner))

    try {
      await Promise.all(iconPromises)
    } catch (error) {
      console.error("Error loading runner icons:", error)
    }
  }

  // Get icon for display (returns Viberunner logo fallback if no custom icon)
  public getAppIcon(runner: RunnerConfig): string {
    if (this.state.runnerIcons[runner.id]) {
      return this.state.runnerIcons[runner.id]
    }

    // Return Viberunner SVG logo as fallback
    return getViberunnerLogoPath()
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
        error: null,
      })
      console.log(
        `RunnerService: Successfully refreshed ${runners.length} runners`
      )

      // Load icons for all runners after loading runners
      await this.loadAllRunnerIcons()
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      console.error("RunnerService: Failed to refresh runners:", error)
      this.setState({
        isLoading: false,
        error: errorMessage,
      })
    }
  }

  // Initialize the service (call this once at app startup)
  public async initialize(): Promise<void> {
    console.log("RunnerService: Initializing...")
    await this.refresh()

    // Load startup runner preferences
    const startupRunners = await this.loadStartupRunners()
    this.setState({ startupRunners })
  }

  // Load a specific app bundle and config
  public async loadApp(
    id: string
  ): Promise<{ bundleContent: string; config: any }> {
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
    return this.state.runners.find((runner) => runner.id === id)
  }

  // Find runners by criteria
  public findRunners(
    predicate: (runner: RunnerConfig) => boolean
  ): RunnerConfig[] {
    return this.state.runners.filter(predicate)
  }

  // Get standalone runners
  public getStandaloneRunners(): RunnerConfig[] {
    return this.state.runners.filter((runner) => runner.standalone)
  }

  // Get contextual runners (non-standalone)
  public getContextualRunners(): RunnerConfig[] {
    return this.state.runners.filter((runner) => !runner.standalone)
  }

  // Find matching runners for a file
  public async findMatchingRunners(
    filePath: string
  ): Promise<Array<{ runner: RunnerConfig; priority: number }>> {
    const runners = this.state.runners
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
}

// Export singleton instance for easy access
export const runnerService = RunnerService.getInstance()
