import { getRunnersDirectory } from "../util"
import { FileChange } from "../components/AIAgentInterface"
import { getCursorPrompt } from "../prompts/cursorPrompt"
import readmeContent from "../../../README.md?raw"
import { runnerService } from "./RunnerService"
import { CommandExecutorService } from "./CommandExecutorService"
import { templateRunnerBuilder } from "./TemplateRunnerBuilder"

const fs = require("fs")
const path = require("path")

export class FileManagerService {
  private runnersDir: string
  private commandExecutor: CommandExecutorService

  constructor() {
    this.runnersDir = getRunnersDirectory()
    this.commandExecutor = new CommandExecutorService()

    // Ensure the runners directory exists
    if (!fs.existsSync(this.runnersDir)) {
      fs.mkdirSync(this.runnersDir, { recursive: true })
    }
  }

  async createRunner(
    runnerName: string,
    files: Record<string, FileChange>
  ): Promise<string> {
    try {
      // Sanitize runner name and ensure uniqueness
      const sanitizedName = this.sanitizeRunnerName(runnerName)
      const uniqueName = this.ensureUniqueRunnerName(sanitizedName)
      const runnerPath = path.join(this.runnersDir, uniqueName)

      // Create runner directory
      fs.mkdirSync(runnerPath, { recursive: true })

      // Create src directory if needed
      const srcPath = path.join(runnerPath, "src")
      fs.mkdirSync(srcPath, { recursive: true })

            // Import all template files as foundation - LLM will overwrite as needed
      await templateRunnerBuilder.importAllTemplateFiles(runnerPath)

      // Write all files
      for (const [filePath, fileData] of Object.entries(files)) {
        const fullFilePath = path.join(runnerPath, filePath)

        // Ensure directory exists for this file
        const fileDir = path.dirname(fullFilePath)
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true })
        }

