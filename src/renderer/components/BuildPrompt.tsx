import React, { useState, useEffect } from "react"
import "./BuildPrompt.css"
import { templates } from "../prompts/templates"
import { CLAUDE_MODELS, ClaudeModelId } from "../services/ClaudeAPIService"
import { FileManagerService } from "../services/FileManagerService"
import ModelPicker from "./ModelPicker"

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
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(
    "claude-3-5-sonnet-20241022"
  )
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [isCreatingRunner, setIsCreatingRunner] = useState(false)

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
  }

  const handleCreateWithCursor = async () => {
    try {
      setIsCreatingRunner(true)

      const fileManager = new FileManagerService()
      const runnerName = await fileManager.createRunnerForCursor()

      alert(`Created runner "${runnerName}" and opened with Cursor!`)
    } catch (error) {
      console.error("Error creating runner with Cursor:", error)
      alert(
        `Error creating runner: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    } finally {
      setIsCreatingRunner(false)
    }
  }

  const ModelStatus = () => (
    <div className="model-status">
      Using {CLAUDE_MODELS[selectedModel]}{" "}
      <button
        onClick={() => setShowModelPicker(true)}
        className="model-change-button"
      >
        Change
      </button>
      <button
        onClick={handleCreateWithCursor}
        disabled={isCreatingRunner}
        className="create-cursor-button"
      >
        {isCreatingRunner ? "Creating..." : "Create with Cursor"}
      </button>
    </div>
  )



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
        <ModelPicker
          isVisible={showModelPicker}
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          onClose={() => setShowModelPicker(false)}
        />
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
              What would you like to{" "}
              <span className="title-gradient">build</span>?
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
      <ModelPicker
        isVisible={showModelPicker}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        onClose={() => setShowModelPicker(false)}
      />
    </>
  )
}

export default BuildPrompt
