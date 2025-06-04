import React, { useState, useRef, useEffect, useCallback } from "react"
import ChatInterface from "./ChatInterface"
import CodeEditor from "./CodeEditor"
import { ClaudeAPIService, CLAUDE_MODELS, ClaudeModelId } from "../services/ClaudeAPIService"
import { FileManagerService } from "../services/FileManagerService"
import { CommandExecutorService } from "../services/CommandExecutorService"
import { useRunnerRefresh } from "../hooks/useRunnerService"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import "./AIAgentInterface.css"
import { PreviewPanel } from "./PreviewPanel"

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

export interface PreviewPanelProps {
  runnerName: string
  files: Record<string, FileChange>
  onRefresh: () => void
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
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>('claude-3-5-sonnet-20241022')

  const claudeService = useRef<ClaudeAPIService | null>(null)
  const fileManager = useRef<FileManagerService | null>(null)
  const commandExecutor = useRef<CommandExecutorService | null>(null)

  // Hook to refresh runners in the main UI
  const { refresh: refreshRunners } = useRunnerRefresh()

    useEffect(() => {
    // Check if API key is already stored
    const storedKey = localStorage.getItem("claude-api-key")
    const storedModel = localStorage.getItem("claude-model") as ClaudeModelId

    let modelToUse = selectedModel
    if (storedModel && Object.keys(CLAUDE_MODELS).includes(storedModel)) {
      setSelectedModel(storedModel)
      modelToUse = storedModel
    }

    if (storedKey) {
      setApiKey(storedKey)
      claudeService.current = new ClaudeAPIService(storedKey, modelToUse)
    } else {
      setShowApiKeyPrompt(true)
    }

    fileManager.current = new FileManagerService()
    commandExecutor.current = new CommandExecutorService()
  }, [])

  const handleSetApiKey = (key: string) => {
    setApiKey(key)
    localStorage.setItem("claude-api-key", key)
    localStorage.setItem("claude-model", selectedModel)
    claudeService.current = new ClaudeAPIService(key, selectedModel)
    setShowApiKeyPrompt(false)

    // Reset the initial prompt sent flag so it can be sent now that we have the API key
    initialPromptSentRef.current = false
  }

  const handleModelChange = (model: ClaudeModelId) => {
    setSelectedModel(model)
    localStorage.setItem("claude-model", model)

    // If we already have a service, update its model
    if (claudeService.current) {
      claudeService.current.setModel(model)
    }
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
              <div className="model-selector-container" style={{ marginTop: '16px' }}>
                <label htmlFor="model-selector" className="model-selector-label" style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: 'var(--foreground)'
                }}>
                  Model:
                </label>
                <select
                  id="model-selector"
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value as ClaudeModelId)}
                  className="api-key-input"
                  style={{
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 12px center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '16px',
                    paddingRight: '40px'
                  }}
                >
                  {Object.entries(CLAUDE_MODELS).map(([modelId, displayName]) => (
                    <option key={modelId} value={modelId}>
                      {displayName}
                    </option>
                  ))}
                </select>
              </div>
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
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
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
