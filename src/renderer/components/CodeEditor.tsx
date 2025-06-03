import React, { useEffect, useRef, useState } from 'react'
import { FileChange } from './AIAgentInterface'

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
  onFileChange
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
      console.error('Failed to load Monaco Editor:', error)
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
      <div className="editor-header">
        <h3>Generated Files</h3>
        <div className="file-count">
          {fileEntries.length} {fileEntries.length === 1 ? 'file' : 'files'}
        </div>
      </div>

      {fileEntries.length === 0 ? (
        <div className="editor-empty">
          <div className="empty-icon">📄</div>
          <h4>No files yet</h4>
          <p>Start a conversation with the AI to generate runner files.</p>
        </div>
      ) : (
        <>
          <div className="file-tabs">
            {fileEntries.map(([path, file]) => (
              <div
                key={path}
                className={`file-tab ${activeFile === path ? 'active' : ''}`}
                onClick={() => onFileSelect(path)}
              >
                <span className="file-icon">
                  {getFileIcon(file.language)}
                </span>
                <span className="file-name">
                  {path.split('/').pop()}
                </span>
              </div>
            ))}
          </div>

          <div className="editor-content">
            {isLoading ? (
              <div className="editor-loading">
                <div className="loading-spinner">⟳</div>
                Loading editor...
              </div>
            ) : currentFile ? (
              <div className="editor-container">
                <div className="editor-toolbar">
                  <div className="file-path">{activeFile}</div>
                  <div className="language-badge">
                    {currentFile.language}
                  </div>
                </div>

                {/* Simple textarea for now - replace with Monaco in production */}
                <textarea
                  ref={textareaRef}
                  className="simple-editor"
                  value={currentFile.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  spellCheck={false}
                  placeholder="File content will appear here..."
                />
              </div>
            ) : (
              <div className="editor-placeholder">
                <p>Select a file to view its contents</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* File structure preview */}
      {fileEntries.length > 0 && (
        <div className="file-structure">
          <div className="structure-header">
            <h4>File Structure</h4>
          </div>
          <div className="structure-tree">
            {fileEntries.map(([path, file]) => (
              <div key={path} className="structure-item">
                <span className="structure-icon">
                  {getFileIcon(file.language)}
                </span>
                <span className="structure-path">{path}</span>
                <span className="structure-size">
                  {file.content.length} chars
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const getFileIcon = (language: string): string => {
  switch (language) {
    case 'typescript':
    case 'javascript':
      return '📜'
    case 'json':
      return '⚙️'
    case 'css':
      return '🎨'
    case 'html':
      return '🌐'
    case 'markdown':
      return '📝'
    default:
      return '📄'
  }
}

export default CodeEditor