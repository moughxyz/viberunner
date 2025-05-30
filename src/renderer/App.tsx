import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// Direct Node.js access with full integration
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { app } = require('@electron/remote') || require('electron').remote?.app;

// Expose React and ReactDOM globally for visualizers
(window as any).React = React;
(window as any).ReactDOM = { createRoot };

// Simplified API - only keep IPC for dialogs
const api = {
  // Dialog operations that need main process
  changeFramesDirectory: () => ipcRenderer.invoke('change-frames-directory'),
  saveFileDialog: (options?: any) => ipcRenderer.invoke('save-file-dialog', options),

  // Direct file operations using Node.js
  readFile: (filePath: string, encoding: 'utf8' | 'base64' = 'utf8') => {
    if (encoding === 'base64') {
      return fs.readFileSync(filePath).toString('base64');
    }
    return fs.readFileSync(filePath, 'utf8');
  },
  writeFile: (filePath: string, content: string, encoding: 'utf8' | 'base64' = 'utf8') => {
    if (encoding === 'base64') {
      const buffer = Buffer.from(content, 'base64');
      fs.writeFileSync(filePath, buffer);
    } else {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  },
  backupFile: (filePath: string) => {
    if (fs.existsSync(filePath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.backup.${timestamp}`;
      fs.copyFileSync(filePath, backupPath);
      return backupPath;
    }
    return null;
  },
  exists: (filePath: string) => fs.existsSync(filePath),
  stat: (filePath: string) => fs.statSync(filePath),
  readDir: (dirPath: string) => fs.readdirSync(dirPath),

  // Helper functions
  path: path,
  mime: mime,

  // Exposed modules for advanced usage
  fs: fs,
  require: require
};

// Make API available globally for visualizers
(window as any).api = api;

// Constants
const getFramesDirectory = () => {
  const userDataPath = app?.getPath('userData') || path.join(require('os').homedir(), '.vibeframe');
  return path.join(userDataPath, 'frames');
};

// Helper functions for direct file operations
async function getMimetype(filePath: string): Promise<string> {
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      return 'inode/directory';
    }
  } catch (error) {
    // File doesn't exist or can't be accessed
  }

  const mimetype = mime.lookup(filePath);
  return mimetype || 'application/octet-stream';
}

interface FileAnalysis {
  path: string;
  filename: string;
  mimetype: string;
  content: string;
  size: number;
  isJson?: boolean;
  jsonContent?: any;
}

async function analyzeFile(filePath: string): Promise<FileAnalysis> {
  const stats = fs.statSync(filePath);
  const filename = path.basename(filePath);
  const mimetype = await getMimetype(filePath);

  let content = '';
  let isJson = false;
  let jsonContent = null;

  // Only read content for non-directories and reasonably sized files
  if (!stats.isDirectory() && stats.size < 10 * 1024 * 1024) { // < 10MB
    try {
      content = fs.readFileSync(filePath, 'utf-8');

      // Try to parse as JSON
      if (mimetype === 'application/json' || filename.endsWith('.json')) {
        try {
          jsonContent = JSON.parse(content);
          isJson = true;
        } catch {
          // Not valid JSON, that's fine
        }
      }
    } catch {
      // File might be binary or unreadable, that's fine
    }
  }

  return {
    path: filePath,
    filename,
    mimetype,
    content,
    size: stats.size,
    isJson,
    jsonContent
  };
}

async function loadFrames(): Promise<Frame[]> {
  const FRAMES_DIR = getFramesDirectory();

  if (!fs.existsSync(FRAMES_DIR)) {
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    return [];
  }

  try {
    const dirContents = fs.readdirSync(FRAMES_DIR);
    const directories = dirContents.filter((dir: string) => {
      const fullPath = path.join(FRAMES_DIR, dir);
      return fs.statSync(fullPath).isDirectory();
    });

    const frames = directories.map((dir: string) => {
      const framePath = path.join(FRAMES_DIR, dir);
      const metadataPath = path.join(framePath, 'viz.json');

      if (!fs.existsSync(metadataPath)) {
        return null;
      }

      try {
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        return {
          ...metadata,
          id: dir,
        };
      } catch (parseError) {
        console.error(`Error parsing metadata for ${dir}:`, parseError);
        return null;
      }
    })
    .filter(Boolean) as Frame[];

    return frames;
  } catch (error) {
    console.error('Error loading frames:', error);
    throw error;
  }
}

async function loadFrame(id: string) {
  const FRAMES_DIR = getFramesDirectory();
  const framePath = path.join(FRAMES_DIR, id);
  const bundlePath = path.join(framePath, 'dist', 'bundle.iife.js');

  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Bundle not found: ${bundlePath}`);
  }

  const bundleContent = fs.readFileSync(bundlePath, 'utf-8');

  // Also load the config
  const metadataPath = path.join(framePath, 'viz.json');
  const config = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

  return { bundleContent, config };
}

interface Frame {
  id: string;
  name: string;
  description: string;
  version: string;
  mimetypes: string[];
  author: string;
  standalone?: boolean; // Optional standalone property
}

interface FileData {
  path: string;
  mimetype: string;
  content: string;
  analysis?: FileAnalysis;
}

// Helper function to get supported formats for a frame
const getSupportedFormats = (frame: any): string => {
  if (frame.standalone) {
    return 'Standalone utility';
  }

  if (frame.mimetypes && frame.mimetypes.length > 0) {
    return frame.mimetypes.join(', ');
  }

  if (frame.matchers && frame.matchers.length > 0) {
    const formats = new Set<string>();

    frame.matchers.forEach((matcher: any) => {
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
  const [frames, setFrames] = useState<Frame[]>([]);
  const [currentFile, setCurrentFile] = useState<FileData | null>(null);
  const [currentFrame, setCurrentFrame] = useState<Frame | null>(null);
  const [availableFrames, setAvailableFrames] = useState<Frame[]>([]);
  const [showFrameSelection, setShowFrameSelection] = useState(false);
  const [framesDirectory, setFramesDirectory] = useState<string>('');
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const frameRootRef = useRef<HTMLDivElement>(null);

  // Load frames directory info
  useEffect(() => {
    const loadDirectoryInfo = async () => {
      try {
        const dir = getFramesDirectory();
        setFramesDirectory(dir || 'Not set');
      } catch (error) {
        console.error('Error loading frames directory:', error);
      }
    };
    loadDirectoryInfo();
  }, []);

  const reloadFrames = async () => {
    try {
      setIsLoadingFrames(true);
      const frames = await loadFrames();
      setFrames(frames);
    } catch (error) {
      console.error('Error loading frames:', error);
      alert('Failed to load frames. Please check your frames directory.');
    } finally {
      setIsLoadingFrames(false);
    }
  };

  useEffect(() => {
    reloadFrames();
  }, []);

  const handleChangeFramesDirectory = async () => {
    try {
      const result = await api.changeFramesDirectory();
      if (result.success && result.directory) {
        setFramesDirectory(result.directory);
        await reloadFrames();
        alert(`Frames directory changed to: ${result.directory}`);
      }
    } catch (error) {
      console.error('Error changing frames directory:', error);
      alert('Failed to change frames directory.');
    }
  };

  const handleReloadFrames = async () => {
    await reloadFrames();
    alert('Frames reloaded successfully!');
  };

  useEffect(() => {
    // Handle file drops
    const handleFileDrop = async (filePath: string) => {
      try {
        // Use direct file analysis instead of IPC
        const fileAnalysis = await analyzeFile(filePath);

        // For directories, handle specially
        let fileData;
        if (fileAnalysis.mimetype === 'inode/directory') {
          fileData = {
            path: filePath,
            mimetype: fileAnalysis.mimetype,
            content: '', // Empty content for directories
            analysis: fileAnalysis
          };
        } else {
          // For files, read content as base64 if needed
          let content = fileAnalysis.content;
          if (!content && fs.existsSync(filePath)) {
            const binaryContent = fs.readFileSync(filePath);
            content = binaryContent.toString('base64');
          }

          fileData = {
            path: filePath,
            mimetype: fileAnalysis.mimetype,
            content,
            analysis: fileAnalysis
          };
        }

        // Find matching frames directly
        const matches = await findMatchingFrames(filePath);

        console.log('Enhanced matching results:', {
          fileAnalysis: fileAnalysis,
          matches: matches.map((m: any) => ({
            name: m.frame.name,
            priority: m.priority
          }))
        });

        if (matches.length === 0) {
          // Handle no frame found
          console.log('No frame found for file:', filePath);
          alert(`No frame found for this file.\n\nFile: ${fileAnalysis.filename}\nType: ${fileAnalysis.mimetype}\nSize: ${(fileAnalysis.size / 1024).toFixed(1)} KB`);
        } else if (matches.length === 1) {
          // Only one frame, use it directly
          setCurrentFrame(matches[0].frame);
          setCurrentFile(fileData);
          setShowFrameSelection(false);
        } else {
          // Multiple frames, show selection with priority info
          setCurrentFile(fileData);
          setAvailableFrames(matches.map((m: any) => ({
            ...m.frame,
            matchPriority: m.priority
          })));
          setShowFrameSelection(true);
          setCurrentFrame(null);
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
  }, [frames]);

  const selectFrame = (frame: Frame) => {
    setCurrentFrame(frame);
    setShowFrameSelection(false);
  };

  const launchStandaloneFrame = async (frame: Frame) => {
    try {
      console.log('Launching standalone frame:', frame.name, frame.id);

      const frameData = await loadFrame(frame.id);
      console.log('Frame data received:', frameData);

      // Set up standalone frame (no file data) - this will trigger useEffect
      setCurrentFrame(frame);
      setCurrentFile(null); // No file for standalone frames
      setShowFrameSelection(false);

      // Store frame data for useEffect to pick up
      (window as any).__PENDING_STANDALONE_DATA__ = frameData;

    } catch (error) {
      console.error('Failed to launch standalone frame:', error);
      alert(`Failed to launch ${frame.name}: ${error}`);
    }
  };

  // Load and render the frame when currentFile or currentFrame changes
  useEffect(() => {
    if (currentFrame && frameRootRef.current) {
      const loadFrameComponent = async () => {
        try {
          // Clear previous content
          if (frameRootRef.current) {
            frameRootRef.current.innerHTML = '';
          }

          let frameData;
          let props;

          // Check if this is a standalone frame
          if (!currentFile && (window as any).__PENDING_STANDALONE_DATA__) {
            // Use pending standalone data
            frameData = (window as any).__PENDING_STANDALONE_DATA__;
            props = {
              fileData: null,
              container: frameRootRef.current
            };
            // Clear the pending data
            delete (window as any).__PENDING_STANDALONE_DATA__;
            console.log('Loading standalone frame with pending data');
          } else if (currentFile) {
            // Load the frame's main component for file-based frame
            frameData = await loadFrame(currentFrame.id);
            props = {
              fileData: currentFile,
              container: frameRootRef.current
            };
            console.log('Loading file-based frame');
          } else {
            console.log('No file or pending standalone data - skipping frame load');
            return;
          }

          console.log('Creating script element...');

          // Create a new script element with the bundle content
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.textContent = frameData.bundleContent;

          console.log('Setting up __LOAD_FRAME__ function...');

          // When the script loads, it will call this function
          (window as any).__LOAD_FRAME__ = (FrameComponent: any) => {
            console.log('__LOAD_FRAME__ called with component:', FrameComponent);
            console.log('frameRootRef.current:', frameRootRef.current);

            if (frameRootRef.current) {
              const root = document.createElement('div');
              frameRootRef.current.appendChild(root);
              console.log('Created and appended root div:', root);

              // Create a new React root
              try {
                const reactRoot = createRoot(root);
                console.log('Created React root successfully');

                reactRoot.render(
                  React.createElement(FrameComponent, props)
                );
                console.log('Frame rendered successfully');
              } catch (renderError) {
                console.error('React rendering error:', renderError);
              }
            } else {
              console.error('frameRootRef.current is null!');
            }
          };

          console.log('Adding script to document...');
          // Add the script to the document
          document.head.appendChild(script);

          return () => {
            // Cleanup
            if (document.head.contains(script)) {
              document.head.removeChild(script);
            }
            delete (window as any).__LOAD_FRAME__;
          };
        } catch (error) {
          console.error('Failed to load frame:', error);
        }
      };

      loadFrameComponent();
    }
  }, [currentFile, currentFrame]);

  // Enhanced file matching functions
  function evaluateMatcher(matcher: any, fileAnalysis: FileAnalysis): boolean {
    switch (matcher.type) {
      case 'mimetype':
        return matcher.mimetype === fileAnalysis.mimetype;

      case 'filename':
        if (matcher.pattern) {
          // Support exact match or glob pattern
          if (matcher.pattern.includes('*') || matcher.pattern.includes('?')) {
            // Simple glob pattern matching
            const regexPattern = matcher.pattern
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            return new RegExp(`^${regexPattern}$`).test(fileAnalysis.filename);
          } else {
            // Exact match
            return matcher.pattern === fileAnalysis.filename;
          }
        }
        return false;

      case 'filename-contains':
        if (matcher.substring) {
          // Case-insensitive substring matching
          const hasSubstring = fileAnalysis.filename.toLowerCase().includes(matcher.substring.toLowerCase());

          // If extension is specified, also check that
          if (matcher.extension) {
            const fileExtension = path.extname(fileAnalysis.filename).toLowerCase();
            const targetExtension = matcher.extension.startsWith('.')
              ? matcher.extension.toLowerCase()
              : `.${matcher.extension.toLowerCase()}`;
            return hasSubstring && fileExtension === targetExtension;
          }

          return hasSubstring;
        }
        return false;

      case 'content-json':
        if (!fileAnalysis.isJson || !fileAnalysis.jsonContent) return false;
        if (matcher.requiredProperties) {
          return matcher.requiredProperties.every((prop: string) =>
            fileAnalysis.jsonContent && fileAnalysis.jsonContent[prop] !== undefined
          );
        }
        return true;

      case 'file-size':
        const size = fileAnalysis.size;
        if (matcher.minSize !== undefined && size < matcher.minSize) return false;
        if (matcher.maxSize !== undefined && size > matcher.maxSize) return false;
        return true;

      default:
        return false;
    }
  }

  async function findMatchingFrames(filePath: string): Promise<Array<{frame: Frame, priority: number}>> {
    const frames = await loadFrames();
    const fileAnalysis = await analyzeFile(filePath);
    const matches: Array<{frame: Frame, priority: number}> = [];

    for (const frame of frames) {
      let bestPriority = -1;

      // Check enhanced matchers first
      if ((frame as any).matchers) {
        for (const matcher of (frame as any).matchers) {
          if (evaluateMatcher(matcher, fileAnalysis)) {
            bestPriority = Math.max(bestPriority, matcher.priority);
          }
        }
      }

      // Fallback to legacy mimetype matching
      if (bestPriority === -1 && frame.mimetypes) {
        if (frame.mimetypes.includes(fileAnalysis.mimetype)) {
          bestPriority = 50; // Default priority for legacy matchers
        }
      }

      if (bestPriority > -1) {
        matches.push({ frame, priority: bestPriority });
      }
    }

    // Sort by priority (highest first)
    return matches.sort((a, b) => b.priority - a.priority);
  }

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
          {showFrameSelection ? (
            <div className="frame-selection">
              <div className="selection-header">
                <h2 className="selection-title">Choose frame</h2>
                <p className="selection-subtitle">
                  Multiple frames available for <span className="filename">{currentFile?.path.split('/').pop()}</span>
                </p>
                <div className="file-meta">
                  <span className="file-type">{currentFile?.mimetype}</span>
                </div>
              </div>

              <div className="frame-grid">
                {availableFrames.map(frame => (
                  <button
                    key={frame.id}
                    className="frame-card"
                    onClick={() => selectFrame(frame)}
                  >
                    <div className="card-header">
                      <h3 className="card-title">{frame.name}</h3>
                      <div className="card-badge">
                        <span className="badge-dot"></span>
                        Ready
                      </div>
                    </div>
                    <p className="card-description">{frame.description}</p>
                    <div className="card-footer">
                      <span className="supported-formats">{getSupportedFormats(frame)}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="selection-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowFrameSelection(false);
                    setCurrentFile(null);
                    setCurrentFrame(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : currentFrame ? (
            <div className="frame-container">
              <div className="frame-header">
                <div className="frame-info">
                  <h2 className="frame-title">
                    <span className="file-icon">{currentFile ? '📄' : '⚡'}</span>
                    {currentFile ? currentFile.path.split('/').pop() : currentFrame.name}
                  </h2>
                  <p className="frame-subtitle">
                    {currentFile ? (
                      <>Powered by <span className="frame-name">{currentFrame.name}</span></>
                    ) : (
                      <span className="frame-name">Standalone Utility</span>
                    )}
                  </p>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setCurrentFile(null);
                    setCurrentFrame(null);
                  }}
                >
                  <span className="btn-icon">✕</span>
                  Close
                </button>
              </div>
              <div ref={frameRootRef} className="frame-viewport" />
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
          {/* Frames Directory Section */}
          <div className="sidebar-section">
            <div className="section-header">
              <h4 className="section-title">
                <span className="section-icon">🔧</span>
                Directory
              </h4>
            </div>
            <div className="directory-path">
              {framesDirectory}
            </div>
            <div className="section-actions">
              <button
                className="btn btn-outline btn-sm"
                onClick={handleChangeFramesDirectory}
              >
                <span className="btn-icon">📁</span>
                Change
              </button>
              <button
                className="btn btn-outline btn-sm"
                onClick={handleReloadFrames}
                disabled={isLoadingFrames}
              >
                <span className="btn-icon">{isLoadingFrames ? '⟳' : '🔄'}</span>
                Reload
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="section-header">
              <h4 className="section-title">
                <span className="section-icon">🎨</span>
                Frames
              </h4>
              <span className="section-count">{frames.filter(f => !f.standalone).length}</span>
            </div>

            {isLoadingFrames ? (
              <div className="loading-state">
                <span className="loading-spinner">⟳</span>
                Loading frames...
              </div>
            ) : frames.filter(f => !f.standalone).length === 0 ? (
              <div className="empty-state">
                <p>No file frames found</p>
                <p className="empty-subtitle">Check your directory configuration</p>
              </div>
            ) : (
              <div className="frame-list">
                {frames.filter(f => !f.standalone).map(frame => (
                  <div key={frame.id} className="frame-item">
                    <div className="item-header">
                      <h5 className="item-title">{frame.name}</h5>
                      <div className="item-status">
                        <span className="status-dot"></span>
                      </div>
                    </div>
                    <p className="item-description">{frame.description}</p>
                    <div className="item-formats">
                      {getSupportedFormats(frame)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {frames.filter(f => f.standalone).length > 0 && (
            <div className="sidebar-section">
              <div className="section-header">
                <h4 className="section-title">
                  <span className="section-icon">⚡</span>
                  Utilities
                </h4>
                <span className="section-count">{frames.filter(f => f.standalone).length}</span>
              </div>

              <div className="frame-list">
                {frames.filter(f => f.standalone).map(frame => (
                  <div key={frame.id} className="frame-item standalone-item">
                    <div className="item-header">
                      <h5 className="item-title">{frame.name}</h5>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => launchStandaloneFrame(frame)}
                      >
                        Launch
                      </button>
                    </div>
                    <p className="item-description">{frame.description}</p>
                    <div className="item-formats">
                      {getSupportedFormats(frame)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default App;