        // Write file content
        fs.writeFileSync(fullFilePath, fileData.content, "utf8")
        console.log(`Created file: ${fullFilePath}`)
      }

      console.log(`Successfully created runner: ${uniqueName} at ${runnerPath}`)
      return uniqueName
    } catch (error) {
      console.error("Error creating runner:", error)
      throw error
    }
  }

  async createTemplateRunner(runnerName: string): Promise<string> {
    try {
      // Sanitize runner name and ensure uniqueness
      const sanitizedName = this.sanitizeRunnerName(runnerName)
      const uniqueName = this.ensureUniqueRunnerName(sanitizedName)
      const runnerPath = path.join(this.runnersDir, uniqueName)

      // Create runner directory
      fs.mkdirSync(runnerPath, { recursive: true })

      // Create src directory if needed
      const srcPath = path.join(runnerPath, "src")
      fs.mkdirSync(srcPath, { recursive: true })

      // Ensure we have a package.json with viberunner metadata
      const packageJsonPath = path.join(runnerPath, "package.json")
      if (!fs.existsSync(packageJsonPath)) {
        // Extract metadata from files if available, or create default
        const defaultPackageJson = this.createDefaultPackageJson(uniqueName)
        fs.writeFileSync(
          packageJsonPath,
          JSON.stringify(defaultPackageJson, null, 2),
          "utf8"
        )
      } else {
        // Update existing package.json to ensure it has viberunner metadata
        this.ensureViberunnerMetadata(packageJsonPath, uniqueName)
      }

      // Create other required files if they don't exist
      await this.ensureRequiredFiles(runnerPath, uniqueName)

      console.log(`Successfully created runner: ${uniqueName} at ${runnerPath}`)
      return uniqueName
    } catch (error) {
      console.error("Error creating runner:", error)
      throw error
    }
  }

  async updateRunner(
    runnerName: string,
    files: Record<string, FileChange>
  ): Promise<string> {
    try {
      const runnerPath = path.join(this.runnersDir, runnerName)

      // Check if runner exists
      if (!fs.existsSync(runnerPath)) {
        throw new Error(`Runner "${runnerName}" does not exist`)
      }

      // Create src directory if needed
      const srcPath = path.join(runnerPath, "src")
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
        fs.writeFileSync(fullFilePath, fileData.content, "utf8")
        console.log(`Updated file: ${fullFilePath}`)
      }

      console.log(`Successfully updated runner: ${runnerName} at ${runnerPath}`)
      return runnerName
    } catch (error) {
      console.error("Error updating runner:", error)
      throw error
    }
  }

  async loadRunnerFiles(
    runnerName: string
  ): Promise<Record<string, FileChange>> {
    try {
      const runnerPath = path.join(this.runnersDir, runnerName)

      // Check if runner exists
      if (!fs.existsSync(runnerPath)) {
        throw new Error(`Runner "${runnerName}" does not exist`)
      }

      const files: Record<string, FileChange> = {}

      // Function to recursively read files
      const readDirectory = (dirPath: string, basePath: string = "") => {
        const entries = fs.readdirSync(dirPath)

        for (const entry of entries) {
          const entryPath = path.join(dirPath, entry)
          const relativePath = basePath ? path.join(basePath, entry) : entry
          const stat = fs.statSync(entryPath)

          if (stat.isDirectory()) {
            // Skip node_modules, .git, dist, and other build directories
            if (
              ![
                "node_modules",
                ".git",
                "dist",
                "build",
                ".vscode",
                ".idea",
              ].includes(entry)
            ) {
              readDirectory(entryPath, relativePath)
            }
          } else if (stat.isFile()) {
            // Files to exclude from loading
            const excludeFiles = ["VIBERUNNER.md"]

            // Only include common source files
            const ext = path.extname(entry).toLowerCase()
            const shouldInclude =
              [
                ".ts",
                ".tsx",
                ".js",
                ".jsx",
                ".json",
                ".css",
                ".scss",
                ".sass",
                ".less",
                ".html",
                ".htm",
                ".md",
                ".txt",
                ".yml",
                ".yaml",
                ".xml",
              ].includes(ext) ||
              [
                "package.json",
                "tsconfig.json",
                "vite.config.ts",
                "README.md",
              ].includes(entry)

            if (shouldInclude && !excludeFiles.includes(entry)) {
              try {
                const content = fs.readFileSync(entryPath, "utf8")
                const language = this.getLanguageFromExtension(relativePath)

                files[relativePath] = {
                  path: relativePath,
                  content,
                  language,
                }
              } catch (readError) {
                console.warn(`Failed to read file ${relativePath}:`, readError)
              }
            }
          }
        }
      }

      readDirectory(runnerPath)

      console.log(
        `Successfully loaded ${
          Object.keys(files).length
        } files from runner: ${runnerName}`
      )
      return files
    } catch (error) {
      console.error("Error loading runner files:", error)
      throw error
    }
  }

  private getLanguageFromExtension(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    switch (ext) {
      case ".tsx":
      case ".jsx":
        return "typescript"
      case ".ts":
        return "typescript"
      case ".js":
        return "javascript"
      case ".json":
        return "json"
      case ".css":
        return "css"
      case ".scss":
      case ".sass":
        return "scss"
      case ".less":
        return "less"
      case ".html":
      case ".htm":
        return "html"
      case ".md":
        return "markdown"
      case ".yml":
      case ".yaml":
        return "yaml"
      case ".xml":
        return "xml"
      default:
        return "text"
    }
  }

  private sanitizeRunnerName(name: string): string {
    // Convert to lowercase, replace spaces with hyphens, remove special characters
    return (
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()
        .substring(0, 50) || // Limit length
      `runner-${Date.now()}`
    )
  }

  private createDefaultPackageJson(runnerName: string) {
    return {
      name: `viberunner-${runnerName}`,
      version: "1.0.0",
      description: `AI-generated runner: ${runnerName}`,
      main: "dist/bundle.js",
      viberunner: {
        name: runnerName
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
        description: `AI-generated runner: ${runnerName}`,
        version: "1.0.0",
        standalone: true,
        author: "AI Assistant",
      },
      scripts: {
        build: "vite build",
        dev: "vite",
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        "@types/node": "^22.15.29",
        "@types/react": "^18.2.64",
        "@types/react-dom": "^18.2.21",
        "@vitejs/plugin-react": "^4.2.1",
        typescript: "^5.2.2",
        vite: "^5.1.6",
      },
    }
  }

  private ensureViberunnerMetadata(
    packageJsonPath: string,
    runnerName: string
  ) {
    try {
      const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8")
      const packageJson = JSON.parse(packageJsonContent)

      // Ensure viberunner metadata exists
      if (!packageJson.viberunner) {
        packageJson.viberunner = {
          name: runnerName
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" "),
          description: `AI-generated runner: ${runnerName}`,
          version: "1.0.0",
          standalone: true,
          author: "AI Assistant",
        }

        fs.writeFileSync(
          packageJsonPath,
          JSON.stringify(packageJson, null, 2),
          "utf8"
        )
      }
    } catch (error) {
      console.error("Error updating package.json metadata:", error)
    }
  }

  private async ensureRequiredFiles(runnerPath: string, runnerName: string) {
    // Ensure tsconfig.json exists
    const tsconfigPath = path.join(runnerPath, "tsconfig.json")
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
          noFallthroughCasesInSwitch: true,
        },
        include: ["src"],
        references: [{ path: "./tsconfig.node.json" }],
      }
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2), "utf8")
    }

    // Ensure tsconfig.node.json exists
    const tsconfigNodePath = path.join(runnerPath, "tsconfig.node.json")
    if (!fs.existsSync(tsconfigNodePath)) {
      const tsconfigNode = {
        compilerOptions: {
          composite: true,
          skipLibCheck: true,
          module: "ESNext",
          moduleResolution: "bundler",
          allowSyntheticDefaultImports: true,
        },
        include: ["vite.config.ts"],
      }
      fs.writeFileSync(
        tsconfigNodePath,
        JSON.stringify(tsconfigNode, null, 2),
        "utf8"
      )
    }

    // Ensure vite.config.ts exists
    const viteConfigPath = path.join(runnerPath, "vite.config.ts")
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
      name: '${runnerName
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("")}Runner',
      fileName: 'bundle',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        format: 'iife',
        name: '${runnerName
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join("")}Runner',
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});`
      fs.writeFileSync(viteConfigPath, viteConfig, "utf8")
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

    /**
   * Import static files from the template runner into a runner directory
   * @param runnerName - The name of the runner to import files into
   * @param filePaths - Array of file paths to extract from the template
   */
  async importStaticFilesFromTemplate(
    runnerName: string,
    filePaths: string[]
  ): Promise<void> {
    try {
      const runnerPath = path.join(this.runnersDir, runnerName)

      // Check if runner exists
      if (!fs.existsSync(runnerPath)) {
        throw new Error(`Runner "${runnerName}" does not exist`)
      }

      await templateRunnerBuilder.importTemplateFiles(runnerPath, filePaths)
    } catch (error) {
      console.error("Error importing static files from template:", error)
      throw error
    }
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
      console.error("Error listing runners:", error)
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
      console.error("Error deleting runner:", error)
      throw error
    }
  }

  // Create a runner for Cursor development
  async createRunnerForCursor(): Promise<string> {
    try {
      // Generate a temporary runner name
      const timestamp = Date.now()
      const tempRunnerName = `cursor-runner-${timestamp}`

      // Create empty App.tsx content
      const emptyAppContent = `${getCursorPrompt()}

declare global {
  interface Window {
    registerCleanup: (tabId: string, cleanupFn: () => void) => void
    __RENDER_RUNNER__: (app: React.ComponentType<any>) => void
  }
}

import React from 'react'

interface RunnerProps {
  dataDirectory: string
  fileInput?: {
    path: string
    mimetype: string
  }
}

const MyRunner: React.FC<RunnerProps> = ({ dataDirectory, fileInput }) => {
  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h2>🚀 New Viberunner App</h2>
      <p>Start building your app here!</p>
      {fileInput && (
        <div>
          <p>File: {fileInput.path}</p>
          <p>MIME Type: {fileInput.mimetype}</p>
        </div>
      )}
    </div>
  )
}

window.__RENDER_RUNNER__(MyRunner)

export default MyRunner
`

      // Create the runner with files
      const files = {
        "src/App.tsx": {
          path: "src/App.tsx",
          content: emptyAppContent,
          language: "typescript",
        },
      }

      const runnerName = await this.createRunner(tempRunnerName, files)
      console.log(`Created runner: ${runnerName}`)

      // Get the runner path
      const runnerPath = path.join(this.runnersDir, runnerName)

      // Create VIBERUNNER.md with README content
      const viberunnerMdPath = path.join(runnerPath, "VIBERUNNER.md")
      fs.writeFileSync(viberunnerMdPath, readmeContent, "utf8")
      console.log("Created VIBERUNNER.md with README content")

      // Run npm install in the runner directory
      console.log("Running npm install...")
      const installResult = await this.commandExecutor.executeCommand(
        "npm install",
        runnerName
      )

      if (installResult.success) {
        console.log("npm install completed successfully")
        console.log(installResult.output)

        // Run npm run build after install completes
        console.log("Running npm run build...")
        const buildResult = await this.commandExecutor.executeCommand(
          "npm run build",
          runnerName
        )

        if (buildResult.success) {
          console.log("npm run build completed successfully")
          console.log(buildResult.output)
        } else {
          console.error("npm run build failed:", buildResult.error)
        }
      } else {
        console.error("npm install failed:", installResult.error)
      }

      // Open directory with Cursor
      const cursorResult = await this.commandExecutor.executeCommand(
        `cursor "${runnerPath}"`
      )
      if (!cursorResult.success) {
        console.warn("Could not open with Cursor:", cursorResult.error)
      }

      console.log(`Opened ${runnerPath} with Cursor`)

      // Refresh the runner service to show the new runner in the UI
      await runnerService.refresh()
      console.log("Refreshed runner service after creating new runner")

      return runnerName
    } catch (error) {
      console.error("Error creating runner with Cursor:", error)
      throw error
    }
  }

  // Edit an existing runner with Cursor
  async editRunnerWithCursor(runnerName: string): Promise<void> {
    try {
      const runnerPath = path.join(this.runnersDir, runnerName)

      // Check if runner exists
      if (!fs.existsSync(runnerPath)) {
        throw new Error(`Runner "${runnerName}" does not exist`)
      }

      console.log(`Preparing to edit runner: ${runnerName}`)

      // Create VIBERUNNER.md with README content if it doesn't exist
      const viberunnerMdPath = path.join(runnerPath, "VIBERUNNER.md")
      if (!fs.existsSync(viberunnerMdPath)) {
        fs.writeFileSync(viberunnerMdPath, readmeContent, "utf8")
        console.log("Created VIBERUNNER.md with README content")
      }

      // Check if node_modules exists, if not run npm install
      const nodeModulesPath = path.join(runnerPath, "node_modules")
      if (!fs.existsSync(nodeModulesPath)) {
        console.log("Running npm install...")
        const installResult = await this.commandExecutor.executeCommand(
          "npm install",
          runnerName
        )

        if (installResult.success) {
          console.log("npm install completed successfully")
          console.log(installResult.output)

          // Run npm run build after install completes
          console.log("Running npm run build...")
          const buildResult = await this.commandExecutor.executeCommand(
            "npm run build",
            runnerName
          )

          if (buildResult.success) {
            console.log("npm run build completed successfully")
            console.log(buildResult.output)
          } else {
            console.error("npm run build failed:", buildResult.error)
          }
        } else {
          console.error("npm install failed:", installResult.error)
        }
      } else {
        // Node modules exist, just run build
        console.log("Running npm run build...")
        const buildResult = await this.commandExecutor.executeCommand(
          "npm run build",
          runnerName
        )

        if (buildResult.success) {
          console.log("npm run build completed successfully")
          console.log(buildResult.output)
        } else {
          console.error("npm run build failed:", buildResult.error)
        }
      }

      // Open directory with Cursor
      const cursorResult = await this.commandExecutor.executeCommand(
        `cursor "${runnerPath}"`
      )
      if (!cursorResult.success) {
        console.warn("Could not open with Cursor:", cursorResult.error)
      }

      console.log(`Opened ${runnerPath} with Cursor for editing`)

      // Refresh the runner service to ensure UI is up to date
      await runnerService.refresh()
      console.log("Refreshed runner service after opening runner for editing")
    } catch (error) {
      console.error("Error editing runner with Cursor:", error)
      throw error
    }
  }
}
