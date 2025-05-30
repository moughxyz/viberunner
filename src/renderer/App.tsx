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
        const fileData = await window.api.handleFileDrop(filePath);

        // Find all appropriate visualizers
        const matchingVisualizers = visualizers.filter(viz =>
          viz.mimetypes.includes(fileData.mimetype)
        );

        if (matchingVisualizers.length === 0) {
          // Handle no visualizer found
          console.log('No visualizer found for mimetype:', fileData.mimetype);
          alert(`No visualizer found for file type: ${fileData.mimetype}`);
        } else if (matchingVisualizers.length === 1) {
          // Only one visualizer, use it directly
          setCurrentVisualizer(matchingVisualizers[0]);
          setCurrentFile(fileData);
          setShowVisualizerSelection(false);
        } else {
          // Multiple visualizers, show selection
          setCurrentFile(fileData);
          setAvailableVisualizers(matchingVisualizers);
          setShowVisualizerSelection(true);
          setCurrentVisualizer(null);
        }
      } catch (error) {
        console.error('Error handling file drop:', error);
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
          const visualizer = await window.api.loadVisualizer(currentVisualizer.id);

          // Create a new script element to load the visualizer's bundle
          const script = document.createElement('script');
          script.src = `file://${visualizer.path}/dist/bundle.iife.js`;
          script.type = 'text/javascript';

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
        <h1>File Visualizer</h1>
        <p>Drag and drop a file to visualize it</p>
      </header>

      <main>
        {showVisualizerSelection ? (
          <div className="visualizer-selection">
            <h2>Choose a Visualizer</h2>
            <p>Multiple visualizers are available for: <strong>{currentFile?.path}</strong></p>
            <p>File type: <strong>{currentFile?.mimetype}</strong></p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '20px',
              margin: '20px 0'
            }}>
              {availableVisualizers.map(viz => (
                <div
                  key={viz.id}
                  style={{
                    border: '2px solid #ddd',
                    borderRadius: '8px',
                    padding: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#fff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#007bff';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#ddd';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                  onClick={() => selectVisualizer(viz)}
                >
                  <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>{viz.name}</h3>
                  <p style={{ margin: '0 0 15px 0', color: '#666', fontSize: '14px' }}>{viz.description}</p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>
                    Supports: {viz.mimetypes.join(', ')}
                  </p>
                  <button
                    style={{
                      marginTop: '15px',
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      width: '100%'
                    }}
                  >
                    Use This Visualizer
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setShowVisualizerSelection(false);
                setCurrentFile(null);
                setCurrentVisualizer(null);
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginTop: '10px'
              }}
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
              marginBottom: '20px',
              padding: '10px',
              backgroundColor: '#f8f9fa',
              borderRadius: '4px'
            }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0' }}>Visualizing: {currentFile.path.split('/').pop()}</h2>
                <p style={{ margin: '0', color: '#666' }}>Using: {currentVisualizer.name}</p>
              </div>
              <button
                onClick={() => {
                  setCurrentFile(null);
                  setCurrentVisualizer(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
            <div ref={visualizerRootRef} className="visualizer-root" />
          </div>
        ) : (
          <div className="drop-zone" style={{
            border: '3px dashed #ccc',
            borderRadius: '8px',
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: '#f9f9f9',
            margin: '20px 0'
          }}>
            <h3 style={{ color: '#666' }}>Drop a file here to visualize it</h3>
            <p style={{ color: '#999', margin: '10px 0 0 0' }}>
              Supported formats: images (PNG, JPEG, JPG, GIF, BMP, WebP)
            </p>
          </div>
        )}
      </main>

      <aside style={{
        backgroundColor: '#f8f9fa',
        padding: '20px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        {/* Visualizers Directory Section */}
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#fff',
          borderRadius: '6px',
          border: '1px solid #ddd'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>Visualizers Directory</h4>
          <p style={{
            margin: '0 0 10px 0',
            fontSize: '12px',
            color: '#666',
            wordBreak: 'break-all'
          }}>
            {visualizersDirectory}
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleChangeVisualizersDirectory}
              style={{
                padding: '6px 12px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Change Directory
            </button>
            <button
              onClick={handleReloadVisualizers}
              disabled={isLoadingVisualizers}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isLoadingVisualizers ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                opacity: isLoadingVisualizers ? 0.6 : 1
              }}
            >
              {isLoadingVisualizers ? 'Loading...' : 'Reload'}
            </button>
          </div>
        </div>

        <h3>Available Visualizers ({visualizers.length})</h3>
        {isLoadingVisualizers ? (
          <p>Loading visualizers...</p>
        ) : visualizers.length === 0 ? (
          <p style={{ color: '#888' }}>No visualizers found. Please check your visualizers directory.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {visualizers.map(viz => (
              <li key={viz.id} style={{
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '15px',
                margin: '10px 0',
                backgroundColor: '#fff'
              }}>
                <h4 style={{ margin: '0 0 5px 0' }}>{viz.name}</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#666' }}>{viz.description}</p>
                <p style={{ margin: '0', fontSize: '12px', color: '#888' }}>
                  Supports: {viz.mimetypes.join(', ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
};

export default App;