import React, { useRef, useState, useEffect } from "react"
import { getRunnersDirectory, createRunnerLoader } from "../util"
import { PreviewPanelProps } from "./AIAgentInterface"
import "./PreviewPanel.css"

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
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

      const runnerLoader = previewContainerRef.current
        ? createRunnerLoader({
            container: previewContainerRef.current,
            appId: previewId,
            props: {
              tabId: previewId,
              runnerId: runnerName,
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
