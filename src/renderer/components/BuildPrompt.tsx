import React, { useState } from 'react'

interface BuildPromptProps {
  onSubmit?: (prompt: string) => void
  condensed?: boolean
}

const BuildPrompt: React.FC<BuildPromptProps> = ({ onSubmit, condensed = false }) => {
  const [buildPrompt, setBuildPrompt] = useState<string>('')

  const handleSubmit = () => {
    if (buildPrompt.trim()) {
      onSubmit?.(buildPrompt.trim())
      setBuildPrompt('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const examples = [
    "a minimalist todo app",
    "a music player interface",
    "a weather app",
    "a code snippet manager",
    "a note-taking tool",
    "a timer application"
  ]

  if (condensed) {
    return (
      <div className="bg-white/3 border border-white/10 rounded-2xl p-8 mb-8">
        {/* Condensed header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-light text-white mb-3 tracking-tight">
            Build something{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-medium">
              new
            </span>
          </h2>
          <p className="text-gray-400 text-sm font-light">
            Describe your idea and I'll help bring it to life
          </p>
        </div>

        {/* Condensed input */}
        <div className="mb-6">
          <div className="relative">
            <textarea
              value={buildPrompt}
              onChange={(e) => setBuildPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="I want to create..."
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-white placeholder:text-gray-500 resize-none focus:outline-none focus:border-purple-400/50 focus:bg-white/8 transition-all duration-300"
            />

            {buildPrompt.trim() && (
              <button
                onClick={handleSubmit}
                className="absolute bottom-3 right-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-200 hover:scale-105"
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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-light text-white mb-6 tracking-tight">
            What would you like to{' '}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-medium">
              build
            </span>
            ?
          </h1>
          <p className="text-gray-400 text-lg font-light max-w-lg mx-auto leading-relaxed">
            Describe your idea and I'll help bring it to life
          </p>
        </div>

        {/* Main input */}
        <div className="mb-12">
          <div className="relative">
            <textarea
              value={buildPrompt}
              onChange={(e) => setBuildPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="I want to create..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-8 py-6 text-white text-lg placeholder:text-gray-500 resize-none focus:outline-none focus:border-purple-400/50 focus:bg-white/8 transition-all duration-300 leading-relaxed"
            />

            {buildPrompt.trim() && (
              <button
                onClick={handleSubmit}
                className="absolute bottom-5 right-5 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-6 py-2 rounded-xl text-sm font-medium hover:from-purple-600 hover:to-blue-600 transition-all duration-200 hover:scale-105 shadow-lg"
              >
                Create →
              </button>
            )}
          </div>
        </div>

        {/* Examples */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-6 font-light">
            Or try one of these ideas
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => setBuildPrompt(example)}
                className="text-left p-4 bg-white/3 hover:bg-white/6 border border-white/5 hover:border-white/10 rounded-xl text-gray-300 hover:text-white text-sm transition-all duration-200 hover:-translate-y-0.5"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom hint */}
        <div className="text-center mt-16">
          <p className="text-gray-600 text-xs">
            Press Enter or click Create to get started
          </p>
        </div>
      </div>
    </div>
  )
}

export default BuildPrompt