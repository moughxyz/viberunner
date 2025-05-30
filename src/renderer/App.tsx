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

// Helper function to get supported formats for a visualizer
const getSupportedFormats = (viz: any): string => {
  if (viz.mimetypes && viz.mimetypes.length > 0) {
    return viz.mimetypes.join(', ');
  }

  if (viz.matchers && viz.matchers.length > 0) {
    const formats = new Set<string>();

    viz.matchers.forEach((matcher: any) => {
      if (matcher.type === 'mimetype' && matcher.mimetype) {
        formats.add(matcher.mimetype);
      } else if (matcher.type === 'filename' && matcher.pattern) {
        formats.add(`*.${matcher.pattern.split('.').pop() || 'file'}`);
      } else if (matcher.type === 'filename-contains' && matcher.substring) {
        const ext = matcher.extension ? `.${matcher.extension}` : '';
        formats.add(`*${matcher.substring}*${ext}`);
      } else if (matcher.type === 'content-json') {
        formats.add('JSON');
      } else if (matcher.type === 'file-size') {
        formats.add('Size-based');
      } else {
        formats.add(matcher.type);
      }
    });

    return Array.from(formats).join(', ') || 'Enhanced matching';
  }

  return 'All files';
};

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
      <header className="header">
        <div className="header-content">
          <h1 className="app-title">
            <div className="app-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="4" ry="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 8c2 0 2 4 4 4s2-4 4-4 2 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M6 16c2 0 2-4 4-4s2 4 4 4 2-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            Vibeframe
          </h1>
        </div>
      </header>

      <div className="main-layout">
        <main className="content-area">
          {showVisualizerSelection ? (
            <div className="visualizer-selection">
              <div className="selection-header">
                <h2 className="selection-title">Choose visualizer</h2>
                <p className="selection-subtitle">
                  Multiple visualizers available for <span className="filename">{currentFile?.path.split('/').pop()}</span>
                </p>
                <div className="file-meta">
                  <span className="file-type">{currentFile?.mimetype}</span>
                </div>
              </div>

              <div className="visualizer-grid">
                {availableVisualizers.map(viz => (
                  <button
                    key={viz.id}
                    className="visualizer-card"
                    onClick={() => selectVisualizer(viz)}
                  >
                    <div className="card-header">
                      <h3 className="card-title">{viz.name}</h3>
                      <div className="card-badge">
                        <span className="badge-dot"></span>
                        Ready
                      </div>
                    </div>
                    <p className="card-description">{viz.description}</p>
                    <div className="card-footer">
                      <span className="supported-formats">{getSupportedFormats(viz)}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="selection-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowVisualizerSelection(false);
                    setCurrentFile(null);
                    setCurrentVisualizer(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : currentFile && currentVisualizer ? (
            <div className="visualizer-container">
              <div className="visualizer-header">
                <div className="visualizer-info">
                  <h2 className="visualizer-title">
                    <span className="file-icon">📄</span>
                    {currentFile.path.split('/').pop()}
                  </h2>
                  <p className="visualizer-subtitle">
                    Powered by <span className="visualizer-name">{currentVisualizer.name}</span>
                  </p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setCurrentFile(null);
                    setCurrentVisualizer(null);
                  }}
                >
                  <span className="btn-icon">✕</span>
                  Close
                </button>
              </div>
              <div ref={visualizerRootRef} className="visualizer-viewport" />
            </div>
          ) : (
            <div className="drop-zone">
              <div className="drop-zone-content">
                <div className="drop-zone-icon">📂</div>
                <h3 className="drop-zone-title">Drop files to visualize</h3>
                <p className="drop-zone-description">
                  Supports documents, images, data files, and more
                </p>
                <div className="drop-zone-formats">
                  <span className="format-tag">JSON</span>
                  <span className="format-tag">Images</span>
                  <span className="format-tag">CSV</span>
                  <span className="format-tag">Text</span>
                </div>
              </div>
            </div>
          )}
        </main>

        <aside className="sidebar">
          {/* Visualizers Directory Section */}
          <div className="sidebar-section">
            <div className="section-header">
              <h4 className="section-title">
                <span className="section-icon">🔧</span>
                Directory
              </h4>
            </div>
            <div className="directory-path">
              {visualizersDirectory}
            </div>
            <div className="section-actions">
              <button
                className="btn btn-outline btn-sm"
                onClick={handleChangeVisualizersDirectory}
              >
                <span className="btn-icon">📁</span>
                Change
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleReloadVisualizers}
                disabled={isLoadingVisualizers}
              >
                <span className="btn-icon">{isLoadingVisualizers ? '⟳' : '🔄'}</span>
                Reload
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <h4 className="section-title">
                <span className="section-icon">🎨</span>
                Visualizers
              </h4>
              <span className="section-count">{visualizers.length}</span>
            </div>

            {isLoadingVisualizers ? (
              <div className="loading-state">
                <span className="loading-spinner">⟳</span>
                Loading visualizers...
              </div>
            ) : visualizers.length === 0 ? (
              <div className="empty-state">
                <p>No visualizers found</p>
                <p className="empty-subtitle">Check your directory configuration</p>
              </div>
            ) : (
              <div className="visualizer-list">
                {visualizers.map(viz => (
                  <div key={viz.id} className="visualizer-item">
                    <div className="item-header">
                      <h5 className="item-title">{viz.name}</h5>
                      <div className="item-status">
                        <span className="status-dot"></span>
                      </div>
                    </div>
                    <p className="item-description">{viz.description}</p>
                    <div className="item-formats">
                      {getSupportedFormats(viz)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default App;