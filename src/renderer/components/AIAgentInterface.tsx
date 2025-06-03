import React, { useState, useRef, useEffect } from 'react'
import ChatInterface from './ChatInterface'
import CodeEditor from './CodeEditor'
import { ClaudeAPIService } from '../services/ClaudeAPIService'
import { FileManagerService } from '../services/FileManagerService'
import { CommandExecutorService } from '../services/CommandExecutorService'
import '../styles/AIAgentInterface.css'

export interface FileChange {
  path: string
  content: string
  language: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  fileChanges?: FileChange[]
  commands?: string[]
}

interface AIAgentInterfaceProps {
  onClose?: () => void
  inTab?: boolean
}

const AIAgentInterface: React.FC<AIAgentInterfaceProps> = ({ onClose, inTab = false }) => {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [apiKey, setApiKey] = useState<string>('')
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false)
  const [currentFiles, setCurrentFiles] = useState<Record<string, FileChange>>({})
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [runnerName, setRunnerName] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  const claudeService = useRef<ClaudeAPIService | null>(null)
  const fileManager = useRef<FileManagerService | null>(null)
  const commandExecutor = useRef<CommandExecutorService | null>(null)

  useEffect(() => {
    // Check if API key is already stored
    const storedKey = localStorage.getItem('claude-api-key')
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
    localStorage.setItem('claude-api-key', key)
    claudeService.current = new ClaudeAPIService(key)
    setShowApiKeyPrompt(false)
  }

  const handleSendMessage = async (content: string) => {
    if (!claudeService.current) {
      setShowApiKeyPrompt(true)
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await claudeService.current.sendMessage(content, messages)

      // Parse the response for file changes and commands
      const { parsedContent, fileChanges, commands } = parseAssistantResponse(response.content)

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: parsedContent,
        timestamp: new Date(),
        fileChanges,
        commands
      }

      setMessages(prev => [...prev, assistantMessage])

      // Update current files with any changes
      if (fileChanges && fileChanges.length > 0) {
        const newFiles = { ...currentFiles }
        fileChanges.forEach(change => {
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
          const packageJsonFile = fileChanges.find(f => f.path === 'package.json')
          if (packageJsonFile) {
            try {
              const packageJson = JSON.parse(packageJsonFile.content)
              if (packageJson.viberunner?.name) {
                currentRunnerName = packageJson.viberunner.name.toLowerCase().replace(/\s+/g, '-')
                setRunnerName(currentRunnerName)
              }
            } catch (error) {
              console.warn('Could not parse package.json for runner name')
            }
          }
        }

        // Auto-save files immediately when AI generates them
        if (fileManager.current) {
          try {
            const generatedName = currentRunnerName || `ai-runner-${Date.now()}`
            const savedName = await fileManager.current.createRunner(generatedName, newFiles)

            // Update runner name to the sanitized version
            if (!runnerName) {
              setRunnerName(savedName)
              currentRunnerName = savedName
            }

            console.log(`Auto-saved runner: ${savedName}`)

            // Execute commands immediately after saving files
            if (commands && commands.length > 0) {
              for (const command of commands) {
                try {
                  console.log('Executing command on saved runner:', command)

                  const result = await commandExecutor.current?.executeCommand(command, savedName)

                  // Add command result to chat
                  const resultMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: result?.success
                      ? `✅ Command executed successfully:\n\`\`\`\n${command}\n\`\`\`\n\n${result.output}`
                      : `❌ Command failed:\n\`\`\`\n${command}\n\`\`\`\n\nError: ${result?.error || 'Unknown error'}`,
                    timestamp: new Date()
                  }

                  setMessages(prev => [...prev, resultMessage])

                } catch (error) {
                  console.error('Error executing command:', error)

                  const errorMessage: Message = {
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: `❌ Command execution failed:\n\`\`\`\n${command}\n\`\`\`\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    timestamp: new Date()
                  }

                  setMessages(prev => [...prev, errorMessage])
                }
              }
            }

          } catch (error) {
            console.error('Auto-save failed:', error)
            // Show error message but continue
            const errorMessage: Message = {
              id: Date.now().toString(),
              role: 'assistant',
              content: `⚠️ Auto-save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
          }
        }
      }

    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const parseAssistantResponse = (content: string) => {
    const fileChanges: FileChange[] = []
    const commands: string[] = []
    let parsedContent = content

    // Extract RunnerArtifact tags
    const artifactRegex = /<RunnerArtifact name="([^"]+)">([\s\S]*?)<\/RunnerArtifact>/g
    let match
    while ((match = artifactRegex.exec(content)) !== null) {
      const filePath = match[1]
      const fileContent = match[2].trim()
      const language = getLanguageFromPath(filePath)

      fileChanges.push({
        path: filePath,
        content: fileContent,
        language
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
      .replace(/<RunnerArtifact name="[^"]+">[\s\S]*?<\/RunnerArtifact>/g, '')
      .replace(/<RunnerCommand>[\s\S]*?<\/RunnerCommand>/g, '')
      .trim()

    return { parsedContent, fileChanges, commands }
  }

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'tsx': case 'jsx': return 'typescript'
      case 'ts': return 'typescript'
      case 'js': return 'javascript'
      case 'json': return 'json'
      case 'css': return 'css'
      case 'html': return 'html'
      case 'md': return 'markdown'
      default: return 'text'
    }
  }

  const handleSaveRunner = async () => {
    if (!fileManager.current || Object.keys(currentFiles).length === 0) {
      return
    }

    setIsSaving(true)
    try {
      const generatedName = runnerName || `ai-runner-${Date.now()}`
      const savedName = await fileManager.current.createRunner(generatedName, currentFiles)

      // Update runner name to the sanitized version
      setRunnerName(savedName)

      // Show success message
      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ Runner "${savedName}" has been successfully created and saved!\n\nYou can now build it by running:\n\`\`\`\nnpm run build\n\`\`\``,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, successMessage])

      // Automatically try to build the runner
      if (commandExecutor.current) {
        try {
          const buildResult = await commandExecutor.current.executeCommand('npm run build', savedName)

          const buildMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: buildResult.success
              ? `🎉 Runner built successfully! It's now ready to use in Viberunner.\n\n${buildResult.output}`
              : `⚠️ Runner saved but build failed. You may need to fix some issues:\n\n${buildResult.error}`,
            timestamp: new Date()
          }

          setMessages(prev => [...prev, buildMessage])
        } catch (buildError) {
          console.error('Auto-build failed:', buildError)
        }
      }

    } catch (error) {
      console.error('Error saving runner:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Error saving runner: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileChange = (path: string, content: string) => {
    setCurrentFiles(prev => ({
      ...prev,
      [path]: {
        ...prev[path],
        content
      }
    }))
  }

  if (showApiKeyPrompt) {
    return (
      <div className="ai-agent-interface">
        <div className="api-key-prompt">
          <div className="api-key-card">
            <h2>Claude API Key Required</h2>
            <p>To use the AI Agent for creating runners, please provide your Claude API key.</p>
            <input
              type="password"
              placeholder="Enter your Claude API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && apiKey.trim()) {
                  handleSetApiKey(apiKey.trim())
                }
              }}
            />
            <div className="api-key-actions">
              <button
                onClick={() => handleSetApiKey(apiKey.trim())}
                disabled={!apiKey.trim()}
              >
                Continue
              </button>
              <button onClick={onClose} className="cancel-btn">
                Cancel
              </button>
            </div>
            <div className="api-key-help">
              <p>Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">Anthropic Console</a></p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`ai-agent-interface ${inTab ? 'ai-agent-in-tab' : ''}`}>
      {!inTab && (
        <div className="ai-agent-header">
          <div className="ai-agent-title">
            <h2>AI Runner Builder</h2>
            <div className="runner-name-input">
              <input
                type="text"
                placeholder="Runner name (optional)"
                value={runnerName}
                onChange={(e) => setRunnerName(e.target.value)}
              />
            </div>
          </div>
          <div className="ai-agent-actions">
            <button
              onClick={handleSaveRunner}
              disabled={Object.keys(currentFiles).length === 0 || isSaving}
              className="save-btn"
            >
              {isSaving ? 'Saving...' : 'Save & Build Runner'}
            </button>
            <button onClick={onClose} className="close-btn">
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="ai-agent-content">
        <div className="chat-column">
          {inTab && (
            <div className="tab-agent-header">
              <div className="runner-name-input">
                <input
                  type="text"
                  placeholder="Runner name (optional)"
                  value={runnerName}
                  onChange={(e) => setRunnerName(e.target.value)}
                />
              </div>
              <button
                onClick={handleSaveRunner}
                disabled={Object.keys(currentFiles).length === 0 || isSaving}
                className="save-btn"
              >
                {isSaving ? 'Saving...' : 'Save & Build Runner'}
              </button>
            </div>
          )}
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>

        <div className="editor-column">
          <CodeEditor
            files={currentFiles}
            activeFile={activeFile}
            onFileSelect={setActiveFile}
            onFileChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  )
}

export default AIAgentInterface