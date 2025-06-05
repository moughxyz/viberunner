import React, { useState } from "react"
import { CLAUDE_MODELS, ClaudeModelId } from "../services/ClaudeAPIService"
import "./APIKeyPrompt.css"

interface APIKeyPromptProps {
  onSetApiKey: (key: string, model: ClaudeModelId) => void
  onClose?: () => void
}

const APIKeyPrompt: React.FC<APIKeyPromptProps> = ({ onSetApiKey, onClose }) => {
  const [apiKey, setApiKey] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>('claude-3-5-sonnet-20241022')

  const handleSetApiKey = () => {
    if (apiKey.trim()) {
      onSetApiKey(apiKey.trim(), selectedModel)
    }
  }

  const handleModelChange = (model: ClaudeModelId) => {
    setSelectedModel(model)
  }

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
                  handleSetApiKey()
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
              onClick={handleSetApiKey}
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

export default APIKeyPrompt