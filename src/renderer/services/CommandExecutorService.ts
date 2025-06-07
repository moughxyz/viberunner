import { getRunnersDirectory } from "../util"
import type { App } from "electron"

const fs = require("fs")
const path = require("path")
const { spawn, exec } = require("child_process")

export class CommandExecutorService {
  private runnersDir: string
  private userEnvironment: Record<string, string> = {}
  private initializationPromise: Promise<void>

  constructor() {
    this.runnersDir = getRunnersDirectory()
    console.log('is packaged', this.isPackaged())

    // Initialize user environment
    this.initializationPromise = this.initializeUserEnvironment()

    // Test npm after initialization
    this.initializationPromise.then(() => {
      this.testNpm()
    }).catch((error) => {
      console.error("Environment initialization failed:", error)
    })
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

    // Start with current process environment
    Object.keys(process.env).forEach((key) => {
      const value = process.env[key]
      if (value !== undefined) {
        this.userEnvironment[key] = value
      }
    })

    // For packaged apps, try to get the user's actual shell environment
    if (this.isPackaged()) {
      try {
        await this.getUserShellEnvironment()
      } catch (error) {
        console.warn("Could not get user shell environment:", error)
      }
    }

    console.log("User environment initialized. PATH length:", this.userEnvironment.PATH?.split(path.delimiter).length || 0)
  }

  private async getUserShellEnvironment(): Promise<void> {
    return new Promise((resolve) => {
      const shell = process.env.SHELL || "/bin/bash"

      // Get both PATH and other important environment variables from user's shell
      const envCommand = `${shell} -l -c 'env'`

      exec(envCommand, (error: any, stdout: any, _stderr: any) => {
        if (!error && stdout) {
          // Parse environment variables from shell output
          const envLines = stdout.trim().split('\n')
          for (const line of envLines) {
            const [key, ...valueParts] = line.split('=')
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=')
              this.userEnvironment[key] = value
            }
          }
          console.log("Loaded user shell environment")
        }
        resolve()
      })
    })
  }

  private async testNpm(): Promise<void> {
    console.log("=== Testing npm functionality ===")

    try {
      // Test basic npm command
      const result = await this.executeShellCommand("npm --version", undefined)

      if (result.success) {
        console.log("✅ npm --version succeeded:", result.output.trim())
      } else {
        console.log("❌ npm --version failed:", result.error)
      }

      // Test npm help command
      const helpResult = await this.executeShellCommand("npm help", undefined)

      if (helpResult.success) {
        console.log("✅ npm help succeeded")
      } else {
        console.log("❌ npm help failed:", helpResult.error)
      }

      // Show environment info
      console.log("🔍 Environment info:")
      console.log("- PATH length:", this.userEnvironment.PATH?.split(path.delimiter).length || 0)
      console.log("- NODE env var:", this.userEnvironment.NODE || "not set")
      console.log("- npm_node_execpath:", this.userEnvironment.npm_node_execpath || "not set")
      console.log("- SHELL:", this.userEnvironment.SHELL || "not set")

    } catch (error) {
      console.log("❌ npm test failed with exception:", error)
    }

    console.log("=== npm test completed ===")
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
      const quotedArgs = args.map(arg => {
        if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
          return `"${arg.replace(/"/g, '\\"')}"`
        }
        return arg
      })
      const command = [executable, ...quotedArgs].join(' ')

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
      this.initializationPromise.then(() => {
        executeWhenReady()
      }).catch((error) => {
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
