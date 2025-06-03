import React, { useState } from 'react';

interface BuildPromptProps {
  onSubmit?: (prompt: string) => void;
}

const BuildPrompt: React.FC<BuildPromptProps> = ({ onSubmit }) => {
  const [buildPrompt, setBuildPrompt] = useState<string>('');

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
        <button
          className="prompt-submit-btn"
          onClick={handleSubmit}
        >
          Start Building
        </button>
      </div>
    </div>
  );
};

export default BuildPrompt;