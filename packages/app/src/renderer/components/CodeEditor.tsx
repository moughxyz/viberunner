import React, { useEffect, useRef, useState } from "react"
import { FileChange } from "./AIAgentInterface"
import "./CodeEditor.css"

// Monaco editor interface (we'll load it dynamically)
interface MonacoEditor {
  editor: any
  monaco: any
}

interface CodeEditorProps {
  files: Record<string, FileChange>
  activeFile: string | null
  onFileSelect: (path: string) => void
  onFileChange: (path: string, content: string) => void
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  activeFile,
  onFileSelect,
  onFileChange,
}) => {
  const editorRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [monaco, setMonaco] = useState<MonacoEditor | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load Monaco Editor dynamically
    loadMonacoEditor()
  }, [])

  useEffect(() => {
    if (monaco && activeFile && files[activeFile]) {
      updateEditorContent()
    }
  }, [monaco, activeFile, files])

  const loadMonacoEditor = async () => {
    try {
      // For now, we'll use a simplified text editor
      // In a real implementation, you'd load Monaco from CDN or bundle it
      setIsLoading(false)
      setMonaco({ editor: null, monaco: null })
    } catch (error) {
      console.error("Failed to load Monaco Editor:", error)
      setIsLoading(false)
    }
  }

  const updateEditorContent = () => {
    if (!activeFile || !files[activeFile]) return

    const file = files[activeFile]

    // If Monaco is available, update the editor
    if (monaco?.editor && editorRef.current) {
      const model = editorRef.current.getModel()
      if (model) {
        model.setValue(file.content)
      }
    }
  }

  const handleContentChange = (content: string) => {
    if (activeFile) {
      onFileChange(activeFile, content)
    }
  }

  const fileEntries = Object.entries(files)
  const currentFile = activeFile ? files[activeFile] : null

  return (
    <div className="code-editor">
      {fileEntries.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📄</div>
          <h4 className="empty-state-title">No files yet</h4>
          <p className="empty-state-description">
            Start a conversation with the AI to generate runner files.
          </p>
        </div>
      ) : (
        <div id="editor-content" className="editor-content">
          {/* Editor Content */}
          <div className="editor-main">
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-content">
                  <div className="loading-spinner">⟳</div>
                  <p className="loading-text">Loading editor...</p>
                </div>
              </div>
            ) : currentFile ? (
              <div className="editor-container">
                {/* Editor Toolbar */}
                <div className="editor-toolbar">
                  <div className="editor-toolbar-filename">
                    {activeFile}
                  </div>
                  <div className="editor-toolbar-language">
                    {currentFile.language}
                  </div>
                </div>

                {/* Editor */}
                <div className="editor-wrapper">
                  <textarea
                    ref={textareaRef}
                    className="editor-textarea"
                    value={currentFile.content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    spellCheck={false}
                    placeholder="File content will appear here..."
                    style={{
                      fontFamily:
                        'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="no-file-selected">
                <p className="no-file-text">
                  Select a file to view its contents
                </p>
              </div>
            )}

            {/* File Structure Sidebar */}
            {fileEntries.length > 0 && (
              <div className="file-sidebar">
                <div className="file-sidebar-header">
                  <h4 className="file-sidebar-title">
                    File Structure
                  </h4>
                </div>
                <div className="file-list">
                  {fileEntries.map(([path, file]) => (
                    <div
                      key={path}
                      className={`file-item ${
                        activeFile === path ? "active" : "inactive"
                      }`}
                      onClick={() => onFileSelect(path)}
                    >
                      <span className="file-icon">
                        {getFileIcon(file.language)}
                      </span>
                      <span className="file-name">{path}</span>
                      <span className="file-size">
                        {file.content.length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const getFileIcon = (language: string): string => {
  switch (language) {
    case "typescript":
    case "javascript":
      return "📜"
    case "json":
      return "⚙️"
    case "css":
      return "🎨"
    case "html":
      return "🌐"
    case "markdown":
      return "📝"
    default:
      return "📄"
  }
}

export default CodeEditor
