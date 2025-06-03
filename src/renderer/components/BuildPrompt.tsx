import React, { useState } from 'react';
import AIAgentInterface from './AIAgentInterface';

interface BuildPromptProps {
  onSubmit?: (prompt: string) => void;
}

const BuildPrompt: React.FC<BuildPromptProps> = ({ onSubmit }) => {
  const [buildPrompt, setBuildPrompt] = useState<string>('');
  const [showAIAgent, setShowAIAgent] = useState(false);

  const handleSubmit = () => {
    if (buildPrompt.trim()) {
      onSubmit?.(buildPrompt.trim());
      // TODO: Handle build prompt submission
      console.log('Build prompt submitted:', buildPrompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleOpenAIAgent = () => {
    setShowAIAgent(true);
  };

  const handleCloseAIAgent = () => {
    setShowAIAgent(false);
  };

  if (showAIAgent) {
    return <AIAgentInterface onClose={handleCloseAIAgent} />;
  }

  return (
    <div className="ai-agent-prompt">
      <div className="prompt-header">
        <h2 className="prompt-title">What do you want to build today?</h2>
        <p className="prompt-subtitle">Describe your idea and I'll help you create it</p>
      </div>
      <div className="prompt-input-container">
        <input
          type="text"
          className="prompt-input"
          placeholder="I want to build..."
          value={buildPrompt}
          onChange={(e) => setBuildPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="prompt-actions">
          <button
            className="prompt-submit-btn secondary"
            onClick={handleSubmit}
          >
            Quick Build
          </button>
          <button
            className="prompt-submit-btn primary"
            onClick={handleOpenAIAgent}
          >
            Build with AI Agent
          </button>
        </div>
      </div>

      <div className="build-options">
        <div className="build-option">
          <div className="option-icon">🚀</div>
          <div className="option-content">
            <h3>Quick Build</h3>
            <p>Get a basic runner structure instantly based on your description</p>
          </div>
        </div>
        <div className="build-option highlighted">
          <div className="option-icon">🤖</div>
          <div className="option-content">
            <h3>AI Agent Builder</h3>
            <p>Interactive conversation with AI to build complex, customized runners</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuildPrompt;