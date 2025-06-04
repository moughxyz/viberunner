import { getRunnersDirectory } from '../util'
import { FileChange } from '../components/AIAgentInterface'

const fs = require('fs')
const path = require('path')

export class FileManagerService {
  private runnersDir: string

  constructor() {
    this.runnersDir = getRunnersDirectory()

    // Ensure the runners directory exists
    if (!fs.existsSync(this.runnersDir)) {
      fs.mkdirSync(this.runnersDir, { recursive: true })
    }
  }

  async createRunner(runnerName: string, files: Record<string, FileChange>): Promise<string> {
    try {
      // Sanitize runner name and ensure uniqueness
      const sanitizedName = this.sanitizeRunnerName(runnerName)
      const uniqueName = this.ensureUniqueRunnerName(sanitizedName)
      const runnerPath = path.join(this.runnersDir, uniqueName)

      // Create runner directory
      fs.mkdirSync(runnerPath, { recursive: true })

      // Create src directory if needed
      const srcPath = path.join(runnerPath, 'src')
      fs.mkdirSync(srcPath, { recursive: true })

      // Write all files
      for (const [filePath, fileData] of Object.entries(files)) {
        const fullFilePath = path.join(runnerPath, filePath)

        // Ensure directory exists for this file
        const fileDir = path.dirname(fullFilePath)
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true })
        }

        // Write file content
        fs.writeFileSync(fullFilePath, fileData.content, 'utf8')
        console.log(`Created file: ${fullFilePath}`)
      }

      // Ensure we have a package.json with viberunner metadata
      const packageJsonPath = path.join(runnerPath, 'package.json')
      if (!fs.existsSync(packageJsonPath)) {
        // Extract metadata from files if available, or create default
        const defaultPackageJson = this.createDefaultPackageJson(uniqueName)
        fs.writeFileSync(packageJsonPath, JSON.stringify(defaultPackageJson, null, 2), 'utf8')
      } else {
        // Update existing package.json to ensure it has viberunner metadata
        this.ensureViberunnerMetadata(packageJsonPath, uniqueName)
      }

      // Create other required files if they don't exist
      await this.ensureRequiredFiles(runnerPath, uniqueName)

      console.log(`Successfully created runner: ${uniqueName} at ${runnerPath}`)
      return uniqueName

    } catch (error) {
      console.error('Error creating runner:', error)
      throw error
    }
  }

  async updateRunner(runnerName: string, files: Record<string, FileChange>): Promise<string> {
    try {
      const runnerPath = path.join(this.runnersDir, runnerName)

      // Check if runner exists
      if (!fs.existsSync(runnerPath)) {
        throw new Error(`Runner "${runnerName}" does not exist`)
      }

      // Create src directory if needed
      const srcPath = path.join(runnerPath, 'src')
      if (!fs.existsSync(srcPath)) {
        fs.mkdirSync(srcPath, { recursive: true })
      }

      // Write/update all files
      for (const [filePath, fileData] of Object.entries(files)) {
        const fullFilePath = path.join(runnerPath, filePath)

        // Ensure directory exists for this file
        const fileDir = path.dirname(fullFilePath)
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true })
        }

        // Write file content
        fs.writeFileSync(fullFilePath, fileData.content, 'utf8')
        console.log(`Updated file: ${fullFilePath}`)
      }

      // Ensure we have a package.json with viberunner metadata
      const packageJsonPath = path.join(runnerPath, 'package.json')
      if (!fs.existsSync(packageJsonPath)) {
        // Create default package.json if it doesn't exist
        const defaultPackageJson = this.createDefaultPackageJson(runnerName)
        fs.writeFileSync(packageJsonPath, JSON.stringify(defaultPackageJson, null, 2), 'utf8')
      } else {
        // Update existing package.json to ensure it has viberunner metadata
        this.ensureViberunnerMetadata(packageJsonPath, runnerName)
      }

      // Create other required files if they don't exist
      await this.ensureRequiredFiles(runnerPath, runnerName)

      console.log(`Successfully updated runner: ${runnerName} at ${runnerPath}`)
      return runnerName

    } catch (error) {
      console.error('Error updating runner:', error)
      throw error
    }
  }

  private sanitizeRunnerName(name: string): string {
    // Convert to lowercase, replace spaces with hyphens, remove special characters
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50) // Limit length
      || `runner-${Date.now()}`
  }

  private createDefaultPackageJson(runnerName: string) {
    return {
      name: `viberunner-${runnerName}`,
      version: "1.0.0",
      description: `AI-generated runner: ${runnerName}`,
      main: "dist/bundle.js",
      viberunner: {
        name: runnerName.split('-').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        description: `AI-generated runner: ${runnerName}`,
        version: "1.0.0",
        standalone: true,
        author: "AI Assistant"
      },
      scripts: {
        build: "vite build",
        dev: "vite"
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0"
      },
      devDependencies: {
        "@types/node": "^22.15.29",
        "@types/react": "^18.2.64",
        "@types/react-dom": "^18.2.21",
        "@vitejs/plugin-react": "^4.2.1",
        typescript: "^5.2.2",
        vite: "^5.1.6"
      }
    }
  }

  private ensureViberunnerMetadata(packageJsonPath: string, runnerName: string) {
    try {
      const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8')
      const packageJson = JSON.parse(packageJsonContent)

      // Ensure viberunner metadata exists
      if (!packageJson.viberunner) {
        packageJson.viberunner = {
          name: runnerName.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          description: `AI-generated runner: ${runnerName}`,
          version: "1.0.0",
          standalone: true,
          author: "AI Assistant"
        }

        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8')
      }
    } catch (error) {
      console.error('Error updating package.json metadata:', error)
    }
  }

  private async ensureRequiredFiles(runnerPath: string, runnerName: string) {
    // Ensure tsconfig.json exists
    const tsconfigPath = path.join(runnerPath, 'tsconfig.json')
    if (!fs.existsSync(tsconfigPath)) {
      const tsconfig = {
        compilerOptions: {
          target: "ES2020",
          useDefineForClassFields: true,
          lib: ["ES2020", "DOM", "DOM.Iterable"],
          module: "ESNext",
          skipLibCheck: true,
          moduleResolution: "bundler",
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: "react-jsx",
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true
        },
        include: ["src"],
        references: [{ path: "./tsconfig.node.json" }]
      }
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), 'utf8')
    }

    // Ensure tsconfig.node.json exists
    const tsconfigNodePath = path.join(runnerPath, 'tsconfig.node.json')
    if (!fs.existsSync(tsconfigNodePath)) {
      const tsconfigNode = {
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: "ESNext",
          moduleResolution: "bundler",
          allowSyntheticDefaultImports: true
        },
        include: ["vite.config.ts"]
      }
      fs.writeFileSync(tsconfigNodePath, JSON.stringify(tsconfigNode, null, 2), 'utf8')
    }

    // Ensure vite.config.ts exists
    const viteConfigPath = path.join(runnerPath, 'vite.config.ts')
    if (!fs.existsSync(viteConfigPath)) {
      const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    'process.env': {},
    'global': 'window'
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/App.tsx'),
      name: '${runnerName.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('')}Runner',
      fileName: 'bundle',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        format: 'iife',
        name: '${runnerName.split('-').map(word =>
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join('')}Runner',
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});`
      fs.writeFileSync(viteConfigPath, viteConfig, 'utf8')
    }
  }

  private ensureUniqueRunnerName(baseName: string): string {
    // If the base name doesn't exist, use it as-is
    let candidateName = baseName
    let candidatePath = path.join(this.runnersDir, candidateName)

    if (!fs.existsSync(candidatePath)) {
      return candidateName
    }

    // Generate a unique ID and append it
    const uniqueId = this.generateUniqueId()
    candidateName = `${baseName}-${uniqueId}`
    candidatePath = path.join(this.runnersDir, candidateName)

    // Double-check uniqueness (very unlikely to collide but just in case)
    while (fs.existsSync(candidatePath)) {
      const anotherUniqueId = this.generateUniqueId()
      candidateName = `${baseName}-${anotherUniqueId}`
      candidatePath = path.join(this.runnersDir, candidateName)
    }

    return candidateName
  }

  private generateUniqueId(): string {
    // Generate a short unique ID using timestamp + random string
    const timestamp = Date.now().toString(36) // Base36 timestamp
    const randomPart = Math.random().toString(36).substring(2, 6) // 4 random chars
    return `${timestamp}${randomPart}`
  }

  // List all runners
  async listRunners(): Promise<string[]> {
    try {
      const entries = fs.readdirSync(this.runnersDir)
      return entries.filter((entry: string) => {
        const entryPath = path.join(this.runnersDir, entry)
        return fs.statSync(entryPath).isDirectory()
      })
    } catch (error) {
      console.error('Error listing runners:', error)
      return []
    }
  }

  // Delete a runner
  async deleteRunner(runnerName: string): Promise<void> {
    try {
      const runnerPath = path.join(this.runnersDir, runnerName)
      if (fs.existsSync(runnerPath)) {
        fs.rmSync(runnerPath, { recursive: true, force: true })
        console.log(`Deleted runner: ${runnerName}`)
      }
    } catch (error) {
      console.error('Error deleting runner:', error)
      throw error
    }
  }
}