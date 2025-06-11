import { getRunnersDirectory } from "../util"
import type { App } from "electron"

const fs = require("fs")
const path = require("path")
const { spawn } = require("child_process")
const { userInfo } = require("os")

// Simple shell environment detection for renderer process
async function getShellPath(): Promise<string | undefined> {
  if (process.platform === "win32") {
    return process.env.PATH
  }

  return new Promise((resolve) => {
    try {
      // Get user's shell
      const defaultShell = (() => {
        try {
          const { shell } = userInfo()
          if (shell) return shell
        } catch {
          // Ignore userInfo errors
        }
        if (process.platform === "darwin") {
          return process.env.SHELL ?? "/bin/zsh"
        }
        return process.env.SHELL ?? "/bin/bash"
      })()

      console.log("🐚 Using shell for PATH detection:", defaultShell)

      // Execute shell to get PATH asynchronously
      const { exec } = require("child_process")

      // Create environment that preserves existing environment but adds our disable flag
      const execEnv = {
        ...process.env,
        DISABLE_AUTO_UPDATE: "true",
      }

      // Try different approaches to get the full shell PATH
      const attempts = [
        // First try: Interactive login shell (should load all profile files)
        `${defaultShell} -ilc 'echo $PATH'`,
        // Second try: Login shell with explicit profile sourcing
        `${defaultShell} -lc 'source ~/.bash_profile 2>/dev/null || source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || true; echo $PATH'`,
        // Third try: Just login shell
        `${defaultShell} -lc 'echo $PATH'`,
        // Fourth try: Try to source common profile files explicitly
        `${defaultShell} -c 'source ~/.nvm/nvm.sh 2>/dev/null || true; source ~/.bash_profile 2>/dev/null || source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || true; echo $PATH'`,
      ]

      let attemptIndex = 0

      const tryNextAttempt = () => {
        if (attemptIndex >= attempts.length) {
          console.warn("🐚 All PATH detection attempts failed, using process.env.PATH")
          resolve(process.env.PATH)
          return
        }

        const command = attempts[attemptIndex]
        console.log(`🐚 Attempting PATH detection ${attemptIndex + 1}/${attempts.length}: ${command}`)

        exec(
          command,
          {
            encoding: "utf8",
            timeout: 10000,
            env: execEnv,
          },
          (error: any, stdout: string, stderr: string) => {
            if (error) {
              console.warn(`🐚 Attempt ${attemptIndex + 1} failed:`, error)
              console.warn(`🐚 stderr:`, stderr)
              attemptIndex++
              tryNextAttempt()
              return
            }

            const shellPath = stdout.toString().trim()
            console.log(`🐚 Attempt ${attemptIndex + 1} succeeded! PATH detected:`, shellPath)

            // Check if this PATH looks more complete (has more entries)
            const pathEntries = shellPath.split(path.delimiter).length
            const currentPathEntries = (process.env.PATH || "").split(path.delimiter).length

            console.log(`🐚 New PATH has ${pathEntries} entries, current has ${currentPathEntries} entries`)

            if (pathEntries > currentPathEntries || shellPath.includes('nvm') || shellPath.includes('node')) {
              console.log("🐚 Using detected PATH (better than current)")
              resolve(shellPath)
            } else {
              console.log("🐚 Detected PATH doesn't look better, trying next approach")
              attemptIndex++
              tryNextAttempt()
            }
          }
        )
      }

      tryNextAttempt()
    } catch (error) {
      console.warn("🐚 Failed to get shell PATH:", error)
      resolve(process.env.PATH)
    }
  })
}

/**
 * This function can run in the renderer process, but only if fixPath() is run in the main process.
 * So be sure to keep both.
 */
async function fixRendererPath(): Promise<void> {
  if (process.platform === "win32") {
    return
  }

  console.log("🐚 Starting fixRendererPath...")
  console.log("🐚 Current process.env.HOME:", process.env.HOME)
  console.log("🐚 Current process.env.USER:", process.env.USER)
  console.log("🐚 Current process.env.SHELL:", process.env.SHELL)

  const shellPath = await getShellPath()
  console.log("🐚 getShellPath returned:", shellPath)

  if (shellPath && shellPath !== process.env.PATH) {
    console.log("🐚 Updating PATH from getShellPath result")
    process.env.PATH = shellPath
  } else {
    console.log("🐚 Not updating PATH - either no shellPath or same as current")
  }
}

export class CommandExecutorService {
  private runnersDir: string
  private userEnvironment: Record<string, string> = {}
  private initializationPromise: Promise<void>

  constructor() {
    this.runnersDir = getRunnersDirectory()
    console.log("is packaged", this.isPackaged())

    // Initialize user environment
    this.initializationPromise = this.initializeUserEnvironment()
  }

  private isPackaged(): boolean {
    try {
      const { app }: { app: App } = require("@electron/remote")
      return app.isPackaged || false
    } catch (error) {
      // Fallback detection
      return !!(
        process.mainModule &&
        process.mainModule.filename.indexOf("app.asar") !== -1
      )
    }
  }

