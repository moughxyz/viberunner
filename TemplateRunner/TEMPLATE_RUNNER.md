<RunnerArtifact name="src/App.tsx">
import React, { useEffect } from "react"

// Import ESM modules regularly
import 'foo' from 'foolib'

// Import CommonJS modules
const bar = require('barlib)

// Access Node regularly
const fs = require('fs')
const path = require('path')
const os = require('os')
const http = require('http')

declare global {
  interface Window {
    registerCleanup: (tabId: string, cleanupFn: () => void) => void
    __RENDER_RUNNER__: (app: React.ComponentType<any>) => void
    api: {
      // Command execution
      executeCommand: (command: string) => Promise<{ success: boolean; output: string; error?: string }>
      executeCommandWithArgs: (executable: string, args?: string[]) => Promise<{ success: boolean; output: string; error?: string }>
      // User preferences
      getRunnerPreference: (runnerId: string, key: string) => any
      updateRunnerPreference: (runnerId: string, key: string, value: any) => boolean
      setRunnerPreferences: (runnerId: string, preferences: Record<string, any>) => boolean
      getRunnerPreferences: (runnerId: string) => Record<string, any>
      removeRunnerPreference: (runnerId: string, key: string) => boolean
    }
  }
}

interface RunnerProps {
  dataDirectory: string
  fileInput?: {
    path: string
    mimetype: string
  }
}

const TemplateRunner: React.FC<RunnerProps> = ({
  tabId,
}: RunnerProps) => {
  const [commandOutput, setCommandOutput] = React.useState<string>("")

  useEffect(() => {
    window.registerCleanup(tabId, () => {
      // Cleanup timers, listeners, etc.
    })
  }, [tabId])

  const runExampleCommand = async () => {
    try {
      const result = await window.api.executeCommand('echo "Hello from command!"')
      if (result.success) {
        setCommandOutput(result.output)
      } else {
        setCommandOutput(`Error: ${result.error}`)
      }
    } catch (error) {
      setCommandOutput(`Failed to execute: ${error}`)
    }
  }

  return (
    <div
      style={{
        padding: "20px",
        background: "#0a0a0a",
        color: "#ffffff",
        minHeight: "100vh",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div>Hello World</div>
      <button onClick={runExampleCommand} style={{ margin: "10px 0", padding: "8px 16px" }}>
        Run Example Command
      </button>
      {commandOutput && (
        <pre style={{ background: "#1a1a1a", padding: "10px", marginTop: "10px" }}>
          {commandOutput}
        </pre>
      )}
    </div>
  )
}

window.__RENDER_RUNNER__(TemplateRunner)

export default TemplateRunner
</RunnerArtifact>

<RunnerArtifact name="package.json">
{
  "name": "viberunner-template-runner",
  "version": "1.0.0",
  "description": "A simple viberunner template runner",
  "main": "dist/bundle.js",
  "viberunner": {
    "name": "Viberunner Template Runner",
    "description": "A simple viberunner template runner",
    "version": "1.0.0",
    "standalone": true,
    "launchMode": "newTab"
  },
  "scripts": {
    "build": "vite build",
    "dev": "vite"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^22.15.29",
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6"
  }
}

</RunnerArtifact>

<RunnerArtifact name="tsconfig.json">
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
</RunnerArtifact>

<RunnerArtifact name="tsconfig.node.json">
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
</RunnerArtifact>

<RunnerArtifact name="vite.config.json">
import { defineConfig } from 'vite';
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
      name: 'TemplateRunner',
      fileName: 'bundle',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        format: 'iife',
        name: 'TemplateRunner',
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
</RunnerArtifact>