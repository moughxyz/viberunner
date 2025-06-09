import React, { useState } from "react"
import { Info } from "lucide-react"
import "./APIKeyPrompt.css"

interface APIKeyPromptProps {
  onSetApiKey: (key: string) => void
  onClose?: () => void
}

const APIKeyPrompt: React.FC<APIKeyPromptProps> = ({ onSetApiKey, onClose }) => {
  const [apiKey, setApiKey] = useState<string>("")

  const handleSetApiKey = () => {
    if (apiKey.trim()) {
      onSetApiKey(apiKey.trim())
    }
  }

  return (
    <div id="api-key-prompt" className="api-key-prompt">
      <div className="api-key-container">
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
                    handleSetApiKey()
                  }
                }}
                className="api-key-input"
              />
            </div>

            <div className="api-key-buttons">
              <button
                id="api-key-cancel-btn"
                onClick={onClose}
                className="api-key-cancel-btn"
              >
                Cancel
              </button>
              <button
                id="api-key-continue-btn"
                onClick={handleSetApiKey}
                disabled={!apiKey.trim()}
                className="api-key-continue-btn"
              >
                Continue
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

        <div className="api-key-info-box">
          <Info className="api-key-info-icon" size={16} />
          <p className="api-key-info-text">
            <strong>Runners </strong>(apps you create with Viberunner) have deep system access and can do anything you can do. Take care when running LLM-generated code.
          </p>
        </div>
      </div>
    </div>
  )
}

export default APIKeyPrompt