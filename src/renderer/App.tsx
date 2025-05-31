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

  // Direct file operations using Node.js - exposed to frames
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
  // Try to get the saved directory from preferences
  try {
    const { app } = require('@electron/remote');
    const path = require('path');
    const fs = require('fs');

    const prefsPath = path.join(app.getPath('userData'), 'preferences.json');
    if (fs.existsSync(prefsPath)) {
      const prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8'));
      if (prefs.visualizersDir && fs.existsSync(prefs.visualizersDir)) {
        console.log('Using saved frames directory:', prefs.visualizersDir);
        return prefs.visualizersDir;
      }
    }
  } catch (error) {
    console.warn('Could not load preferences:', error);
  }

  // Fallback to default location
  const userDataPath = app?.getPath('userData') || path.join(require('os').homedir(), '.vibeframe');
  const fallback = path.join(userDataPath, 'visualizers');
  console.log('Using fallback frames directory:', fallback);
  return fallback;
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

  // Simplified analysis - just basic metadata for matching
  return {
    path: filePath,
    filename,
    mimetype,
    content: '', // Don't read content here anymore
    size: stats.size,
    isJson: mimetype === 'application/json' || filename.endsWith('.json'),
    jsonContent: null // Don't parse JSON here anymore
  };
}

async function loadFrames(): Promise<Frame[]> {
  const FRAMES_DIR = getFramesDirectory();
  console.log('loadFrames: Looking for frames in:', FRAMES_DIR);

  if (!fs.existsSync(FRAMES_DIR)) {
    console.log('loadFrames: Directory does not exist, creating it');
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    return [];
  }

  try {
    const dirContents = fs.readdirSync(FRAMES_DIR);
    console.log('loadFrames: Directory contents:', dirContents);

    const directories = dirContents.filter((dir: string) => {
      const fullPath = path.join(FRAMES_DIR, dir);
      const isDir = fs.statSync(fullPath).isDirectory();
      console.log(`loadFrames: ${dir} is directory: ${isDir}`);
      return isDir;
    });
    console.log('loadFrames: Found directories:', directories);

    const frames = directories.map((dir: string) => {
      const framePath = path.join(FRAMES_DIR, dir);
      const metadataPath = path.join(framePath, 'viz.json');
      console.log(`loadFrames: Checking for metadata at: ${metadataPath}`);

      if (!fs.existsSync(metadataPath)) {
        console.log(`loadFrames: No viz.json found for ${dir}`);
        return null;
      }

      try {
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        console.log(`loadFrames: Successfully loaded metadata for ${dir}:`, metadata);
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

    console.log('loadFrames: Final frames array:', frames);
    return frames;
  } catch (error) {
    console.error('Error loading frames:', error);
    throw error;
  }
}

async function loadFrame(id: string) {
  console.log('loadFrame: Loading frame with id:', id);
  const FRAMES_DIR = getFramesDirectory();
  console.log('loadFrame: Frames directory:', FRAMES_DIR);

  const framePath = path.join(FRAMES_DIR, id);
  const bundlePath = path.join(framePath, 'dist', 'bundle.iife.js');

  console.log('loadFrame: Frame path:', framePath);
  console.log('loadFrame: Bundle path:', bundlePath);
  console.log('loadFrame: Bundle exists:', fs.existsSync(bundlePath));

  if (!fs.existsSync(bundlePath)) {
    console.error('loadFrame: Bundle not found at:', bundlePath);
    throw new Error(`Bundle not found: ${bundlePath}`);
  }

  console.log('loadFrame: Reading bundle content...');
  const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
  console.log('loadFrame: Bundle content length:', bundleContent.length);
  console.log('loadFrame: Bundle content preview:', bundleContent.slice(0, 200) + '...');

  // Also load the config
  const metadataPath = path.join(framePath, 'viz.json');
  console.log('loadFrame: Loading config from:', metadataPath);
  const config = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  console.log('loadFrame: Config loaded:', config);

  return { bundleContent, config };
}

interface FileInput {
  path: string;
  mimetype: string;
  // Remove content and analysis - frames will handle these directly
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

interface OpenTab {
  id: string;
  frame?: Frame; // Optional for new tab
  fileInput?: FileInput; // undefined for standalone frames and new tab
  title: string;
  type: 'file' | 'standalone' | 'newtab';
  frameData?: any; // Store the loaded frame data for reloading
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
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [availableFrames, setAvailableFrames] = useState<Frame[]>([]);
  const [showFrameSelection, setShowFrameSelection] = useState(false);
  const [pendingFileInput, setPendingFileInput] = useState<FileInput | null>(null);
  const [framesDirectory, setFramesDirectory] = useState<string>('');
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const frameRootRef = useRef<HTMLDivElement>(null);
  const currentReactRootRef = useRef<any>(null); // Track the current React root for cleanup

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

    // Create the initial new tab
    const newTab: OpenTab = {
      id: 'initial-tab',
      title: 'New Tab',
      type: 'newtab'
    };
    setOpenTabs([newTab]);
    setActiveTabId('initial-tab');
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

  const generateTabId = () => `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const openFrameInNewTab = async (frame: Frame, fileInput?: FileInput) => {
    const title = fileInput
      ? fileInput.path.split('/').pop() || 'Unknown File'
      : frame.name;

    let frameData;

    // Load frame data immediately for both file and standalone frames
    try {
      frameData = await loadFrame(frame.id);
      console.log('Frame data loaded for new tab:', frameData);
    } catch (error) {
      console.error('Failed to load frame data for new tab:', error);
      alert(`Failed to load ${frame.name}: ${error}`);
      return;
    }

    // Check if we have an active new tab to transform, otherwise create a new one
    const currentTab = openTabs.find(tab => tab.id === activeTabId);
    if (currentTab && currentTab.type === 'newtab') {
      // Transform the current new tab
      const transformedTab: OpenTab = {
        ...currentTab,
        frame,
        fileInput,
        title,
        type: fileInput ? 'file' : 'standalone',
        frameData
      };

      setOpenTabs(prev => prev.map(tab =>
        tab.id === activeTabId ? transformedTab : tab
      ));
    } else {
      // Create a new tab
      const tabId = generateTabId();
      const newTab: OpenTab = {
        id: tabId,
        frame,
        fileInput,
        title,
        type: fileInput ? 'file' : 'standalone',
        frameData
      };

      setOpenTabs(prev => [...prev, newTab]);
      setActiveTabId(tabId);
    }

    setShowFrameSelection(false);
    setPendingFileInput(null);
  };

  const closeTab = (tabId: string) => {
    setOpenTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);

      // If we closed the active tab, activate another one
      if (activeTabId === tabId) {
        const currentIndex = prev.findIndex(tab => tab.id === tabId);
        if (filtered.length > 0) {
          // Activate the tab to the right, or the rightmost if we closed the last tab
          const newActiveIndex = Math.min(currentIndex, filtered.length - 1);
          setActiveTabId(filtered[newActiveIndex]?.id || null);
        } else {
          // If no tabs left, create a new tab
          const newTab: OpenTab = {
            id: generateTabId(),
            title: 'New Tab',
            type: 'newtab'
          };
          setOpenTabs([newTab]);
          setActiveTabId(newTab.id);
          return [newTab];
        }
      }

      return filtered;
    });
  };

  const selectFrame = async (frame: Frame) => {
    if (pendingFileInput) {
      await openFrameInNewTab(frame, pendingFileInput);
    }
  };

  const launchStandaloneFrame = async (frame: Frame) => {
    try {
      console.log('Launching standalone frame:', frame.name, frame.id);
      // openFrameInNewTab will handle loading the frame data
      await openFrameInNewTab(frame);
    } catch (error) {
      console.error('Failed to launch standalone frame:', error);
      alert(`Failed to launch ${frame.name}: ${error}`);
    }
  };

  // Get the currently active tab
  const activeTab = openTabs.find(tab => tab.id === activeTabId);

  // Load and render the frame when activeTab changes
  useEffect(() => {
    console.log('Frame loading useEffect triggered:', {
      activeTab: activeTab?.frame?.name || activeTab?.title,
      frameRootRef: !!frameRootRef.current,
      hasFrameData: !!activeTab?.frameData
    });

    // Always clear previous content and unmount previous React root first
    if (currentReactRootRef.current) {
      console.log('Unmounting previous React root');
      try {
        currentReactRootRef.current.unmount();
      } catch (error) {
        console.warn('Error unmounting React root:', error);
      }
      currentReactRootRef.current = null;
    }

    if (frameRootRef.current) {
      frameRootRef.current.innerHTML = '';
      console.log('Cleared previous frame content');
    }

    if (activeTab && activeTab.type !== 'newtab' && frameRootRef.current && activeTab.frameData && activeTab.frame) {
      const loadFrameComponent = async () => {
        try {
          console.log('Starting frame component load for:', activeTab.frame!.name);

          const frameData = activeTab.frameData;
          let props;

          // Check if this is a standalone frame
          if (!activeTab.fileInput) {
            console.log('Loading standalone frame from stored data');
            props = {
              // No fileData for standalone frames
              container: frameRootRef.current
            };
          } else {
            console.log('Loading file-based frame for file:', activeTab.fileInput.path);
            console.log('Frame data loaded:', {
              hasBundleContent: !!frameData.bundleContent,
              bundleLength: frameData.bundleContent?.length,
              config: frameData.config
            });
            props = {
              // Pass simplified file input - just path and mimetype
              fileInput: activeTab.fileInput,
              // Keep legacy fileData for backward compatibility during transition
              fileData: {
                path: activeTab.fileInput.path,
                mimetype: activeTab.fileInput.mimetype,
                content: '', // Empty - frames should read directly
                analysis: {
                  filename: path.basename(activeTab.fileInput.path),
                  size: 0, // Frames can get this via fs.stat
                  isJson: activeTab.fileInput.mimetype === 'application/json' || activeTab.fileInput.path.endsWith('.json'),
                  jsonContent: null
                }
              },
              container: frameRootRef.current
            };
          }

          console.log('Creating script element for frame execution...');

          // Create a new script element with the bundle content
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.textContent = frameData.bundleContent;

          console.log('Script element created, setting up frame loader functions...');

          // When the script loads, it will call this function
          const frameLoader = (FrameComponent: any) => {
            console.log('Frame loader called with component:', FrameComponent);
            console.log('frameRootRef.current:', frameRootRef.current);
            console.log('Props for frame:', props);

            if (frameRootRef.current) {
              const root = document.createElement('div');
              frameRootRef.current.appendChild(root);
              console.log('Created and appended root div:', root);

              // Create a new React root
              try {
                const reactRoot = createRoot(root);
                console.log('Created React root successfully');

                // Store the React root for cleanup
                currentReactRootRef.current = reactRoot;

                console.log('Rendering frame component...');
                reactRoot.render(
                  React.createElement(FrameComponent, props)
                );
                console.log('Frame rendered successfully');
              } catch (renderError) {
                console.error('React rendering error:', renderError);
              }
            } else {
              console.error('frameRootRef.current is null when frame loader called!');
            }
          };

          // Support both new and legacy patterns
          (window as any).__LOAD_FRAME__ = frameLoader;
          (window as any).__LOAD_VISUALIZER__ = frameLoader;
          console.log('Set up both __LOAD_FRAME__ and __LOAD_VISUALIZER__ handlers');

          console.log('Adding script to document head...');
          // Add the script to the document
          document.head.appendChild(script);
          console.log('Script added to document');

          return () => {
            console.log('Cleaning up frame script');
            // Cleanup
            if (document.head.contains(script)) {
              document.head.removeChild(script);
            }
            delete (window as any).__LOAD_FRAME__;
            delete (window as any).__LOAD_VISUALIZER__;
          };
        } catch (error) {
          console.error('Failed to load frame component:', error);
          console.error('Error details:', {
            name: (error as Error).name,
            message: (error as Error).message,
            stack: (error as Error).stack
          });
        }
      };

      loadFrameComponent();
    } else {
      console.log('Frame loading conditions not met:', {
        hasActiveTab: !!activeTab,
        isNewTab: activeTab?.type === 'newtab',
        hasFrameRootRef: !!frameRootRef.current,
        hasFrameData: !!activeTab?.frameData,
        hasFrame: !!activeTab?.frame
      });
    }
  }, [activeTab]);

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

  useEffect(() => {
    // Handle file drops
    const handleFileDrop = async (filePath: string) => {
      try {
        console.log('=== FILE DROP STARTED ===');
        console.log('handleFileDrop: Processing file:', filePath);

        // Simplified file analysis for matching only
        const fileAnalysis = await analyzeFile(filePath);
        console.log('handleFileDrop: File analysis:', fileAnalysis);

        // Create simplified file input - just path and mimetype
        const fileInput: FileInput = {
          path: filePath,
          mimetype: fileAnalysis.mimetype
        };
        console.log('handleFileDrop: File input prepared:', fileInput);

        // Find matching frames directly
        const matches = await findMatchingFrames(filePath);
        console.log('handleFileDrop: Found matches:', matches);

        if (matches.length === 0) {
          console.log('handleFileDrop: No matches found');
          alert(`No frame found for this file.\n\nFile: ${fileAnalysis.filename}\nType: ${fileAnalysis.mimetype}\nSize: ${(fileAnalysis.size / 1024).toFixed(1)} KB`);
        } else if (matches.length === 1) {
          console.log('handleFileDrop: Single match found, auto-selecting:', matches[0].frame.name);
          await openFrameInNewTab(matches[0].frame, fileInput);
          console.log('handleFileDrop: Opened in new tab');
        } else {
          console.log('handleFileDrop: Multiple matches found, showing selection');
          setPendingFileInput(fileInput);
          setAvailableFrames(matches.map((m: any) => ({
            ...m.frame,
            matchPriority: m.priority
          })));
          setShowFrameSelection(true);
          console.log('handleFileDrop: State set for multiple matches');
        }
        console.log('=== FILE DROP COMPLETED ===');
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

  const createNewTab = () => {
    const tabId = generateTabId();
    const newTab: OpenTab = {
      id: tabId,
      title: 'New Tab',
      type: 'newtab'
    };

    setOpenTabs(prev => [...prev, newTab]);
    setActiveTabId(tabId);
    setShowFrameSelection(false);
    setPendingFileInput(null);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          {/* Tabs first, right after macOS traffic lights */}
          <div className="header-tabs">
            <div className="tabs-list">
              {openTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`tab ${tab.id === activeTabId ? 'tab-active' : ''}`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <div className="tab-icon">
                    {tab.type === 'newtab' ? '➕' : tab.type === 'standalone' ? '⚡' : '📄'}
                  </div>
                  <div className="tab-content">
                    <span className="tab-title">{tab.title}</span>
                    {tab.frame && <span className="tab-subtitle">{tab.frame.name}</span>}
                  </div>
                  {tab.type !== 'newtab' && (
                    <button
                      className="tab-close"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      title="Close tab"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}

              {/* New Tab Button */}
              <button
                className="new-tab-btn"
                onClick={createNewTab}
                title="New tab"
              >
                +
              </button>
            </div>
          </div>

          {/* Vibeframe logo on the right */}
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
                  Multiple frames available for <span className="filename">{pendingFileInput?.path.split('/').pop()}</span>
                </p>
                <div className="file-meta">
                  <span className="file-type">{pendingFileInput?.mimetype}</span>
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
                    setPendingFileInput(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="frame-viewport-container">
              {activeTab?.type === 'newtab' ? (
                <div className="new-tab-content">
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

                      {/* Standalone Frames Section */}
                      {frames.filter(f => f.standalone).length > 0 && (
                        <div className="drop-zone-divider">
                          <div className="divider-line"></div>
                          <span className="divider-text">Or, launch these standalone utilities</span>
                          <div className="divider-line"></div>
                        </div>
                      )}

                      {frames.filter(f => f.standalone).length > 0 && (
                        <div className="standalone-frames-grid">
                          {frames.filter(f => f.standalone).map(frame => (
                            <button
                              key={frame.id}
                              className="standalone-frame-card"
                              onClick={() => launchStandaloneFrame(frame)}
                            >
                              <div className="standalone-frame-icon">⚡</div>
                              <div className="standalone-frame-content">
                                <h4 className="standalone-frame-title">{frame.name}</h4>
                                <p className="standalone-frame-description">{frame.description}</p>
                              </div>
                              <div className="standalone-frame-action">Launch</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={frameRootRef} className="frame-viewport" />
              )}
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