import React, { useState, useEffect, useRef } from 'react';

interface ClipboardEntry {
  id: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'html' | 'other';
  size: number;
}

interface ClipboardWatcherProps {
  fileData: null; // Standalone visualizer
  container?: HTMLElement;
}

const ClipboardWatcher: React.FC<ClipboardWatcherProps> = () => {
  const [history, setHistory] = useState<ClipboardEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [isWatching, setIsWatching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const lastClipboardRef = useRef<string>('');

  // Check clipboard content
  const checkClipboard = async () => {
    try {
      // Use Node.js clipboard module if available, fallback to navigator
      let clipboardText = '';

      if (typeof (window as any).require !== 'undefined') {
        try {
          const { clipboard } = (window as any).require('electron');
          clipboardText = clipboard.readText();
        } catch (e) {
          // Fallback to web clipboard API
          if (navigator.clipboard && navigator.clipboard.readText) {
            clipboardText = await navigator.clipboard.readText();
          }
        }
      } else if (navigator.clipboard && navigator.clipboard.readText) {
        clipboardText = await navigator.clipboard.readText();
      }

      // Only add if content has changed
      if (clipboardText && clipboardText !== lastClipboardRef.current) {
        lastClipboardRef.current = clipboardText;

        const newEntry: ClipboardEntry = {
          id: Date.now().toString(),
          content: clipboardText,
          timestamp: new Date(),
          type: detectContentType(clipboardText),
          size: new Blob([clipboardText]).size
        };

        setHistory((prev: ClipboardEntry[]) => [newEntry, ...prev.slice(0, 99)]); // Keep last 100 entries
        setError(null);
      }
    } catch (err) {
      setError(`Clipboard access error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Detect content type
  const detectContentType = (content: string): ClipboardEntry['type'] => {
    if (content.startsWith('<') && content.includes('>')) return 'html';
    if (content.startsWith('data:image/')) return 'image';
    return 'text';
  };

  // Start/stop clipboard watching
  useEffect(() => {
    if (isWatching) {
      // Initial check
      checkClipboard();

      // Set up interval
      intervalRef.current = window.setInterval(checkClipboard, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isWatching]);

  // Filter history based on search term
  const filteredHistory = history.filter((entry: ClipboardEntry) => {
    if (!searchTerm) return true;

    try {
      if (useRegex) {
        const regex = new RegExp(searchTerm, 'gi');
        return regex.test(entry.content);
      } else {
        return entry.content.toLowerCase().includes(searchTerm.toLowerCase());
      }
    } catch (e) {
      // Invalid regex, fallback to simple search
      return entry.content.toLowerCase().includes(searchTerm.toLowerCase());
    }
  });

  // Copy content back to clipboard
  const copyToClipboard = async (content: string) => {
    try {
      if (typeof (window as any).require !== 'undefined') {
        try {
          const { clipboard } = (window as any).require('electron');
          clipboard.writeText(content);
        } catch (e) {
          await navigator.clipboard.writeText(content);
        }
      } else {
        await navigator.clipboard.writeText(content);
      }
    } catch (err) {
      setError(`Failed to copy: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Clear history
  const clearHistory = () => {
    setHistory([]);
    lastClipboardRef.current = '';
  };

  // Export history as JSON
  const exportHistory = () => {
    const exportData = {
      exported: new Date().toISOString(),
      entries: history.map((entry: ClipboardEntry) => ({
        ...entry,
        timestamp: entry.timestamp.toISOString()
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clipboard-history-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Format content size
  const formatSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Truncate content for display
  const truncateContent = (content: string, maxLength = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  // Get content type icon
  const getTypeIcon = (type: ClipboardEntry['type']) => {
    switch (type) {
      case 'text': return '📝';
      case 'html': return '🌐';
      case 'image': return '🖼️';
      default: return '📄';
    }
  };

  return (
    <div style={{
      padding: '20px',
      background: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #333',
        paddingBottom: '20px'
      }}>
        <div>
          <h2 style={{ margin: 0, color: '#3b82f6' }}>📋 Clipboard Watcher</h2>
          <p style={{ margin: '5px 0 0 0', color: '#b3b3b3', fontSize: '14px' }}>
            Real-time clipboard monitoring with search and filtering
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setIsWatching(!isWatching)}
            style={{
              background: isWatching ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {isWatching ? '⏸️ Pause' : '▶️ Resume'}
          </button>

          <button
            onClick={clearHistory}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🗑️ Clear
          </button>

          <button
            onClick={exportHistory}
            disabled={history.length === 0}
            style={{
              background: history.length > 0 ? '#8b5cf6' : '#4b5563',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              cursor: history.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            💾 Export
          </button>
        </div>
      </div>

      {/* Search Controls */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
          <input
            type="text"
            placeholder="Search clipboard history..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '10px',
              background: '#1e1e1e',
              border: '1px solid #333',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px'
            }}
          />

          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
              style={{ accentColor: '#3b82f6' }}
            />
            Regex
          </label>
        </div>

        <div style={{ fontSize: '12px', color: '#888' }}>
          {filteredHistory.length} / {history.length} entries
          {searchTerm && (
            <span style={{ marginLeft: '10px' }}>
              {useRegex ? '🔍 Regex search' : '🔤 Text search'}: "{searchTerm}"
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#7f1d1d',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          padding: '10px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Status Info */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '20px',
        fontSize: '12px',
        color: '#888'
      }}>
        <span>🔄 Status: {isWatching ? 'Watching' : 'Paused'}</span>
        <span>📊 Total Entries: {history.length}</span>
        <span>⏰ Last Check: {new Date().toLocaleTimeString()}</span>
      </div>

      {/* History List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredHistory.length === 0 ? (
          <div style={{
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            color: '#888'
          }}>
            {history.length === 0 ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
                <p>No clipboard history yet.</p>
                <p style={{ fontSize: '12px' }}>Copy something to get started!</p>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔍</div>
                <p>No entries match your search.</p>
                <p style={{ fontSize: '12px' }}>Try adjusting your search term or disabling regex.</p>
              </>
            )}
          </div>
        ) : (
          filteredHistory.map((entry, index) => (
            <div
              key={entry.id}
              style={{
                background: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: '8px',
                padding: '15px',
                position: 'relative',
                transition: 'border-color 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = '#3b82f6'}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = '#333'}
            >
              {/* Entry Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{getTypeIcon(entry.type)}</span>
                  <span style={{ fontSize: '12px', color: '#888' }}>#{index + 1}</span>
                  <span style={{ fontSize: '12px', color: '#b3b3b3' }}>
                    {formatTime(entry.timestamp)}
                  </span>
                  <span style={{ fontSize: '12px', color: '#888' }}>
                    {formatSize(entry.size)}
                  </span>
                </div>

                <button
                  onClick={() => copyToClipboard(entry.content)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #3b82f6',
                    borderRadius: '4px',
                    color: '#3b82f6',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  📋 Copy
                </button>
              </div>

              {/* Entry Content */}
              <div style={{
                background: '#0a0a0a',
                borderRadius: '4px',
                padding: '10px',
                fontSize: '13px',
                lineHeight: '1.4',
                fontFamily: 'Monaco, Consolas, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {entry.type === 'image' && entry.content.startsWith('data:image/') ? (
                  <div>
                    <img
                      src={entry.content}
                      alt="Clipboard image"
                      style={{ maxWidth: '100%', maxHeight: '150px', borderRadius: '4px' }}
                    />
                    <div style={{ marginTop: '5px', color: '#888', fontSize: '11px' }}>
                      Image data URL ({formatSize(entry.size)})
                    </div>
                  </div>
                ) : (
                  truncateContent(entry.content)
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Export the component for Viberunner to load
export default ClipboardWatcher;

// Global registration for IIFE bundle
if (typeof window !== 'undefined' && (window as any).__LOAD_VISUALIZER__) {
  (window as any).__LOAD_VISUALIZER__(ClipboardWatcher);
}