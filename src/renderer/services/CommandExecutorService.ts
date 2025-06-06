import { getRunnersDirectory } from '../util'

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

export class CommandExecutorService {
  private runnersDir: string

  constructor() {
    this.runnersDir = getRunnersDirectory()
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
        // For other commands, execute them directly
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

      // Split command into parts
      const parts = command.split(' ')
      const cmd = parts[0]
      const args = parts.slice(1)

      console.log('Executing shell command:', { cmd, args, cwd })

      const child = spawn(cmd, args, {
        cwd,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      })

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
        resolve({
          success: false,
          output: '',
          error: `Failed to execute command: ${error.message}`
        })
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