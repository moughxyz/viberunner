import { getRunnersDirectory } from '../util'

const fs = require('fs')
const path = require('path')
const { spawn, exec } = require('child_process')
const os = require('os')

export class CommandExecutorService {
  private runnersDir: string
  private systemPaths: string[] = []

  constructor() {
    this.runnersDir = getRunnersDirectory()
    this.initializeSystemPaths()
  }

  private isPackaged(): boolean {
    try {
      const { app } = require('@electron/remote')
      return app.isPackaged || false
    } catch (error) {
      // Fallback detection
      return !!(process.mainModule && process.mainModule.filename.indexOf('app.asar') !== -1)
    }
  }

  private async initializeSystemPaths(): Promise<void> {
    // Try to discover the user's actual PATH
    const commonPaths = [
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      '/opt/homebrew/bin', // Apple Silicon Homebrew
      '/usr/local/sbin',
      '/usr/sbin',
      '/sbin'
    ]

    if (process.platform === 'darwin') {
      // macOS specific paths
      commonPaths.push(
        '/System/Library/Frameworks/Python.framework/Versions/Current/bin',
        '/Library/Frameworks/Python.framework/Versions/Current/bin',
        '/opt/local/bin', // MacPorts
        '/usr/local/go/bin',
        path.join(os.homedir(), '.cargo/bin'), // Rust
        path.join(os.homedir(), 'go/bin'), // Go
        path.join(os.homedir(), '.local/bin'), // Local binaries
        path.join(os.homedir(), 'bin')
      )
    } else if (process.platform === 'win32') {
      // Windows paths
      commonPaths.push(
        'C:\\Windows\\System32',
        'C:\\Windows',
        'C:\\Program Files\\Git\\bin',
        'C:\\Program Files\\nodejs',
        'C:\\Program Files (x86)\\Git\\bin'
      )
    }

    // Filter to only existing paths
    this.systemPaths = commonPaths.filter(p => {
      try {
        return fs.existsSync(p)
      } catch {
        return false
      }
    })

    // Try to get the actual user PATH if possible
    if (this.isPackaged()) {
      try {
        await this.getUserPath()
      } catch (error) {
        console.warn('Could not get user PATH:', error)
      }
    }
  }

    private async getUserPath(): Promise<void> {
    return new Promise((resolve) => {
      // Try to get the user's actual PATH by running their shell
      const shell = process.env.SHELL || '/bin/bash'

      exec(`${shell} -l -c 'echo $PATH'`, (error: any, stdout: any, _stderr: any) => {
        if (!error && stdout) {
          const userPaths = stdout.trim().split(':').filter((p: any) => p && fs.existsSync(p))
          // Merge with our discovered paths, user paths take priority
          this.systemPaths = [...new Set([...userPaths, ...this.systemPaths])]
          console.log('Discovered user PATH:', this.systemPaths)
        }
        resolve()
      })
    })
  }

  private findExecutable(command: string): string {
    // If it's an absolute path, use it directly
    if (path.isAbsolute(command)) {
      return fs.existsSync(command) ? command : command
    }

    // If not packaged, try the command as-is first
    if (!this.isPackaged()) {
      return command
    }

    // Search in our known paths
    for (const searchPath of this.systemPaths) {
      const fullPath = path.join(searchPath, command)
      if (fs.existsSync(fullPath)) {
        console.log(`Found executable: ${fullPath}`)
        return fullPath
      }

      // Also try with common extensions on Windows
      if (process.platform === 'win32') {
        for (const ext of ['.exe', '.cmd', '.bat']) {
          const fullPathWithExt = fullPath + ext
          if (fs.existsSync(fullPathWithExt)) {
            console.log(`Found executable: ${fullPathWithExt}`)
            return fullPathWithExt
          }
        }
      }
    }

    // Special handling for common commands
    if (command === 'npm' || command === 'node') {
      const nodeResult = this.findNodeExecutable(command)
      if (nodeResult) return nodeResult
    }

    // If we can't find it, return original command and let spawn handle it
    console.warn(`Could not find executable for: ${command}`)
    return command
  }

