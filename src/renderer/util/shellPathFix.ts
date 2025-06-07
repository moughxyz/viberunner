const { execSync } = require("child_process")
const { userInfo } = require("os")

// Simple shell environment detection for renderer process
function getShellPath(): string | undefined {
  if (process.platform === "win32") {
    return process.env.PATH
  }

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

    // Execute shell to get PATH
    const result = execSync(`${defaultShell} -ilc 'echo $PATH'`, {
      encoding: "utf8",
      timeout: 5000,
      env: { DISABLE_AUTO_UPDATE: "true" },
    })

    const shellPath = result.toString().trim()
    console.log("🐚 Shell PATH detected:", shellPath.substring(0, 100) + "...")
    return shellPath
  } catch (error) {
    console.warn("🐚 Failed to get shell PATH:", error)
    return process.env.PATH
  }
}

export function fixRendererPath(): void {
  if (process.platform === "win32") {
    return
  }

  const shellPath = getShellPath()
  if (shellPath && shellPath !== process.env.PATH) {
    console.log("🔧 Fixing renderer PATH...")
    console.log("🔧 Before:", process.env.PATH)
    process.env.PATH = shellPath
    console.log("🔧 After:", process.env.PATH?.substring(0, 100) + "...")
  }
}

export { getShellPath }
