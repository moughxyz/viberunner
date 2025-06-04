import React, { useState } from "react"
import "./BuildPrompt.css"

interface BuildPromptProps {
  onSubmit?: (prompt: string) => void
  condensed?: boolean
}

const BuildPrompt: React.FC<BuildPromptProps> = ({
  onSubmit,
  condensed = false,
}) => {
  const [buildPrompt, setBuildPrompt] = useState<string>("")

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

  const examples = [
    "a minimalist todo app",
    "a music player interface",
    "a weather app",
    "a code snippet manager",
    "a note-taking tool",
    "a timer application",
  ]

  if (condensed) {
    return (
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
        </div>
      </div>
    )
  }

  // Full-screen mode (original design)
  return (
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
        </div>

        {/* Examples */}
        <div className="examples-container">
          <p className="examples-title">Or try one of these ideas</p>
          <div className="examples-grid">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => setBuildPrompt(example)}
                className="example-button"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BuildPrompt