  private findNodeExecutable(command: string): string | null {
    const nodePath = process.execPath
    const nodeDir = path.dirname(nodePath)

    if (command === 'node') {
      return nodePath
    }

    if (command === 'npm') {
      // Look for npm in various locations relative to Node.js
      const npmLocations = [
        path.join(nodeDir, 'npm'),
        path.join(nodeDir, 'npm.cmd'),
        path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
        path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js')
      ]

      for (const npmPath of npmLocations) {
        if (fs.existsSync(npmPath)) {
          // If it's the JS file, we need to run it through Node
          if (npmPath.endsWith('.js')) {
            return `${nodePath} ${npmPath}`
          }
          return npmPath
        }
      }
    }

    return null
  }

    private createEnvironment(): Record<string, string> {
    const env: Record<string, string> = {}

    // Copy process.env, filtering out undefined values
    Object.keys(process.env).forEach(key => {
      const value = process.env[key]
      if (value !== undefined) {
        env[key] = value
      }
    })

    if (this.isPackaged() && this.systemPaths.length > 0) {
      // Restore a more complete PATH in packaged apps
      env.PATH = this.systemPaths.join(process.platform === 'win32' ? ';' : ':')

      // Add some helpful environment variables
      env.NODE_PATH = path.join(path.dirname(process.execPath), 'node_modules')

      // Ensure we have a HOME directory
      if (!env.HOME && process.platform !== 'win32') {
        env.HOME = os.homedir()
      }
    }

    return env
  }

  async executeCommand(command: string, runnerName?: string): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      console.log('Executing command:', command)

      // Parse the command
      const trimmedCommand = command.trim()

      if (trimmedCommand.startsWith('npm run build')) {
        return await this.executeBuildCommand(runnerName)
      } else if (trimmedCommand.startsWith('npm install')) {
        return await this.executeInstallCommand(runnerName)
      } else {
        // For other commands, execute them with our enhanced shell command
        return await this.executeShellCommand(trimmedCommand, runnerName)
      }

    } catch (error) {
      console.error('Error executing command:', error)
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  private executeShellCommand(command: string, runnerName?: string): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const cwd = runnerName ? path.join(this.runnersDir, runnerName) : this.runnersDir

      // Enhanced command parsing and execution
      const parts = command.split(' ')
      const executable = parts[0]
      const args = parts.slice(1)

      // Find the actual executable
      const resolvedExecutable = this.findExecutable(executable)

      // Handle special case where we returned a compound command (like "node npm-cli.js")
      let finalCommand: string
      let finalArgs: string[]

      if (resolvedExecutable.includes(' ')) {
        const compoundParts = resolvedExecutable.split(' ')
        finalCommand = compoundParts[0]
        finalArgs = [...compoundParts.slice(1), ...args]
      } else {
        finalCommand = resolvedExecutable
        finalArgs = args
      }

      const env = this.createEnvironment()

      console.log('Executing shell command:', {
        originalCommand: command,
        finalCommand,
        finalArgs,
        cwd,
        isPackaged: this.isPackaged(),
        pathCount: this.systemPaths.length
      })

      // Choose execution method based on packaging status
      const spawnOptions: any = {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'] as const,
        env
      }

      // In development or for simple commands, we can use shell
      if (!this.isPackaged() || process.platform === 'win32') {
        spawnOptions.shell = true
      }

      const child = spawn(finalCommand, finalArgs, spawnOptions)

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString()
      })

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString()
      })

      child.on('close', (code: number) => {
        const success = code === 0
        resolve({
          success,
          output: stdout || (success ? 'Command completed successfully' : ''),
          error: success ? undefined : (stderr || `Command exited with code ${code}`)
        })
      })

      child.on('error', (error: Error) => {
        // If we get ENOENT, try one more time with shell
        if (error.message.includes('ENOENT') && !spawnOptions.shell) {
          console.log('Retrying with shell due to ENOENT')

          const retryChild = spawn(command, [], {
            cwd,
            shell: true,
            stdio: ['pipe', 'pipe', 'pipe'],
            env
          })

          let retryStdout = ''
          let retryStderr = ''

          retryChild.stdout.on('data', (data: Buffer) => {
            retryStdout += data.toString()
          })

          retryChild.stderr.on('data', (data: Buffer) => {
            retryStderr += data.toString()
          })

          retryChild.on('close', (retryCode: number) => {
            const retrySuccess = retryCode === 0
            resolve({
              success: retrySuccess,
              output: retryStdout || (retrySuccess ? 'Command completed successfully' : ''),
              error: retrySuccess ? undefined : (retryStderr || `Command exited with code ${retryCode}`)
            })
          })

          retryChild.on('error', (retryError: Error) => {
            resolve({
              success: false,
              output: '',
              error: `Failed to execute command: ${retryError.message}`
            })
          })
        } else {
          resolve({
            success: false,
            output: '',
            error: `Failed to execute command: ${error.message}`
          })
        }
      })
    })
  }

  private async executeBuildCommand(runnerName?: string): Promise<{ success: boolean; output: string; error?: string }> {
    if (!runnerName) {
      return {
        success: false,
        output: '',
        error: 'Runner name is required for build command'
      }
    }

    try {
      const runnerPath = path.join(this.runnersDir, runnerName)

      if (!fs.existsSync(runnerPath)) {
        return {
          success: false,
          output: '',
          error: `Runner directory not found: ${runnerPath}`
        }
      }

      // Check if package.json exists
      const packageJsonPath = path.join(runnerPath, 'package.json')
      if (!fs.existsSync(packageJsonPath)) {
        return {
          success: false,
          output: '',
          error: 'package.json not found in runner directory'
        }
      }

      // Execute build command using Node.js child_process
      const result = await this.executeShellCommand('npm run build', runnerName)

      if (!result.success) {
        // If build fails, create a basic fallback bundle for development
        console.warn('Build failed, creating fallback bundle for development')
        const distPath = path.join(runnerPath, 'dist')
        if (!fs.existsSync(distPath)) {
          fs.mkdirSync(distPath, { recursive: true })
        }

        // Create a mock bundle file
        const bundlePath = path.join(distPath, 'bundle.iife.js')
        const mockBundle = `
// Fallback bundle for development (build failed)
(function() {
  console.log('Fallback bundle loaded for ${runnerName}');

  const React = window.React;

  const FallbackRunner = ({ tabId }) => {
    React.useEffect(() => {
      window.registerCleanup && window.registerCleanup(tabId, () => {
        console.log('Cleanup called for ${runnerName}');
      });
    }, [tabId]);

    return React.createElement('div', {
      style: {
        padding: '20px',
        background: '#0a0a0a',
        color: '#ffffff',
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }
    },
      React.createElement('h1', { style: { marginBottom: '16px' } }, 'AI Generated Runner: ${runnerName}'),
      React.createElement('p', { style: { marginBottom: '16px', opacity: 0.7 } }, 'This is a fallback runner (build failed). Check the console for build errors.'),
      React.createElement('pre', {
        style: {
          background: '#1a1a1a',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '12px',
          maxWidth: '600px',
          overflow: 'auto',
          textAlign: 'left'
        }
      }, result.error || 'Unknown build error')
    );
  };

  if (window.__RENDER_RUNNER__) {
    window.__RENDER_RUNNER__(FallbackRunner);
  }
})();
`
        fs.writeFileSync(bundlePath, mockBundle, 'utf8')

        return {
          success: false,
          output: result.output,
          error: `Build failed but fallback bundle created: ${result.error}`
        }
      }

      return result

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  private async executeInstallCommand(runnerName?: string): Promise<{ success: boolean; output: string; error?: string }> {
    if (!runnerName) {
      return {
        success: false,
        output: '',
        error: 'Runner name is required for install command'
      }
    }

    try {
      const runnerPath = path.join(this.runnersDir, runnerName)

      if (!fs.existsSync(runnerPath)) {
        return {
          success: false,
          output: '',
          error: `Runner directory not found: ${runnerPath}`
        }
      }

      // Execute install command using Node.js child_process
      const result = await this.executeShellCommand('npm install', runnerName)
      return result

    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Install failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  // Get available runners for building
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
      console.error('Error getting available runners:', error)
      return []
    }
  }
}