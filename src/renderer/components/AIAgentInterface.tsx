import React, { useState, useRef, useEffect, useCallback } from "react"
import ChatInterface from "./ChatInterface"
import CodeEditor from "./CodeEditor"
import APIKeyPrompt from "./APIKeyPrompt"
import Icon from "./Icon"
import {
  ClaudeAPIService,
  ClaudeModelId,
  getLastSelectedModel,
  saveSelectedModel,
} from "../services/ClaudeAPIService"
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
  existingRunnerName?: string
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
  existingRunnerName,
}) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false)
  const [currentFiles, setCurrentFiles] = useState<Record<string, FileChange>>(
    {}
  )
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [runnerName, setRunnerName] = useState<string>(existingRunnerName || "")
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [isNewRunner, setIsNewRunner] = useState(!existingRunnerName)
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeTab, setActiveTab] = useState("preview")
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(
    getLastSelectedModel()
  )

  const claudeService = useRef<ClaudeAPIService | null>(null)
  const fileManager = useRef<FileManagerService | null>(null)
  const commandExecutor = useRef<CommandExecutorService | null>(null)

  // Hook to refresh runners in the main UI
  const { refresh: refreshRunners } = useRunnerRefresh()

  useEffect(() => {
    // Check if API key is already stored
    const storedKey = localStorage.getItem("claude-api-key")
    const lastSelectedModel = getLastSelectedModel()

    // Update the selected model to the last selected one
    setSelectedModel(lastSelectedModel)

    if (storedKey) {
      claudeService.current = new ClaudeAPIService(storedKey, lastSelectedModel)
    } else {
      setShowApiKeyPrompt(true)
    }

    fileManager.current = new FileManagerService()
    commandExecutor.current = new CommandExecutorService()
  }, [])

  // Load existing runner files if provided
  useEffect(() => {
    const loadExistingRunner = async () => {
      if (existingRunnerName && fileManager.current) {
        try {
          console.log("Loading existing runner:", existingRunnerName)
          const existingFiles = await fileManager.current.loadRunnerFiles(
            existingRunnerName
          )
          setCurrentFiles(existingFiles)

          // Set the first file as active if we have files
          const fileKeys = Object.keys(existingFiles)
          if (fileKeys.length > 0) {
            // Prefer App.tsx or similar main files
            const mainFile =
              fileKeys.find(
                (f) =>
                  f.includes("App.tsx") ||
                  f.includes("App.jsx") ||
                  f.includes("index.tsx") ||
                  f.includes("index.jsx")
              ) || fileKeys[0]
            setActiveFile(mainFile)
          }

          // Add a message indicating we're editing an existing runner
          const welcomeMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: `✏️ Editing runner "${existingRunnerName}". I've loaded ${fileKeys.length} files. How can I help you improve this runner?`,
            timestamp: new Date(),
          }
          setMessages([welcomeMessage])
        } catch (error) {
          console.error("Error loading existing runner:", error)
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: `❌ Error loading runner "${existingRunnerName}": ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            timestamp: new Date(),
          }
          setMessages([errorMessage])
        }
      }
    }

    loadExistingRunner()
  }, [existingRunnerName])

  const handleSetApiKey = (key: string) => {
    localStorage.setItem("claude-api-key", key)
    claudeService.current = new ClaudeAPIService(key, selectedModel)
    setShowApiKeyPrompt(false)

    // Reset the initial prompt sent flag so it can be sent now that we have the API key
    initialPromptSentRef.current = false
  }

  const handleModelChange = (model: ClaudeModelId) => {
    setSelectedModel(model)
    saveSelectedModel(model)

    // If we already have a service, update its model
    if (claudeService.current) {
      claudeService.current.setModel(model)
    }
  }

  const handleDiscard = async () => {
    if (!runnerName) {
      return
    }

    if (isNewRunner) {
      // For new runners, show confirmation dialog to delete
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
    } else {
      // For existing runners, revert changes
      const confirmed = window.confirm(
        `Are you sure you want to revert all changes to "${runnerName}"?\n\nThis will restore the runner to its original state and discard any modifications made in this session.`
      )

      if (!confirmed) {
        return
      }

      setIsDiscarding(true)
      try {
        if (fileManager.current && existingRunnerName) {
          // Reload the original files
          const originalFiles = await fileManager.current.loadRunnerFiles(
            existingRunnerName
          )
          setCurrentFiles(originalFiles)

          // Show success message
          const revertMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: `↩️ Changes to runner "${runnerName}" have been reverted to the original state.`,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, revertMessage])

          // Close the AI Agent after a short delay
          setTimeout(() => {
            if (onClose) {
              onClose()
            }
          }, 1500)
        }
      } catch (error) {
        console.error("Error reverting runner changes:", error)
        const errorMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `❌ Error reverting changes: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
      } finally {
        setIsDiscarding(false)
      }
    }
  }

  const handleSendMessage = useCallback(
    async (content: string) => {
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
          messages,
          currentFiles
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

              if (isNewRunner && !runnerName) {
                // First time creating a new runner
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
                // Already have a runner name - update the existing one
                savedName = await fileManager.current.updateRunner(
                  currentRunnerName || runnerName,
                  newFiles
                )
                currentRunnerName = currentRunnerName || runnerName
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

                    const result =
                      await commandExecutor.current?.executeCommand(
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
    },
    [
      messages,
      currentFiles,
      activeFile,
      runnerName,
      isNewRunner,
      refreshRunners,
    ]
  ) // Dependencies for useCallback

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
    if (
      initialPrompt &&
      initialPrompt.trim() &&
      !initialPromptSentRef.current &&
      claudeService.current &&
      !showApiKeyPrompt
    ) {
      // Wait for existing runner to load first if applicable
      const shouldWait =
        existingRunnerName && Object.keys(currentFiles).length === 0
      if (!shouldWait) {
        console.log(
          "Sending initial prompt:",
          initialPrompt.substring(0, 50) + "..."
        )
        initialPromptSentRef.current = true
        handleSendMessage(initialPrompt)
      }
    }
  }, [
    initialPrompt,
    claudeService.current,
    showApiKeyPrompt,
    currentFiles,
    existingRunnerName,
  ]) // Include currentFiles and existingRunnerName in dependencies

  if (showApiKeyPrompt) {
    return <APIKeyPrompt onSetApiKey={handleSetApiKey} onClose={onClose} />
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
                  {isNewRunner
                    ? "AI Runner Builder"
                    : `Editing Runner: ${runnerName}`}
                </CardTitle>
                <Input
                  id="runner-name-input"
                  type="text"
                  placeholder={
                    isNewRunner ? "Runner name (optional)" : "Runner name"
                  }
                  value={runnerName}
                  onChange={(e) => setRunnerName(e.target.value)}
                  className="runner-name-input"
                  disabled={!isNewRunner}
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
                  {isNewRunner ? "Done" : "Save Changes"}
                </Button>
                {Object.keys(currentFiles).length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={handleDiscard}
                    disabled={isDiscarding}
                    className="header-btn header-btn-secondary"
                  >
                    {isDiscarding
                      ? isNewRunner
                        ? "Discarding..."
                        : "Reverting..."
                      : isNewRunner
                      ? "Discard"
                      : "Revert Changes"}
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
                          <Icon name="preview" />
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
                          <Icon name="code" />
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
