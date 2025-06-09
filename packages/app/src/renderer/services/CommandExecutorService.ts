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
        return process.env.SHELL ?? "/bin/sh"
      })()

      console.log("🐚 Using shell for PATH detection:", defaultShell)

      // Execute shell to get PATH asynchronously
      const { exec } = require("child_process")
      exec(
        `${defaultShell} -ilc 'echo $PATH'`,
        {
          encoding: "utf8",
          timeout: 5000,
          env: { DISABLE_AUTO_UPDATE: "true" },
        },
        (error: any, stdout: string, _stderr: string) => {
          if (error) {
            console.warn("🐚 Failed to get shell PATH:", error)
            resolve(process.env.PATH)
            return
          }

          const shellPath = stdout.toString().trim()
          console.log("🐚 Shell PATH detected:", shellPath.substring(0, 100) + "...")
          resolve(shellPath)
        }
      )
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

  const shellPath = await getShellPath()
  if (shellPath && shellPath !== process.env.PATH) {
    process.env.PATH = shellPath
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

    try {
      console.log("Fix render before", new Date().toISOString())
      // Fix PATH in renderer process
      await fixRendererPath()
      console.log("Fix render after", new Date().toISOString())

      // Use the (now fixed) process environment
      Object.keys(process.env).forEach((key) => {
        const value = process.env[key]
        if (value !== undefined) {
          this.userEnvironment[key] = value
        }
      })

      console.log("🔍 Final PATH:", this.userEnvironment.PATH)
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
    }

    console.log(
      "User environment initialized. PATH length:",
      this.userEnvironment.PATH?.split(path.delimiter).length || 0
    )
    console.log(
      "First few PATH entries:",
      this.userEnvironment.PATH?.split(path.delimiter).slice(0, 3) || "not set"
    )
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

        // Always use shell execution for consistent behavior
        const spawnOptions = {
          cwd,
          shell: true,
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
          resolve({
            success,
            output: stdout || (success ? "Command completed successfully" : ""),
            error: success
              ? undefined
              : stderr || `Command exited with code ${code}`,
          })
        })

        child.on("error", (error: Error) => {
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
