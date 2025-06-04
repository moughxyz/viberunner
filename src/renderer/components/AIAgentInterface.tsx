import React, { useState, useRef, useEffect, useCallback } from "react"
import ChatInterface from "./ChatInterface"
import CodeEditor from "./CodeEditor"
import { ClaudeAPIService } from "../services/ClaudeAPIService"
import { FileManagerService } from "../services/FileManagerService"
import { CommandExecutorService } from "../services/CommandExecutorService"
import { useRunnerRefresh } from "../hooks/useRunnerService"
import { getRunnersDirectory } from "../util"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import "./AIAgentInterface.css"

export interface FileChange {
  path: string
  content: string
  language: string
}

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  fileChanges?: FileChange[]
  commands?: string[]
}

interface AIAgentInterfaceProps {
  onClose?: () => void
  inTab?: boolean
  initialPrompt?: string
}

interface PreviewPanelProps {
  runnerName: string
  files: Record<string, FileChange>
  onRefresh: () => void
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  runnerName,
  files,
  onRefresh,
}) => {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRunner, setHasRunner] = useState(false)
  const reactRootRef = useRef<any>(null)

  const loadRunner = async () => {
    if (!runnerName || Object.keys(files).length === 0) {
      setHasRunner(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const fs = require("fs")
      const path = require("path")

      const RUNNERS_DIR = getRunnersDirectory()
      const runnerPath = path.join(RUNNERS_DIR, runnerName)
      const bundlePath = path.join(runnerPath, "dist", "bundle.iife.js")

      if (!fs.existsSync(bundlePath)) {
        setError("Waiting for build...")
        setHasRunner(false)
        setIsLoading(false)
        return
      }

      const bundleContent = fs.readFileSync(bundlePath, "utf-8")

      // Clear the container
      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML = ""
      }

      // Clean up previous root if it exists
      if (reactRootRef.current) {
        try {
          reactRootRef.current.unmount()
        } catch (e) {
          console.warn("Error unmounting previous preview:", e)
        }
        reactRootRef.current = null
      }

      // Load and render the runner similar to how App.tsx does it
      const script = document.createElement("script")
      script.type = "text/javascript"

      const previewId = `preview-${Date.now()}`

      // Add style isolation
      const runnerStyleInterceptor = `
        (function() {
          const originalCreateElement = document.createElement;
          const runnerId = "${previewId}";

          document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);

            if (tagName.toLowerCase() === 'style') {
              element.setAttribute('data-app-style', runnerId);
            }

            return element;
          };
        })();
      `

      script.textContent = runnerStyleInterceptor + "\n" + bundleContent

      const runnerLoader = (RunnerComponent: any) => {
        try {
          if (!previewContainerRef.current) {
            throw new Error("Preview container not available")
          }

          // Create isolation wrapper
          const isolationWrapper = document.createElement("div")
          isolationWrapper.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            position: relative !important;
            overflow: auto !important;
            display: block !important;
            contain: layout style !important;
            isolation: isolate !important;
          `
          isolationWrapper.setAttribute("data-app-id", previewId)

          previewContainerRef.current.appendChild(isolationWrapper)

          // Use the global ReactDOM.createRoot that's already exposed for runners
          const { createRoot } = (window as any).ReactDOM
          if (!createRoot) {
            throw new Error("ReactDOM.createRoot not available globally")
          }

          const root = createRoot(isolationWrapper)
          reactRootRef.current = root

          const props = {
            tabId: previewId,
            runnerId: runnerName,
          }

          // Use global React instance for component creation
          const globalReact = (window as any).React
          if (!globalReact) {
            throw new Error("Global React not available")
          }

          root.render(globalReact.createElement(RunnerComponent, props))

          // Set success states only after successful rendering
          setHasRunner(true)
          setError(null)
          setIsLoading(false)
        } catch (error) {
          console.error("Error rendering preview:", error)
          setError(
            `Preview error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
          setHasRunner(false)
          setIsLoading(false)
        }
      }

      // Make the app loader available globally
      ;(window as any).__RENDER_RUNNER__ = runnerLoader

      script.onload = () => {
        setTimeout(() => {
          if (script.parentNode) {
            script.parentNode.removeChild(script)
          }
          delete (window as any).__RENDER_RUNNER__
        }, 1000)
      }

      script.onerror = (error) => {
        console.error("Script loading error:", error)
        setError("Failed to load runner script")
        setHasRunner(false)
        setIsLoading(false)
      }

      document.head.appendChild(script)
    } catch (error) {
      console.error("Error loading runner preview:", error)
      setError(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      )
      setHasRunner(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRunner()

    // Cleanup on unmount
    return () => {
      if (reactRootRef.current) {
        try {
          reactRootRef.current.unmount()
        } catch (e) {
          console.warn("Error unmounting preview on cleanup:", e)
        }
      }
    }
  }, [runnerName, files])

  // External refresh handler
  useEffect(() => {
    // This effect will be triggered when onRefresh prop changes
    // But we don't want to add onRefresh to dependencies to avoid infinite loops
  }, [])

  const handleRefresh = () => {
    loadRunner()
    onRefresh()
  }

  if (!runnerName || Object.keys(files).length === 0) {
    return (
      <div id="preview-empty-state" className="preview-empty-state">
        <div className="empty-state-content">
          <h3 className="empty-state-title">No Runner to Preview</h3>
          <p className="empty-state-description">
            Start building a runner in the chat to see a live preview here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div id="preview-content" className="preview-content">
      {isLoading && (
        <div id="preview-loading" className="preview-loading">
          <div className="loading-content">
            <div className="loading-spinner">⟳</div>
            <p className="loading-text">Loading preview...</p>
          </div>
        </div>
      )}
      {error && error === "Waiting for build..." ? (
        <div id="preview-waiting-build" className="preview-waiting-build">
          <div className="waiting-content">
            <div className="loading-spinner">⟳</div>
            <p className="waiting-text">{error}</p>
            <button
              id="preview-check-again-btn-1"
              onClick={handleRefresh}
              className="preview-action-btn"
            >
              Check Again
            </button>
          </div>
        </div>
      ) : error ? (
        <div id="preview-error" className="preview-error">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <p className="error-text">{error}</p>
            <button
              id="preview-try-again-btn"
              onClick={handleRefresh}
              className="preview-action-btn"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : null}
      {!isLoading && !error && !hasRunner && (
        <div id="preview-not-built" className="preview-not-built">
          <div className="not-built-content">
            <div className="not-built-icon">🔧</div>
            <h3 className="not-built-title">Runner Not Built</h3>
            <p className="not-built-description">
              Build the runner to see a preview here.
            </p>
            <button
              id="preview-check-again-btn-2"
              onClick={handleRefresh}
              className="preview-action-btn"
            >
              Check Again
            </button>
          </div>
        </div>
      )}
      <div
        id="preview-container"
        ref={previewContainerRef}
        className={`preview-container ${hasRunner ? "visible" : "hidden"}`}
      />
    </div>
  )
}

const AIAgentInterface: React.FC<AIAgentInterfaceProps> = ({
  onClose,
  inTab = false,
  initialPrompt,
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string>("")
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false)
  const [currentFiles, setCurrentFiles] = useState<Record<string, FileChange>>(
    {}
  )
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [runnerName, setRunnerName] = useState<string>("")
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [isNewRunner, setIsNewRunner] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState("preview")

  const claudeService = useRef<ClaudeAPIService | null>(null)
  const fileManager = useRef<FileManagerService | null>(null)
  const commandExecutor = useRef<CommandExecutorService | null>(null)

  // Hook to refresh runners in the main UI
  const { refresh: refreshRunners } = useRunnerRefresh()

  useEffect(() => {
    // Check if API key is already stored
    const storedKey = localStorage.getItem("claude-api-key")
    if (storedKey) {
      setApiKey(storedKey)
      claudeService.current = new ClaudeAPIService(storedKey)
    } else {
      setShowApiKeyPrompt(true)
    }

    fileManager.current = new FileManagerService()
    commandExecutor.current = new CommandExecutorService()
  }, [])

  const handleSetApiKey = (key: string) => {
    setApiKey(key)
    localStorage.setItem("claude-api-key", key)
    claudeService.current = new ClaudeAPIService(key)
    setShowApiKeyPrompt(false)

    // Reset the initial prompt sent flag so it can be sent now that we have the API key
    initialPromptSentRef.current = false
  }

  const handleDiscard = async () => {
    if (!runnerName || !isNewRunner) {
      return
    }

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to discard "${runnerName}"?\n\nThis will permanently delete the runner and all its files. This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    setIsDiscarding(true)
    try {
      if (fileManager.current) {
        await fileManager.current.deleteRunner(runnerName)

        // Show success message
        const discardMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `🗑️ Runner "${runnerName}" has been discarded and deleted.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, discardMessage])

        // Clear the current state
        setRunnerName("")
        setCurrentFiles({})
        setActiveFile(null)
        setIsNewRunner(true)

        // Close the AI Agent after a short delay
        setTimeout(() => {
          if (onClose) {
            onClose()
          }
        }, 1500)
      }
    } catch (error) {
      console.error("Error discarding runner:", error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Error discarding runner: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsDiscarding(false)
    }
  }

  const handleSendMessage = useCallback(async (content: string) => {
    if (!claudeService.current) {
      setShowApiKeyPrompt(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await claudeService.current.sendMessage(
        content,
        messages
      )

      // Parse the response for file changes and commands
      const { parsedContent, fileChanges, commands } = parseAssistantResponse(
        response.content
      )

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: parsedContent,
        timestamp: new Date(),
        fileChanges,
        commands,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update current files with any changes
      if (fileChanges && fileChanges.length > 0) {
        const newFiles = { ...currentFiles }
        fileChanges.forEach((change) => {
          newFiles[change.path] = change
        })
        setCurrentFiles(newFiles)

        // Set the first file as active if none is selected
        if (!activeFile && fileChanges.length > 0) {
          setActiveFile(fileChanges[0].path)
        }

        // If we have files but no runner name, try to extract it from package.json
        let currentRunnerName = runnerName
        if (!currentRunnerName) {
          const packageJsonFile = fileChanges.find(
            (f) => f.path === "package.json"
          )
          if (packageJsonFile) {
            try {
              const packageJson = JSON.parse(packageJsonFile.content)
              if (packageJson.viberunner?.name) {
                currentRunnerName = packageJson.viberunner.name
                  .toLowerCase()
                  .replace(/\s+/g, "-")
                setRunnerName(currentRunnerName)
              }
            } catch (error) {
              console.warn("Could not parse package.json for runner name")
            }
          }
        }

        // Auto-save files immediately when AI generates them
        if (fileManager.current) {
          try {
            let savedName: string

            if (!runnerName) {
              // First time - create a new runner
              const generatedName =
                currentRunnerName || `ai-runner-${Date.now()}`
              savedName = await fileManager.current.createRunner(
                generatedName,
                newFiles
              )

              // Update runner name to the sanitized version
              setRunnerName(savedName)
              currentRunnerName = savedName
              // Keep isNewRunner as true since this is auto-save of a new runner
            } else {
              // Already have a runner - update the existing one
              savedName = await fileManager.current.updateRunner(
                runnerName,
                newFiles
              )
              currentRunnerName = runnerName
              // Keep isNewRunner state as-is since we're updating existing
            }

            console.log(
              `${runnerName ? "Updated" : "Created"} runner: ${savedName}`
            )

            // Refresh the main UI runners list
            await refreshRunners()

            // Execute commands immediately after saving files
            if (commands && commands.length > 0) {
              for (const command of commands) {
                try {
                  console.log("Executing command on saved runner:", command)

                  const result = await commandExecutor.current?.executeCommand(
                    command,
                    currentRunnerName
                  )

                  // Add command result to chat
                  const resultMessage: Message = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: result?.success
                      ? `✅ Command executed successfully:\n\`\`\`\n${command}\n\`\`\`\n\n${result.output}`
                      : `❌ Command failed:\n\`\`\`\n${command}\n\`\`\`\n\nError: ${
                          result?.error || "Unknown error"
                        }`,
                    timestamp: new Date(),
                  }

                  setMessages((prev) => [...prev, resultMessage])

                  // If build command was successful, refresh the preview
                  if (result?.success && command.includes("build")) {
                    setTimeout(() => {
                      refreshPreview()
                    }, 1000) // Small delay to ensure build is complete
                  }
                } catch (error) {
                  console.error("Error executing command:", error)

                  const errorMessage: Message = {
                    id: Date.now().toString(),
                    role: "assistant",
                    content: `❌ Command execution failed:\n\`\`\`\n${command}\n\`\`\`\n\nError: ${
                      error instanceof Error ? error.message : "Unknown error"
                    }`,
                    timestamp: new Date(),
                  }

                  setMessages((prev) => [...prev, errorMessage])
                }
              }
            }
          } catch (error) {
            console.error("Auto-save failed:", error)
            // Show error message but continue
            const errorMessage: Message = {
              id: Date.now().toString(),
              role: "assistant",
              content: `⚠️ Auto-save failed: ${
                error instanceof Error ? error.message : "Unknown error"
              }`,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Error: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [messages]) // Dependencies for useCallback

  const parseAssistantResponse = (content: string) => {
    const fileChanges: FileChange[] = []
    const commands: string[] = []
    let parsedContent = content

    // Extract RunnerArtifact tags
    const artifactRegex =
      /<RunnerArtifact name="([^"]+)">([\s\S]*?)<\/RunnerArtifact>/g
    let match
    while ((match = artifactRegex.exec(content)) !== null) {
      const filePath = match[1]
      const fileContent = match[2].trim()
      const language = getLanguageFromPath(filePath)

      fileChanges.push({
        path: filePath,
        content: fileContent,
        language,
      })
    }

    // Extract RunnerCommand tags
    const commandRegex = /<RunnerCommand>([\s\S]*?)<\/RunnerCommand>/g
    while ((match = commandRegex.exec(content)) !== null) {
      const command = match[1].trim()
      commands.push(command)
    }

    // Remove the artifact and command tags from the displayed content
    parsedContent = parsedContent
      .replace(/<RunnerArtifact name="[^"]+">[\s\S]*?<\/RunnerArtifact>/g, "")
      .replace(/<RunnerCommand>[\s\S]*?<\/RunnerCommand>/g, "")
      .trim()

    return { parsedContent, fileChanges, commands }
  }

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split(".").pop()?.toLowerCase()
    switch (ext) {
      case "tsx":
      case "jsx":
        return "typescript"
      case "ts":
        return "typescript"
      case "js":
        return "javascript"
      case "json":
        return "json"
      case "css":
        return "css"
      case "html":
        return "html"
      case "md":
        return "markdown"
      default:
        return "text"
    }
  }

  const handleSaveRunner = async () => {
    // Since files are auto-saved when AI generates them,
    // the "Save" button should just close the interface

    // Refresh the main UI runners list one final time before closing
    await refreshRunners()

    if (onClose) {
      onClose()
    }
  }

  const handleFileChange = (path: string, content: string) => {
    setCurrentFiles((prev) => ({
      ...prev,
      [path]: {
        ...prev[path],
        content,
      },
    }))
  }

  const refreshPreview = () => {
    setRefreshKey((prev) => prev + 1)
  }

  // Track if we've already sent the initial prompt
  const initialPromptSentRef = useRef(false)

  // Automatically send initial prompt when component mounts and API key is available
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim() && !initialPromptSentRef.current && claudeService.current && !showApiKeyPrompt) {
      console.log('Sending initial prompt:', initialPrompt.substring(0, 50) + '...')
      initialPromptSentRef.current = true
      handleSendMessage(initialPrompt)
    }
  }, [initialPrompt, claudeService.current, showApiKeyPrompt]) // Depend on initialPrompt, claudeService availability, and API key prompt state

  if (showApiKeyPrompt) {
    return (
      <div id="api-key-prompt" className="api-key-prompt">
        <div className="w-full max-w-md">
          <div id="api-key-form" className="api-key-form">
            <div className="api-key-title">
              <h2 className="api-key-heading">
                Claude API Key{" "}
                <span className="api-key-gradient-text">Required</span>
              </h2>
              <p className="api-key-description">
                To use the AI Agent for creating runners, please provide your
                Claude API key.
              </p>
            </div>

            <div className="api-key-input-container">
              <input
                id="api-key-input"
                type="password"
                placeholder="Enter your Claude API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && apiKey.trim()) {
                    handleSetApiKey(apiKey.trim())
                  }
                }}
                className="api-key-input"
              />
            </div>

            <div className="api-key-buttons">
              <button
                id="api-key-continue-btn"
                onClick={() => handleSetApiKey(apiKey.trim())}
                disabled={!apiKey.trim()}
                className="api-key-continue-btn"
              >
                Continue
              </button>
              <button
                id="api-key-cancel-btn"
                onClick={onClose}
                className="api-key-cancel-btn"
              >
                Cancel
              </button>
            </div>

            <div className="api-key-footer">
              <p className="api-key-footer-text">
                Get your API key from{" "}
                <a
                  id="anthropic-console-link"
                  href="https://console.anthropic.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="anthropic-console-link"
                >
                  Anthropic Console
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      id="ai-agent-interface"
      className={`ai-agent-interface ${inTab ? "in-tab" : ""}`}
    >
      <div id="ai-agent-content" className="ai-agent-content">
        {!inTab && (
          <Card className="header-card">
            <CardHeader className="header-card-content">
              <div className="header-left">
                <CardTitle className="header-title">
                  AI Runner Builder
                </CardTitle>
                <Input
                  id="runner-name-input"
                  type="text"
                  placeholder="Runner name (optional)"
                  value={runnerName}
                  onChange={(e) => setRunnerName(e.target.value)}
                  className="runner-name-input"
                />
              </div>
              <div className="header-buttons">
                <Button
                  onClick={handleSaveRunner}
                  disabled={
                    Object.keys(currentFiles).length === 0 || isDiscarding
                  }
                  className="header-btn header-btn-primary"
                >
                  Done
                </Button>
                {Object.keys(currentFiles).length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={handleDiscard}
                    disabled={isDiscarding}
                    className="header-btn header-btn-secondary"
                  >
                    {isDiscarding ? "Discarding..." : "Discard"}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="header-btn header-btn-outline"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
          </Card>
        )}

        <div className="main-layout">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            runnerName={runnerName}
            onRunnerNameChange={setRunnerName}
            onSave={handleSaveRunner}
            onDiscard={handleDiscard}
            isDiscarding={isDiscarding}
            hasFiles={Object.keys(currentFiles).length > 0}
          />
          <div id="preview-panel" className="preview-panel">
            <Tabs
              defaultValue="preview"
              value={activeTab}
              onValueChange={setActiveTab}
              className="preview-panel-tabs"
            >
              <div id="preview-header" className="preview-header">
                <div className="preview-status">
                  <div className="status-indicator"></div>
                  <div>
                    <h3 className="preview-title">
                      {activeTab === "preview" ? "Preview" : "Code"}
                    </h3>
                    {runnerName && (
                      <p className="preview-subtitle">{runnerName}</p>
                    )}
                  </div>
                </div>

                <div className="preview-controls">
                  <TabsList className="preview-tabs-list">
                    <TabsTrigger
                      value="preview"
                      className="preview-tab-trigger"
                      data-testid="tab-file-button"
                    >
                      <div className="truncate">
                        <div className="tab-content">
                          <svg
                            className="tab-icon"
                            data-testid="geist-icon"
                            height="16"
                            stroke-linejoin="round"
                            viewBox="0 0 16 16"
                            width="16"
                            style={{ color: "currentcolor" }}
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M1.5 2.5H14.5V12.5C14.5 13.0523 14.0523 13.5 13.5 13.5H2.5C1.94772 13.5 1.5 13.0523 1.5 12.5V2.5ZM0 1H1.5H14.5H16V2.5V12.5C16 13.8807 14.8807 15 13.5 15H2.5C1.11929 15 0 13.8807 0 12.5V2.5V1ZM3.75 5.5C4.16421 5.5 4.5 5.16421 4.5 4.75C4.5 4.33579 4.16421 4 3.75 4C3.33579 4 3 4.33579 3 4.75C3 5.16421 3.33579 5.5 3.75 5.5ZM7 4.75C7 5.16421 6.66421 5.5 6.25 5.5C5.83579 5.5 5.5 5.16421 5.5 4.75C5.5 4.33579 5.83579 4 6.25 4C6.66421 4 7 4.33579 7 4.75ZM8.75 5.5C9.16421 5.5 9.5 5.16421 9.5 4.75C9.5 4.33579 9.16421 4 8.75 4C8.33579 4 8 4.33579 8 4.75C8 5.16421 8.33579 5.5 8.75 5.5Z"
                              fill="currentColor"
                            ></path>
                          </svg>
                          <span>Preview</span>
                        </div>
                      </div>
                    </TabsTrigger>
                    <TabsTrigger
                      value="files"
                      className="preview-tab-trigger"
                      data-testid="tab-file-button"
                    >
                      <div className="truncate">
                        <div className="tab-content">
                          <svg
                            data-testid="geist-icon"
                            height="16"
                            stroke-linejoin="round"
                            viewBox="0 0 16 16"
                            width="16"
                            className="tab-icon"
                            style={{ color: "currentcolor" }}
                          >
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M7.22763 14.1819L10.2276 2.18193L10.4095 1.45432L8.95432 1.09052L8.77242 1.81812L5.77242 13.8181L5.59051 14.5457L7.04573 14.9095L7.22763 14.1819ZM3.75002 12.0607L3.21969 11.5304L0.39647 8.70713C0.00594559 8.31661 0.00594559 7.68344 0.39647 7.29292L3.21969 4.46969L3.75002 3.93936L4.81068 5.00002L4.28035 5.53035L1.81068 8.00003L4.28035 10.4697L4.81068 11L3.75002 12.0607ZM12.25 12.0607L12.7804 11.5304L15.6036 8.70713C15.9941 8.31661 15.9941 7.68344 15.6036 7.29292L12.7804 4.46969L12.25 3.93936L11.1894 5.00002L11.7197 5.53035L14.1894 8.00003L11.7197 10.4697L11.1894 11L12.25 12.0607Z"
                              fill="currentColor"
                            ></path>
                          </svg>
                          <span>Code</span>
                        </div>
                      </div>
                    </TabsTrigger>
                  </TabsList>

                  <button
                    id="preview-refresh-btn"
                    onClick={refreshPreview}
                    disabled={isLoading}
                    className="preview-refresh-btn"
                  >
                    {isLoading ? "..." : "Refresh"}
                  </button>
                </div>
              </div>

              <TabsContent value="preview" className="preview-tab-content">
                <PreviewPanel
                  key={refreshKey}
                  runnerName={runnerName}
                  files={currentFiles}
                  onRefresh={refreshPreview}
                />
              </TabsContent>

              <TabsContent value="files" className="preview-tab-content">
                <CodeEditor
                  files={currentFiles}
                  activeFile={activeFile}
                  onFileSelect={setActiveFile}
                  onFileChange={handleFileChange}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAgentInterface
