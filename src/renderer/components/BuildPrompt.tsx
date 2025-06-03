import React, { useState } from 'react';

interface BuildPromptProps {
  onSubmit?: (prompt: string) => void;
}

const BuildPrompt: React.FC<BuildPromptProps> = ({ onSubmit }) => {
  const [buildPrompt, setBuildPrompt] = useState<string>('');

  const handleSubmit = () => {
    if (buildPrompt.trim()) {
      onSubmit?.(buildPrompt.trim());
      setBuildPrompt(''); // Clear input after submit
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12 max-w-2xl">
        <h2 className="text-4xl font-bold text-white mb-4">
          What do you want to build today?
        </h2>
        <p className="text-xl text-gray-300">
          Describe your idea and I'll help you create it
        </p>
      </div>

      <div className="relative w-full max-w-2xl">
        <input
          type="text"
          placeholder="I want to build..."
          value={buildPrompt}
          onChange={(e) => setBuildPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-6 py-4 pr-14 text-lg bg-black border border-gray-500 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />

        <button
          onClick={handleSubmit}
          disabled={!buildPrompt.trim()}
          className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-semibold transition-all duration-200 ${
            buildPrompt.trim()
              ? 'bg-blue-500 hover:bg-blue-600 hover:scale-105 cursor-pointer'
              : 'bg-gray-500 cursor-not-allowed opacity-50'
          }`}
        >
          ↗
        </button>
      </div>
    </div>
  );
};

export default BuildPrompt;