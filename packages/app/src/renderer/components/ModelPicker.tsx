import React from "react"
import { CLAUDE_MODELS, ClaudeModelId } from "../services/ClaudeAPIService"
import "./ModelPicker.css"

interface ModelPickerProps {
  isVisible: boolean
  selectedModel: ClaudeModelId
  onModelChange: (model: ClaudeModelId) => void
  onClose: () => void
}

const ModelPicker: React.FC<ModelPickerProps> = ({
  isVisible,
  selectedModel,
  onModelChange,
  onClose,
}) => {
  if (!isVisible) return null

  const handleModelChange = (model: ClaudeModelId) => {
    onModelChange(model)
    onClose()
  }

  return (
    <div className="model-picker-overlay">
      <div className="model-picker-modal">
        <h3 className="model-picker-title">Choose AI Model</h3>

        <div className="model-picker-options">
          {Object.entries(CLAUDE_MODELS).map(([modelId, displayName]) => (
            <button
              key={modelId}
              onClick={() => handleModelChange(modelId as ClaudeModelId)}
              className={`model-option-button ${
                selectedModel === modelId ? "selected" : ""
              }`}
            >
              <div className="model-option-name">{displayName}</div>
              {modelId === "claude-opus-4-20250514" && (
                <div className="model-option-description">
                  Most capable, best for complex tasks
                </div>
              )}
              {modelId === "claude-sonnet-4-20250514" && (
                <div className="model-option-description">
                  High-performance with superior reasoning
                </div>
              )}
              {modelId === "claude-3-5-sonnet-20241022" && (
                <div className="model-option-description">
                  Fast and efficient
                </div>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="model-picker-cancel"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default ModelPicker