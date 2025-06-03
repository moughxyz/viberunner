import React, { useState, useRef, useEffect } from 'react'
import ChatInterface from './ChatInterface'
import CodeEditor from './CodeEditor'
import { ClaudeAPIService } from '../services/ClaudeAPIService'
import { FileManagerService } from '../services/FileManagerService'
import { CommandExecutorService } from '../services/CommandExecutorService'
import { getRunnersDirectory } from '../util'
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

interface PreviewPanelProps {
  runnerName: string
  files: Record<string, FileChange>
  onRefresh: () => void
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ runnerName, files, onRefresh }) => {
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
      const fs = require('fs')
      const path = require('path')

      const RUNNERS_DIR = getRunnersDirectory()
      const runnerPath = path.join(RUNNERS_DIR, runnerName)
      const bundlePath = path.join(runnerPath, 'dist', 'bundle.iife.js')

      if (!fs.existsSync(bundlePath)) {
        setError('Runner not built yet. Build the runner to see preview.')
        setHasRunner(false)
        setIsLoading(false)
        return
      }

      const bundleContent = fs.readFileSync(bundlePath, 'utf-8')

      // Clear the container
      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML = ''
      }

      // Clean up previous root if it exists
      if (reactRootRef.current) {
        try {
          reactRootRef.current.unmount()
        } catch (e) {
          console.warn('Error unmounting previous preview:', e)
        }
        reactRootRef.current = null
      }

      // Load and render the runner similar to how App.tsx does it
      const script = document.createElement('script')
      script.type = 'text/javascript'

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
            throw new Error('Preview container not available')
          }

          // Create isolation wrapper
          const isolationWrapper = document.createElement('div')
          isolationWrapper.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            position: relative !important;
            overflow: auto !important;
            display: block !important;
            contain: layout style !important;
            isolation: isolate !important;
          `
          isolationWrapper.setAttribute('data-app-id', previewId)

          previewContainerRef.current.appendChild(isolationWrapper)

          // Use the global ReactDOM.createRoot that's already exposed for runners
          const { createRoot } = (window as any).ReactDOM
          if (!createRoot) {
            throw new Error('ReactDOM.createRoot not available globally')
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
            throw new Error('Global React not available')
          }

          root.render(globalReact.createElement(RunnerComponent, props))

          // Set success states only after successful rendering
          setHasRunner(true)
          setError(null)
          setIsLoading(false)
        } catch (error) {
          console.error('Error rendering preview:', error)
          setError(`Preview error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
        console.error('Script loading error:', error)
        setError('Failed to load runner script')
        setHasRunner(false)
        setIsLoading(false)
      }

      document.head.appendChild(script)

    } catch (error) {
      console.error('Error loading runner preview:', error)
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
          console.warn('Error unmounting preview on cleanup:', e)
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
      <div className="preview-panel">
        <div className="preview-empty">
          <div className="empty-state">
            <div className="empty-icon">👁️</div>
            <h3>No Runner to Preview</h3>
            <p>Start building a runner in the chat to see a live preview here.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="preview-panel">
      <div className="preview-header">
        <div className="preview-title">
          <span className="preview-icon">👁️</span>
          Preview: {runnerName}
        </div>
        <button
          onClick={handleRefresh}
          className="refresh-btn"
          disabled={isLoading}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="preview-content">
        {isLoading && (
          <div className="preview-loading">
            <div className="loading-spinner">⟳</div>
            <p>Loading preview...</p>
          </div>
        )}

        {error && (
          <div className="preview-error">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button onClick={handleRefresh} className="retry-btn">
              Try Again
            </button>
          </div>
        )}

        {!isLoading && !error && !hasRunner && (
          <div className="preview-empty">
            <div className="empty-state">
              <div className="empty-icon">🔧</div>
              <h3>Runner Not Built</h3>
              <p>Build the runner to see a preview here.</p>
              <button onClick={handleRefresh} className="refresh-btn">
                Check Again
              </button>
            </div>
          </div>
        )}

        <div
          ref={previewContainerRef}
          className="preview-runner-container"
          style={{
            width: '100%',
            height: '100%',
            display: hasRunner ? 'block' : 'none'
          }}
        />
      </div>
    </div>
  )
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
  const [rightPanelMode, setRightPanelMode] = useState<'preview' | 'files'>('preview')
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)
  const [isDiscarding, setIsDiscarding] = useState(false)
  const [isNewRunner, setIsNewRunner] = useState(true)

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

  const refreshPreview = () => {
    setPreviewRefreshKey(prev => prev + 1)
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
          role: 'assistant',
          content: `🗑️ Runner "${runnerName}" has been discarded and deleted.`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, discardMessage])

        // Clear the current state
        setRunnerName('')
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
      console.error('Error discarding runner:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Error discarding runner: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsDiscarding(false)
    }
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
            let savedName: string

            if (!runnerName) {
              // First time - create a new runner
              const generatedName = currentRunnerName || `ai-runner-${Date.now()}`
              savedName = await fileManager.current.createRunner(generatedName, newFiles)

              // Update runner name to the sanitized version
              setRunnerName(savedName)
              currentRunnerName = savedName
              // Keep isNewRunner as true since this is auto-save of a new runner
            } else {
              // Already have a runner - update the existing one
              savedName = await fileManager.current.updateRunner(runnerName, newFiles)
              currentRunnerName = runnerName
              // Keep isNewRunner state as-is since we're updating existing
            }

            console.log(`${runnerName ? 'Updated' : 'Created'} runner: ${savedName}`)

            // Execute commands immediately after saving files
            if (commands && commands.length > 0) {
              for (const command of commands) {
                try {
                  console.log('Executing command on saved runner:', command)

                  const result = await commandExecutor.current?.executeCommand(command, currentRunnerName)

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

                  // If build command was successful, refresh the preview
                  if (result?.success && command.includes('build')) {
                    setTimeout(() => {
                      refreshPreview()
                    }, 1000) // Small delay to ensure build is complete
                  }

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
        content: `✅ Runner "${savedName}" has been successfully created and saved!`,
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
              ? `🎉 Runner built successfully!`
              : `⚠️ Runner saved but build failed. You may need to fix some issues:\n\n${buildResult.error}`,
            timestamp: new Date()
          }

          setMessages(prev => [...prev, buildMessage])

          // Don't auto-close the interface - let user decide when to close

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
              disabled={Object.keys(currentFiles).length === 0 || isSaving || isDiscarding}
              className="save-btn"
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleDiscard}
              disabled={isSaving || isDiscarding}
              className="discard-btn"
            >
              {isDiscarding ? 'Discarding...' : 'Discard'}
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
              <div className="tab-agent-actions">
                <button
                  onClick={handleSaveRunner}
                  disabled={Object.keys(currentFiles).length === 0 || isSaving || isDiscarding}
                  className="save-btn"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleDiscard}
                  disabled={isSaving || isDiscarding}
                  className="discard-btn"
                >
                  {isDiscarding ? 'Discarding...' : 'Discard'}
                </button>
              </div>
            </div>
          )}
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
          />
        </div>

        <div className="right-panel">
          <div className="right-panel-tabs">
            <button
              className={`tab-btn ${rightPanelMode === 'preview' ? 'active' : ''}`}
              onClick={() => setRightPanelMode('preview')}
            >
              👁️ Preview
            </button>
            <button
              className={`tab-btn ${rightPanelMode === 'files' ? 'active' : ''}`}
              onClick={() => setRightPanelMode('files')}
            >
              📁 Files
            </button>
          </div>

          <div className="right-panel-content">
            {rightPanelMode === 'preview' ? (
              <PreviewPanel
                runnerName={runnerName}
                files={currentFiles}
                onRefresh={refreshPreview}
                key={previewRefreshKey}
              />
            ) : (
              <CodeEditor
                files={currentFiles}
                activeFile={activeFile}
                onFileSelect={setActiveFile}
                onFileChange={handleFileChange}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIAgentInterface