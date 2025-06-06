import React, { useRef, useState, useEffect } from "react"
import {
  getRunnersDirectory,
  createRunnerLoader,
  getRunnerUserDataDirectory,
} from "../util"
import { PreviewPanelProps } from "./AIAgentInterface"
import { FileInput } from "../types"
import "./PreviewPanel.css"

// Direct Node.js access
const fs = require("fs")
const path = require("path")
const mime = require("mime-types")

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  runnerName,
  files,
  onRefresh,
}) => {
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRunner, setHasRunner] = useState(false)
  const [fileInput, setFileInput] = useState<FileInput | undefined>(undefined)
  const [isDragOver, setIsDragOver] = useState(false)
  const reactRootRef = useRef<any>(null)

  const loadRunner = async () => {
    if (!runnerName || Object.keys(files).length === 0) {
      setHasRunner(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
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

      const runnerLoader = previewContainerRef.current
        ? createRunnerLoader({
            container: previewContainerRef.current,
            appId: previewId,
            props: {
              tabId: previewId,
              dataDirectory: getRunnerUserDataDirectory(runnerName),
              fileInput: fileInput,
            },
            useGlobalReact: true,
            onSuccess: (root) => {
              reactRootRef.current = root
              setHasRunner(true)
              setError(null)
              setIsLoading(false)
            },
            onError: (error) => {
              console.error("Error rendering preview:", error)
              setError(`Preview error: ${error.message}`)
              setHasRunner(false)
              setIsLoading(false)
            },
          })
        : () => {
            setError("Preview container not available")
            setHasRunner(false)
            setIsLoading(false)
          }
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

  // Handle file drop
  const handleFileDrop = async (filePath: string) => {
    try {
      console.log("PreviewPanel: File dropped:", filePath)

      // Get file stats and create FileInput
      const stats = fs.statSync(filePath)
      const mimetype = stats.isDirectory()
        ? "inode/directory"
        : mime.lookup(filePath) || "application/octet-stream"

      const newFileInput: FileInput = {
        path: filePath,
        mimetype: mimetype,
      }

      console.log("PreviewPanel: File input created:", newFileInput)
      setFileInput(newFileInput)
    } catch (error) {
      console.error("Error handling file drop in preview:", error)
      setError(`Error handling file: ${error}`)
    }
  }

  // Drag and drop event handlers
  useEffect(() => {
    const previewContainer = previewContainerRef.current
    if (!previewContainer) return

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragOver(true)
    }

    const handleDragLeave = (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      // Only set drag over to false if we're leaving the container entirely
      if (!previewContainer.contains(event.relatedTarget as Node)) {
        setIsDragOver(false)
      }
    }

    const handleDrop = (event: DragEvent) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragOver(false)

      const filePath = event.dataTransfer?.files[0]?.path
      if (filePath) {
        handleFileDrop(filePath)
      }
    }

    previewContainer.addEventListener("dragover", handleDragOver)
    previewContainer.addEventListener("dragleave", handleDragLeave)
    previewContainer.addEventListener("drop", handleDrop)

    return () => {
      previewContainer.removeEventListener("dragover", handleDragOver)
      previewContainer.removeEventListener("dragleave", handleDragLeave)
      previewContainer.removeEventListener("drop", handleDrop)
    }
  }, [hasRunner])

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
  }, [runnerName, files, fileInput])

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
      {fileInput && (
        <div className="preview-file-info">
          <div className="file-info-content">
            <span className="file-info-label">File Input:</span>
            <span className="file-info-path">
              {path.basename(fileInput.path)}
            </span>
            <button
              className="file-info-clear"
              onClick={() => setFileInput(undefined)}
              title="Clear file input"
            >
              ×
            </button>
          </div>
        </div>
      )}
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
        className={`preview-container ${hasRunner ? "visible" : "hidden"} ${
          isDragOver ? "drag-over" : ""
        }`}
      />
    </div>
  )
}