  private async initializeUserEnvironment(): Promise<void> {
    console.log("Initializing user environment...")
    console.log("🔍 Initial process.env.PATH:", process.env.PATH)
    console.log("🔍 Initial process.env.HOME:", process.env.HOME)
    console.log("🔍 Initial process.env.USER:", process.env.USER)

    // Get HOME directory - try multiple approaches
    const homeDir = process.env.HOME || process.env.USERPROFILE || (() => {
      try {
        const os = require('os')
        return os.homedir()
      } catch {
        return ""
      }
    })()

    const userName = process.env.USER || process.env.USERNAME || (() => {
      try {
        const os = require('os')
        return os.userInfo().username
      } catch {
        return ""
      }
    })()

    console.log("🔍 Detected HOME:", homeDir)
    console.log("🔍 Detected USER:", userName)

    // Start with essential environment variables that should always be preserved
    this.userEnvironment = {
      HOME: homeDir,
      USER: userName,
      LOGNAME: process.env.LOGNAME || userName,
      TMPDIR: process.env.TMPDIR || "/tmp",
      LANG: process.env.LANG || "en_US.UTF-8",
      LC_ALL: process.env.LC_ALL || "",
      TERM: process.env.TERM || "xterm-256color",
    }

    try {
      console.log("Fix render before PATH:", process.env.PATH?.split(path.delimiter).length, "entries")
      // Fix PATH in renderer process
      await fixRendererPath()
      console.log("Fix render after PATH:", process.env.PATH?.split(path.delimiter).length, "entries")
      console.log("🔍 Updated process.env.PATH:", process.env.PATH)

      // Use the (now fixed) process environment
      Object.keys(process.env).forEach((key) => {
        const value = process.env[key]
        if (value !== undefined) {
          this.userEnvironment[key] = value
        }
      })

      // Ensure HOME and USER are set from our detection
      this.userEnvironment.HOME = homeDir
      this.userEnvironment.USER = userName

      console.log("🔍 Final PATH:", this.userEnvironment.PATH)
      console.log("🔍 PATH entries containing 'npm':",
        this.userEnvironment.PATH?.split(path.delimiter)
          .filter(p => p.includes('npm') || p.includes('node') || p.includes('nvm')) || []
      )
    } catch (error) {
      console.warn(
        "⚠️ Failed to get shell environment, using process.env:",
        error
      )

      // Fallback to copying process.env
      Object.keys(process.env).forEach((key) => {
        const value = process.env[key]
        if (value !== undefined) {
          this.userEnvironment[key] = value
        }
      })

      // Ensure HOME and USER are set from our detection
      this.userEnvironment.HOME = homeDir
      this.userEnvironment.USER = userName

      console.log("🔍 Fallback PATH:", this.userEnvironment.PATH)
    }

    // Add common Node.js/NVM paths if they're missing and exist on the filesystem
    if (homeDir) {
      const commonNodePaths = [
        `${homeDir}/.nvm/versions/node/v22.16.0/bin`,
        `${homeDir}/.nvm/versions/node/v20.0.0/bin`,
        `${homeDir}/.nvm/versions/node/v18.0.0/bin`,
        `/usr/local/bin`,
        `/opt/homebrew/bin`,
        `/usr/bin`,
      ]

      const currentPaths = (this.userEnvironment.PATH || "").split(path.delimiter)
      const missingPaths: string[] = []

      commonNodePaths.forEach(nodePath => {
        if (!currentPaths.includes(nodePath)) {
          try {
            const fs = require('fs')
            if (fs.existsSync(nodePath)) {
              missingPaths.push(nodePath)
              console.log("🔍 Found missing Node.js path:", nodePath)
            }
          } catch (error) {
            // Ignore filesystem errors
          }
        }
      })

      if (missingPaths.length > 0) {
        console.log("🔍 Adding missing Node.js paths:", missingPaths)
        this.userEnvironment.PATH = [...missingPaths, ...currentPaths].join(path.delimiter)
      }
    }

    console.log(
      "User environment initialized. PATH length:",
      this.userEnvironment.PATH?.split(path.delimiter).length || 0
    )
    console.log(
      "First few PATH entries:",
      this.userEnvironment.PATH?.split(path.delimiter).slice(0, 5) || "not set"
    )

    // Additional debugging: check if npm is in PATH
    const pathEntries = this.userEnvironment.PATH?.split(path.delimiter) || []
    const nvmPaths = pathEntries.filter(p => p.includes('nvm'))
    console.log("🔍 NVM paths found:", nvmPaths)
    console.log("🔍 HOME:", this.userEnvironment.HOME)
    console.log("🔍 USER:", this.userEnvironment.USER)
    console.log("🔍 Total environment variables:", Object.keys(this.userEnvironment).length)
  }

  async executeCommand(
    command: string,
    runnerName?: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      console.log("Executing command:", command)

      const trimmedCommand = command.trim()

      if (trimmedCommand.startsWith("npm run build")) {
        return await this.executeBuildCommand(runnerName)
      } else if (trimmedCommand.startsWith("npm install")) {
        return await this.executeInstallCommand(runnerName)
      } else {
        return await this.executeShellCommand(trimmedCommand, runnerName)
      }
    } catch (error) {
      console.error("Error executing command:", error)
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  async executeCommandWithArgs(
    executable: string,
    args: string[] = [],
    runnerName?: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      console.log("Executing command with args:", executable, args)

      // Build command string for shell execution
      const quotedArgs = args.map((arg) => {
        if (arg.includes(" ") || arg.includes('"') || arg.includes("'")) {
          return `"${arg.replace(/"/g, '\\"')}"`
        }
        return arg
      })
      const command = [executable, ...quotedArgs].join(" ")

      return await this.executeShellCommand(command, runnerName)
    } catch (error) {
      console.error("Error executing command with args:", error)
      return {
        success: false,
        output: "",
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  private executeShellCommand(
    command: string,
    runnerName?: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      // Wait for environment initialization
      const executeWhenReady = () => {
        const cwd = runnerName
          ? path.join(this.runnersDir, runnerName)
          : this.runnersDir

        console.log("Executing shell command:", {
          command,
          cwd,
          isPackaged: this.isPackaged(),
        })

        // Get the user's shell for better compatibility
        const userShell = (() => {
          try {
            const { shell } = userInfo()
            if (shell) return shell
          } catch {
            // Ignore userInfo errors
          }
          if (process.platform === "darwin") {
            return process.env.SHELL ?? "/bin/zsh"
          }
          return process.env.SHELL ?? "/bin/bash"
        })()

        console.log("🐚 Using shell for command execution:", userShell)
        console.log("🔍 PATH being used:", this.userEnvironment.PATH?.split(path.delimiter).slice(0, 5))
        console.log("🔍 Environment variables count:", Object.keys(this.userEnvironment).length)

        // Use the user's shell directly instead of default shell
        const spawnOptions = {
          cwd,
          shell: userShell,
          stdio: ["pipe", "pipe", "pipe"] as const,
          env: this.userEnvironment,
        }

        const child = spawn(command, [], spawnOptions)

        let stdout = ""
        let stderr = ""

        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString()
        })

        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString()
        })

        child.on("close", (code: number) => {
          const success = code === 0
          console.log(`Command "${command}" finished with code ${code}`)
          if (!success) {
            console.log("Command stderr:", stderr)
          }
          resolve({
            success,
            output: stdout || (success ? "Command completed successfully" : ""),
            error: success
              ? undefined
              : stderr || `Command exited with code ${code}`,
          })
        })

        child.on("error", (error: Error) => {
          console.error("Child process error:", error)
          resolve({
            success: false,
            output: "",
            error: `Failed to execute command: ${error.message}`,
          })
        })
      }

      // Wait for initialization to complete
      this.initializationPromise
        .then(() => {
          executeWhenReady()
        })
        .catch((error) => {
          console.error("Initialization failed:", error)
          executeWhenReady()
        })
    })
  }

  private async executeBuildCommand(
    runnerName?: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    if (!runnerName) {
      return {
        success: false,
        output: "",
        error: "Runner name is required for build command",
      }
    }

    try {
      const runnerPath = path.join(this.runnersDir, runnerName)

      if (!fs.existsSync(runnerPath)) {
        return {
          success: false,
          output: "",
          error: `Runner directory not found: ${runnerPath}`,
        }
      }

      const packageJsonPath = path.join(runnerPath, "package.json")
      if (!fs.existsSync(packageJsonPath)) {
        return {
          success: false,
          output: "",
          error: "package.json not found in runner directory",
        }
      }

      return await this.executeShellCommand("npm run build", runnerName)
    } catch (error) {
      return {
        success: false,
        output: "",
        error: `Build failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }
    }
  }

  private async executeInstallCommand(
    runnerName?: string
  ): Promise<{ success: boolean; output: string; error?: string }> {
    if (!runnerName) {
      return {
        success: false,
        output: "",
        error: "Runner name is required for install command",
      }
    }

    try {
      const runnerPath = path.join(this.runnersDir, runnerName)

      if (!fs.existsSync(runnerPath)) {
        return {
          success: false,
          output: "",
          error: `Runner directory not found: ${runnerPath}`,
        }
      }

      return await this.executeShellCommand("npm install", runnerName)
    } catch (error) {
      return {
        success: false,
        output: "",
        error: `Install failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      }
    }
  }

  async getAvailableRunners(): Promise<string[]> {
    try {
      if (!fs.existsSync(this.runnersDir)) {
        return []
      }

      const entries = fs.readdirSync(this.runnersDir)
      return entries.filter((entry: string) => {
        const entryPath = path.join(this.runnersDir, entry)
        return fs.statSync(entryPath).isDirectory()
      })
    } catch (error) {
      console.error("Error getting available runners:", error)
      return []
    }
  }
}
