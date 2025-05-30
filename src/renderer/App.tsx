import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// Expose React and ReactDOM globally for visualizers
(window as any).React = React;
(window as any).ReactDOM = { createRoot };

interface Visualizer {
  id: string;
  name: string;
  description: string;
  version: string;
  mimetypes: string[];
  author: string;
}

interface FileData {
  path: string;
  mimetype: string;
  content: string;
}

const App: React.FC = () => {
  const [visualizers, setVisualizers] = useState<Visualizer[]>([]);
  const [currentFile, setCurrentFile] = useState<FileData | null>(null);
  const [currentVisualizer, setCurrentVisualizer] = useState<Visualizer | null>(null);
  const [availableVisualizers, setAvailableVisualizers] = useState<Visualizer[]>([]);
  const [showVisualizerSelection, setShowVisualizerSelection] = useState(false);
  const [visualizersDirectory, setVisualizersDirectory] = useState<string>('');
  const [isLoadingVisualizers, setIsLoadingVisualizers] = useState(false);
  const visualizerRootRef = useRef<HTMLDivElement>(null);

  // Load visualizers directory info
  useEffect(() => {
    const loadDirectoryInfo = async () => {
      try {
        const dir = await window.api.getVisualizersDirectory();
        setVisualizersDirectory(dir || 'Not set');
      } catch (error) {
        console.error('Error loading visualizers directory:', error);
      }
    };
    loadDirectoryInfo();
  }, []);

  const loadVisualizers = async () => {
    try {
      setIsLoadingVisualizers(true);
      const vizs = await window.api.getVisualizers();
      setVisualizers(vizs);
    } catch (error) {
      console.error('Error loading visualizers:', error);
      alert('Failed to load visualizers. Please check your visualizers directory.');
    } finally {
      setIsLoadingVisualizers(false);
    }
  };

  useEffect(() => {
    loadVisualizers();
  }, []);

  const handleChangeVisualizersDirectory = async () => {
    try {
      const result = await window.api.changeVisualizersDirectory();
      if (result.success && result.directory) {
        setVisualizersDirectory(result.directory);
        await loadVisualizers();
        alert(`Visualizers directory changed to: ${result.directory}`);
      }
    } catch (error) {
      console.error('Error changing visualizers directory:', error);
      alert('Failed to change visualizers directory.');
    }
  };

  const handleReloadVisualizers = async () => {
    try {
      setIsLoadingVisualizers(true);
      const result = await window.api.reloadVisualizers();
      if (result.success) {
        setVisualizers(result.visualizers);
        alert('Visualizers reloaded successfully!');
      } else {
        alert('Failed to reload visualizers.');
      }
    } catch (error) {
      console.error('Error reloading visualizers:', error);
      alert('Failed to reload visualizers.');
    } finally {
      setIsLoadingVisualizers(false);
    }
  };

  useEffect(() => {
    // Handle file drops
    const handleFileDrop = async (filePath: string) => {
      try {
        // Use the enhanced matching system
        const matchingResult = await window.api.findMatchingVisualizers(filePath);

        if (!matchingResult.success) {
          console.error('Error finding matching visualizers:', matchingResult.error);
          alert(`Error analyzing file: ${matchingResult.error}`);
          return;
        }

        const fileData = await window.api.handleFileDrop(filePath);
        const matches = matchingResult.matches;

        console.log('Enhanced matching results:', {
          fileAnalysis: matchingResult.fileAnalysis,
          matches: matches.map(m => ({
            name: m.visualizer.name,
            priority: m.priority
          }))
        });

        if (matches.length === 0) {
          // Handle no visualizer found
          console.log('No visualizer found for file:', filePath);
          const analysis = matchingResult.fileAnalysis;
          alert(`No visualizer found for this file.\n\nFile: ${analysis.filename}\nType: ${analysis.mimetype}\nSize: ${(analysis.size / 1024).toFixed(1)} KB`);
        } else if (matches.length === 1) {
          // Only one visualizer, use it directly
          setCurrentVisualizer(matches[0].visualizer);
          setCurrentFile(fileData);
          setShowVisualizerSelection(false);
        } else {
          // Multiple visualizers, show selection with priority info
          setCurrentFile(fileData);
          setAvailableVisualizers(matches.map(m => ({
            ...m.visualizer,
            matchPriority: m.priority
          })));
          setShowVisualizerSelection(true);
          setCurrentVisualizer(null);
        }
      } catch (error) {
        console.error('Error handling file drop:', error);
        alert(`Error handling file: ${error}`);
      }
    };

    // Listen for file drops
    const onDrop = (event: DragEvent) => {
      event.preventDefault();
      const filePath = event.dataTransfer?.files[0]?.path;
      if (filePath) {
        handleFileDrop(filePath);
      }
    };

    const onDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    window.addEventListener('drop', onDrop);
    window.addEventListener('dragover', onDragOver);

    return () => {
      window.removeEventListener('drop', onDrop);
      window.removeEventListener('dragover', onDragOver);
    };
  }, [visualizers]);

  const selectVisualizer = (visualizer: Visualizer) => {
    setCurrentVisualizer(visualizer);
    setShowVisualizerSelection(false);
  };

  // Load and render the visualizer when currentFile or currentVisualizer changes
  useEffect(() => {
    if (currentFile && currentVisualizer && visualizerRootRef.current) {
      const loadVisualizer = async () => {
        try {
          // Clear previous content
          if (visualizerRootRef.current) {
            visualizerRootRef.current.innerHTML = '';
          }

          // Load the visualizer's main component
          const visualizerData = await window.api.loadVisualizer(currentVisualizer.id);

          // Create a new script element with the bundle content
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.textContent = visualizerData.bundleContent;

          // Set up the visualizer's props
          const props = {
            fileData: currentFile,
            container: visualizerRootRef.current
          };

          // When the script loads, it will call this function
          (window as any).__LOAD_VISUALIZER__ = (VisualizerComponent: any) => {
            if (visualizerRootRef.current) {
              const root = document.createElement('div');
              visualizerRootRef.current.appendChild(root);

              // Create a new React root
              const reactRoot = createRoot(root);
              reactRoot.render(
                React.createElement(VisualizerComponent, props)
              );
            }
          };

          // Add the script to the document
          document.head.appendChild(script);

          return () => {
            // Cleanup
            if (document.head.contains(script)) {
              document.head.removeChild(script);
            }
            delete (window as any).__LOAD_VISUALIZER__;
          };
        } catch (error) {
          console.error('Failed to load visualizer:', error);
        }
      };

      loadVisualizer();
    }
  }, [currentFile, currentVisualizer]);

  return (
    <div className="app">
      <header>
        <h1>🎨 Vizor</h1>
        <p>Drag & drop files to visualize them with stunning interfaces</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <main>
          {showVisualizerSelection ? (
            <div className="visualizer-selection">
              <h2>✨ Choose Your Visualizer</h2>
              <p>Multiple visualizers are available for: <strong>{currentFile?.path.split('/').pop()}</strong></p>
              <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>File type: <strong>{currentFile?.mimetype}</strong></p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                margin: '2rem 0'
              }}>
                {availableVisualizers.map(viz => (
                  <div
                    key={viz.id}
                    className="card"
                    style={{
                      background: 'rgba(42, 42, 42, 0.8)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '16px',
                      padding: '1.5rem',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onClick={() => selectVisualizer(viz)}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '3px',
                      background: 'var(--gradient-primary)'
                    }} />

                    <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1.2rem' }}>{viz.name}</h3>
                    <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5' }}>{viz.description}</p>
                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Supports: {viz.mimetypes.join(', ')}
                    </p>
                    <button style={{
                      width: '100%',
                      padding: '0.75rem',
                      fontSize: '0.9rem',
                      fontWeight: '500'
                    }}>
                      Launch Visualizer
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="secondary"
                onClick={() => {
                  setShowVisualizerSelection(false);
                  setCurrentFile(null);
                  setCurrentVisualizer(null);
                }}
                style={{ marginTop: '1rem' }}
              >
                Cancel
              </button>
            </div>
          ) : currentFile && currentVisualizer ? (
            <div className="visualizer-container">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
                padding: '1rem',
                background: 'rgba(42, 42, 42, 0.5)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)'
              }}>
                <div>
                  <h2 style={{ margin: '0 0 0.25rem 0', fontSize: '1.4rem' }}>
                    📁 {currentFile.path.split('/').pop()}
                  </h2>
                  <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Visualizing with: <strong>{currentVisualizer.name}</strong>
                  </p>
                </div>
                <button
                  className="danger"
                  onClick={() => {
                    setCurrentFile(null);
                    setCurrentVisualizer(null);
                  }}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  ✕ Close
                </button>
              </div>
              <div ref={visualizerRootRef} className="visualizer-root" style={{ minHeight: '400px' }} />
            </div>
          ) : (
            <div className="drop-zone">
              <h3>📁 Drop files or folders here</h3>
              <p>Supports images, documents, folders, and more</p>
              <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', opacity: 0.6 }}>
                Available formats: Images (PNG, JPEG, GIF, WebP), Folders, and more
              </div>
            </div>
          )}
        </main>

        <aside style={{ position: 'relative' }}>
          {/* Visualizers Directory Section */}
          <div style={{
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'rgba(42, 42, 42, 0.5)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
              🔧 <span style={{ marginLeft: '0.5rem' }}>Visualizers Directory</span>
            </h4>
            <p style={{
              margin: '0 0 1rem 0',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              fontFamily: 'monospace'
            }}>
              {visualizersDirectory}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleChangeVisualizersDirectory}
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
              >
                📁 Change
              </button>
              <button
                className="success"
                onClick={handleReloadVisualizers}
                disabled={isLoadingVisualizers}
                style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}
              >
                {isLoadingVisualizers ? '⟳' : '🔄'} Reload
              </button>
            </div>
          </div>

          <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            🎨 <span style={{ marginLeft: '0.5rem' }}>Available Visualizers ({visualizers.length})</span>
          </h3>

          {isLoadingVisualizers ? (
            <p className="loading" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>⟳ Loading visualizers...</p>
          ) : visualizers.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>
              No visualizers found. Check your directory.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {visualizers.map(viz => (
                <li key={viz.id} style={{ padding: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{viz.name}</h4>
                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{viz.description}</p>
                  <p style={{ margin: '0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    📄 {viz.mimetypes.join(', ')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
};

export default App;