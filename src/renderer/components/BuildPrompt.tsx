import React, { useState, useEffect } from "react"
import "./BuildPrompt.css"
import { templates } from "../prompts/templates"
import { CLAUDE_MODELS, ClaudeModelId } from "../services/ClaudeAPIService"

interface BuildPromptProps {
  onSubmit?: (prompt: string) => void
  onModelChange?: (model: ClaudeModelId) => void
  selectedModel?: ClaudeModelId
  condensed?: boolean
}

const BuildPrompt: React.FC<BuildPromptProps> = ({
  onSubmit,
  onModelChange,
  selectedModel: propSelectedModel,
  condensed = false,
}) => {
  const [buildPrompt, setBuildPrompt] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>('claude-3-5-sonnet-20241022')
  const [showModelPicker, setShowModelPicker] = useState(false)

  // Initialize model from localStorage or props
  useEffect(() => {
    const storedModel = localStorage.getItem("claude-model") as ClaudeModelId
    if (storedModel && Object.keys(CLAUDE_MODELS).includes(storedModel)) {
      setSelectedModel(storedModel)
    } else if (propSelectedModel) {
      setSelectedModel(propSelectedModel)
    }
  }, [propSelectedModel])

  const handleSubmit = () => {
    if (buildPrompt.trim()) {
      onSubmit?.(buildPrompt.trim())
      setBuildPrompt("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

  const handleModelChange = (model: ClaudeModelId) => {
    setSelectedModel(model)
    localStorage.setItem("claude-model", model)
    onModelChange?.(model)
    setShowModelPicker(false)
  }

  const ModelStatus = () => (
    <div style={{
      marginTop: '8px',
      fontSize: '12px',
      color: 'var(--foreground)',
      opacity: 0.6,
      textAlign: 'center'
    }}>
      Using {CLAUDE_MODELS[selectedModel]} {' '}
      <button
        onClick={() => setShowModelPicker(true)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--foreground)',
          opacity: 0.8,
          textDecoration: 'underline',
          cursor: 'pointer',
          fontSize: '12px',
          padding: 0
        }}
      >
        Change
      </button>
    </div>
  )

  const ModelPicker = () => {
    if (!showModelPicker) return null

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'var(--background)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '400px'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--foreground)'
          }}>
            Choose AI Model
          </h3>

          <div style={{ marginBottom: '20px' }}>
            {Object.entries(CLAUDE_MODELS).map(([modelId, displayName]) => (
              <button
                key={modelId}
                onClick={() => handleModelChange(modelId as ClaudeModelId)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  marginBottom: '8px',
                  backgroundColor: selectedModel === modelId ? 'var(--accent)' : 'transparent',
                  color: selectedModel === modelId ? 'var(--accent-foreground)' : 'var(--foreground)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (selectedModel !== modelId) {
                    e.currentTarget.style.backgroundColor = 'var(--muted)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedModel !== modelId) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <div style={{ fontWeight: '500' }}>{displayName}</div>
                {modelId === 'claude-opus-4-20250514' && (
                  <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
                    Most capable, best for complex tasks
                  </div>
                )}
                {modelId === 'claude-sonnet-4-20250514' && (
                  <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
                    High-performance with superior reasoning
                  </div>
                )}
                {modelId === 'claude-3-5-sonnet-20241022' && (
                  <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
                    Fast and efficient
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowModelPicker(false)}
            style={{
              width: '100%',
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: 'var(--foreground)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  if (condensed) {
    return (
      <>
        <div className="build-prompt-condensed">
          {/* Condensed header */}
          <div className="header-condensed">
            <h2 className="title-condensed">
              Build something <span className="title-gradient">new</span>
            </h2>
            <p className="subtitle-condensed">
              Describe your system utility or productivity tool
            </p>
          </div>

          {/* Condensed input */}
          <div className="input-container-condensed">
            <div className="input-wrapper">
              <textarea
                value={buildPrompt}
                onChange={(e) => setBuildPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="I want to create..."
                rows={2}
                className="textarea-condensed"
              />

              {buildPrompt.trim() && (
                <button
                  onClick={handleSubmit}
                  className="submit-button-condensed"
                >
                  Create →
                </button>
              )}
            </div>
            <ModelStatus />
          </div>
        </div>
        <ModelPicker />
      </>
    )
  }

  // Full-screen mode (original design)
  return (
    <>
      <div className="build-prompt-container">
        {/* Background decoration */}
        <div className="background-decoration">
          <div className="background-blur-1"></div>
          <div className="background-blur-2"></div>
        </div>

        <div className="main-container">
          {/* Header */}
          <div className="header-full">
            <h1 className="title-full">
              What would you like to <span className="title-gradient">build</span>
              ?
            </h1>
            <p className="subtitle-full">
              Describe your system utility or productivity tool
            </p>
          </div>

          {/* Main input */}
          <div className="input-container-full">
            <div className="input-wrapper">
              <textarea
                value={buildPrompt}
                onChange={(e) => setBuildPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="I want to create..."
                rows={3}
                className="textarea-full"
              />

              {buildPrompt.trim() && (
                <button onClick={handleSubmit} className="submit-button-full">
                  Create →
                </button>
              )}
            </div>
            <ModelStatus />
          </div>

          {/* Examples */}
          <div className="examples-container">
            <p className="examples-title">Or try one of these ideas</p>
            <div className="examples-grid">
              {templates.map((template, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setBuildPrompt(template.prompt)
                    onSubmit?.(template.prompt)
                  }}
                  className="example-button"
                >
                  <div className="example-description">
                    {template.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ModelPicker />
    </>
  )
}

export default BuildPrompt
