import React, { useEffect, useRef, useState } from "react"
import { FileChange } from "./AIAgentInterface"

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
    <div className="flex flex-col h-full bg-neutral-900 border border-neutral-800">
      {fileEntries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-4xl mb-4 opacity-50">📄</div>
          <h4 className="text-white font-medium text-lg mb-2">No files yet</h4>
          <p className="text-neutral-400 text-sm text-center max-w-xs">
            Start a conversation with the AI to generate runner files.
          </p>
        </div>
      ) : (
        <div id="editor-content" className="flex-1 flex flex-col min-h-0">
          {/* Editor Content */}
          <div className="flex-1 flex min-h-0">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-2 animate-spin">⟳</div>
                  <p className="text-neutral-400 text-sm">Loading editor...</p>
                </div>
              </div>
            ) : currentFile ? (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Editor Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-neutral-800 border-b border-neutral-700">
                  <div className="text-neutral-300 text-xs font-mono truncate">
                    {activeFile}
                  </div>
                  <div className="bg-neutral-700 text-neutral-300 px-2 py-1 rounded text-xs font-medium">
                    {currentFile.language}
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    className="absolute inset-0 w-full h-full bg-neutral-900 text-white text-sm font-mono leading-relaxed p-4 border-0 resize-none focus:outline-none focus:ring-1 focus:ring-neutral-600"
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
              <div className="flex-1 flex items-center justify-center">
                <p className="text-neutral-400 text-sm">
                  Select a file to view its contents
                </p>
              </div>
            )}

            {/* File Structure Sidebar */}
            {fileEntries.length > 0 && (
              <div className="w-64 border-l border-neutral-800 bg-neutral-900/50">
                <div className="px-4 py-3 border-b border-neutral-800">
                  <h4 className="text-white font-medium text-sm">
                    File Structure
                  </h4>
                </div>
                <div className="p-2">
                  {fileEntries.map(([path, file]) => (
                    <div
                      key={path}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                        activeFile === path
                          ? "bg-neutral-700 text-white"
                          : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                      }`}
                      onClick={() => onFileSelect(path)}
                    >
                      <span className="text-sm flex-shrink-0">
                        {getFileIcon(file.language)}
                      </span>
                      <span className="flex-1 font-mono truncate">{path}</span>
                      <span className="text-neutral-500 text-xs flex-shrink-0">
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
