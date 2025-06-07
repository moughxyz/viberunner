import React, { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Terminal, Play, Sparkles } from "lucide-react"
import "./globals.css"

// Import ESM modules regularly
// import foo from 'foolib'

// Import CommonJS modules
// const bar = require('barlib')

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
  tabId: string
}

const styles = {
  container: {
    padding: "20px",
    background: "#0a0a0a",
    color: "#ffffff",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  header: {
    fontSize: "1.5rem",
    fontWeight: "600",
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
  }
}

const TemplateRunner: React.FC<RunnerProps> = ({
  tabId,
  dataDirectory,
}: RunnerProps) => {
  const [commandOutput, setCommandOutput] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState<boolean>(false)

  useEffect(() => {
    window.registerCleanup(tabId, () => {
      // Cleanup timers, listeners, etc.
    })
  }, [tabId])

  const runExampleCommand = async () => {
    setIsLoading(true)
    try {
      const result = await window.api.executeCommand('echo "Hello from Viberunner!"')
      if (result.success) {
        setCommandOutput(result.output)
      } else {
        setCommandOutput(`Error: ${result.error}`)
      }
    } catch (error) {
      setCommandOutput(`Failed to execute: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Sparkles className="w-6 h-6" />
        Viberunner Template
      </div>

      <div className="grid gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="w-5 h-5" />
              Command Execution Example
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              This demonstrates how to execute system commands from your runner.
            </p>
            <Button
              onClick={runExampleCommand}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isLoading ? "Running..." : "Run Example Command"}
            </Button>
            {commandOutput && (
              <Card className="bg-gray-950 border-gray-700">
                <CardContent className="p-4">
                  <pre className="text-sm text-green-400 font-mono">
                    {commandOutput}
                  </pre>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-300">
              You have access to:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-400 space-y-1">
              <li>Node.js APIs (fs, path, os, http, etc.)</li>
              <li>System command execution via window.api.executeCommand</li>
              <li>Data directory for persistent storage: {dataDirectory}</li>
              <li>shadcn/ui components and Lucide React icons</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

window.__RENDER_RUNNER__(TemplateRunner)

export default TemplateRunner