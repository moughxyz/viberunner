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

// Frame cleanup system
const frameCleanupCallbacks = new Map<string, (() => void)[]>();

// Global cleanup registration function for frames
const registerCleanup = (tabId: string, cleanupFn: () => void) => {
  if (!frameCleanupCallbacks.has(tabId)) {
    frameCleanupCallbacks.set(tabId, []);
  }
  frameCleanupCallbacks.get(tabId)!.push(cleanupFn);
};

// Global cleanup execution function
const executeCleanup = (tabId: string) => {
  const callbacks = frameCleanupCallbacks.get(tabId);
  if (callbacks) {
    console.log(`Executing ${callbacks.length} cleanup callbacks for tab ${tabId}`);
    callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in frame cleanup callback:', error);
      }
    });
    frameCleanupCallbacks.delete(tabId);
  }
};

// Make cleanup functions available globally for frames
(window as any).registerCleanup = registerCleanup;
(window as any).executeCleanup = executeCleanup;

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
  frame?: Frame; // Optional for new tab - represents the app/visualization
  fileInput?: FileInput; // undefined for standalone apps and new tab
  title: string;
  type: 'file' | 'standalone' | 'newtab';
  frameData?: any; // Store the loaded app data for reloading
  reactRoot?: any; // Store the React root for each tab
  domContainer?: HTMLDivElement; // Store the DOM container for each tab
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
  const [showFileFrames, setShowFileFrames] = useState(false); // Collapsed by default
  const frameRootRef = useRef<HTMLDivElement>(null);

  // Imperative tab management - outside React state
  const tabContainersRef = useRef<Map<string, {
    domElement: HTMLDivElement;
    reactRoot: any;
    styleElement?: HTMLStyleElement;
  }>>(new Map());

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
      alert('Failed to load apps. Please check your apps directory.');
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
        alert(`Apps directory changed to: ${result.directory}`);
      }
    } catch (error) {
      console.error('Error changing frames directory:', error);
      alert('Failed to change apps directory.');
    }
  };

  const handleReloadFrames = async () => {
    await reloadFrames();
    alert('Apps reloaded successfully!');
  };

  const generateTabId = () => `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Imperative function to create a frame container
  const createFrameContainer = async (tab: OpenTab): Promise<boolean> => {
    if (!frameRootRef.current || !tab.frame || !tab.frameData) {
      console.error('Cannot create frame container:', {
        hasFrameRoot: !!frameRootRef.current,
        hasFrame: !!tab.frame,
        hasFrameData: !!tab.frameData
      });
      return false;
    }

    console.log('Creating frame container for tab:', tab.id);

    // Create DOM container
    const container = document.createElement('div');
    container.className = 'tab-frame-container';
    container.style.position = 'absolute';
    container.style.top = '0';
    container.style.left = '0';
    container.style.right = '0';
    container.style.bottom = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.display = 'none'; // Start hidden
    frameRootRef.current.appendChild(container);

    // Prepare props with cleanup support
    let props;
    if (!tab.fileInput) {
      props = {
        container,
        tabId: tab.id
      };
    } else {
      props = {
        fileInput: tab.fileInput,
        fileData: {
          path: tab.fileInput.path,
          mimetype: tab.fileInput.mimetype,
          content: '',
          analysis: {
            filename: path.basename(tab.fileInput.path),
            size: 0,
            isJson: tab.fileInput.mimetype === 'application/json' || tab.fileInput.path.endsWith('.json'),
            jsonContent: null
          }
        },
        container,
        tabId: tab.id
      };
    }

    return new Promise((resolve) => {
      // Create script and load frame
      const script = document.createElement('script');

      // AUTO-SCOPE CSS: Process the frame bundle to automatically scope CSS
      let processedBundleContent = tab.frameData.bundleContent;

      // Pattern to match CSS strings in the bundle (CSS-in-JS or template literals)
      const cssPatterns = [
        // CSS template literals or strings that start with selectors
        /(`|"|')([^`"']*(?:\*\s*\{|\.[\w-]+\s*\{|#[\w-]+\s*\{|[a-zA-Z][a-zA-Z0-9]*\s*\{)[^`"']*)\1/g,
        // Inline style objects that might contain CSS
        /style\s*:\s*`([^`]*(?:\{[^}]*\}[^`]*)*)`/g,
        // CSS strings in createGlobalStyle or similar
        /createGlobalStyle`([^`]*)`/g
      ];

      cssPatterns.forEach(pattern => {
        processedBundleContent = processedBundleContent.replace(pattern, (match: string, quote: string, cssContent: string) => {
          if (!cssContent) return match;

          // Don't process if already scoped to .tab-frame-container
          if (cssContent.includes('.tab-frame-container') || cssContent.includes(`[data-frame-id="${tab.id}"]`)) {
            return match;
          }

          // Auto-scope CSS selectors
          const scopedCSS = cssContent
            // Scope universal selector
            .replace(/^\s*\*\s*\{/gm, `[data-frame-id="${tab.id}"] * {`)
            // Scope element selectors
            .replace(/^(\s*)([a-zA-Z][a-zA-Z0-9]*)\s*\{/gm, `$1[data-frame-id="${tab.id}"] $2 {`)
            // Scope class selectors
            .replace(/^(\s*)(\.[\w-]+)\s*\{/gm, `$1[data-frame-id="${tab.id}"] $2 {`)
            // Scope ID selectors
            .replace(/^(\s*)(#[\w-]+)\s*\{/gm, `$1[data-frame-id="${tab.id}"] $2 {`)
            // Scope descendant selectors
            .replace(/^(\s*)([.#]?[\w-]+(?:\s+[.#]?[\w-]+)*)\s*\{/gm, `$1[data-frame-id="${tab.id}"] $2 {`)
            // Handle @media queries by scoping the content inside
            .replace(/@media[^{]+\{([^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g, (mediaMatch: string, mediaContent: string) => {
              const scopedMediaContent = mediaContent
                .replace(/^\s*\*\s*\{/gm, `[data-frame-id="${tab.id}"] * {`)
                .replace(/^(\s*)([a-zA-Z][a-zA-Z0-9]*)\s*\{/gm, `$1[data-frame-id="${tab.id}"] $2 {`)
                .replace(/^(\s*)(\.[\w-]+)\s*\{/gm, `$1[data-frame-id="${tab.id}"] $2 {`)
                .replace(/^(\s*)(#[\w-]+)\s*\{/gm, `$1[data-frame-id="${tab.id}"] $2 {`);
              return mediaMatch.replace(mediaContent, scopedMediaContent);
            });

          return quote ? `${quote}${scopedCSS}${quote}` : scopedCSS;
        });
      });

      // Also intercept any dynamic style injection
      const frameStyleInterceptor = `
        // Intercept style injection for frame isolation
        (function() {
          const originalCreateElement = document.createElement;
          const frameId = "${tab.id}";

          document.createElement = function(tagName) {
            const element = originalCreateElement.call(this, tagName);

            if (tagName.toLowerCase() === 'style') {
              // Mark style elements created by this frame
              element.setAttribute('data-frame-style', frameId);

              // Override textContent to auto-scope CSS - with safety checks
              try {
                const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'textContent') ||
                                 Object.getOwnPropertyDescriptor(Node.prototype, 'textContent') ||
                                 Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'textContent');

                if (descriptor && descriptor.set) {
                  const originalTextContentSetter = descriptor.set;
                  Object.defineProperty(element, 'textContent', {
                    set: function(value) {
                      if (value && typeof value === 'string') {
                        // Auto-scope the CSS
                        const scopedCSS = value
                          .replace(/^\\s*\\*\\s*\\{/gm, \`[data-frame-id="\${frameId}"] * {\`)
                          .replace(/^(\\s*)([a-zA-Z][a-zA-Z0-9]*)\\s*\\{/gm, \`$1[data-frame-id="\${frameId}"] $2 {\`)
                          .replace(/^(\\s*)(\\.[\\w-]+)\\s*\\{/gm, \`$1[data-frame-id="\${frameId}"] $2 {\`)
                          .replace(/^(\\s*)(#[\\w-]+)\\s*\\{/gm, \`$1[data-frame-id="\${frameId}"] $2 {\`);
                        originalTextContentSetter.call(this, scopedCSS);
                      } else {
                        originalTextContentSetter.call(this, value);
                      }
                    },
                    get: descriptor.get,
                    enumerable: descriptor.enumerable,
                    configurable: descriptor.configurable
                  });
                }
              } catch (err) {
                console.warn('Failed to intercept textContent for frame CSS scoping:', err);
              }
            }

            return element;
          };
        })();
      `;

      script.textContent = frameStyleInterceptor + '\n' + processedBundleContent;

      const frameLoader = (FrameComponent: any) => {
        console.log('Frame loader called for tab:', tab.id);

        try {
          // Create an isolation wrapper div
          const isolationWrapper = document.createElement('div');
          isolationWrapper.style.cssText = `
            width: 100% !important;
            height: 100% !important;
            max-width: 100% !important;
            max-height: 100% !important;
            position: relative !important;
            overflow: auto !important;
            display: block !important;
            contain: layout style size !important;
            isolation: isolate !important;
            z-index: 1 !important;
          `;

          container.appendChild(isolationWrapper);

          // Render directly into the isolation wrapper
          const reactRoot = createRoot(isolationWrapper);

          // Add strong containment attributes to the container
          container.style.contain = 'layout style size';
          container.style.isolation = 'isolate';
          container.style.zIndex = '1';

          // Create a style element for frame-specific overrides
          const frameStyleOverride = document.createElement('style');
          frameStyleOverride.setAttribute('data-frame-style-override', tab.id);
          frameStyleOverride.textContent = `
            /* Auto-generated frame isolation for ${tab.frame?.name || 'Unknown'} */
            [data-frame-id="${tab.id}"] {
              position: relative !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              max-height: 100% !important;
              overflow: auto !important;
              contain: layout style size !important;
              isolation: isolate !important;
            }

            /* Prevent global CSS pollution from frame */
            [data-frame-id="${tab.id}"] * {
              position: relative !important;
              max-width: 100% !important;
              max-height: 100% !important;
            }

            /* Override viewport units within frame */
            [data-frame-id="${tab.id}"] [style*="100vh"],
            [data-frame-id="${tab.id}"] [style*="100VH"] {
              height: 100% !important;
            }

            [data-frame-id="${tab.id}"] [style*="100vw"],
            [data-frame-id="${tab.id}"] [style*="100VW"] {
              width: 100% !important;
            }

            /* Prevent fixed positioning */
            [data-frame-id="${tab.id}"] [style*="position: fixed"],
            [data-frame-id="${tab.id}"] [style*="position:fixed"] {
              position: relative !important;
            }

            /* Ensure common frame root classes are contained */
            [data-frame-id="${tab.id}"] .dotfile-editor,
            [data-frame-id="${tab.id}"] [class*="App"],
            [data-frame-id="${tab.id}"] [class*="app"],
            [data-frame-id="${tab.id}"] [class*="main"],
            [data-frame-id="${tab.id}"] [class*="container"],
            [data-frame-id="${tab.id}"] [class*="wrapper"],
            [data-frame-id="${tab.id}"] [class*="root"] {
              position: relative !important;
              width: 100% !important;
              height: 100% !important;
              max-width: 100% !important;
              max-height: 100% !important;
              overflow: auto !important;
              box-sizing: border-box !important;
            }
          `;
          document.head.appendChild(frameStyleOverride);

          // Add frame identifier for CSS scoping
          isolationWrapper.setAttribute('data-frame-id', tab.id);

          reactRoot.render(React.createElement(FrameComponent, props));

          // Store in our ref including the style element for cleanup
          tabContainersRef.current.set(tab.id, {
            domElement: container,
            reactRoot,
            styleElement: frameStyleOverride
          });

          console.log('Frame loaded successfully for tab:', tab.id);
          resolve(true);
        } catch (error) {
          console.error('Error rendering frame for tab:', tab.id, error);
          resolve(false);
        }
      };

      (window as any).__LOAD_FRAME__ = frameLoader;
      (window as any).__LOAD_VISUALIZER__ = frameLoader;

      document.head.appendChild(script);

      // Cleanup script after execution and clean up any frame-injected styles
      setTimeout(() => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }

        // Clean up any style elements created by the frame that weren't scoped
        const frameStyles = document.querySelectorAll(`style[data-frame-style="${tab.id}"]`);
        frameStyles.forEach(style => {
          if (!style.textContent?.includes(`[data-frame-id="${tab.id}"]`)) {
            console.warn('Removing unscoped frame style element');
            style.remove();
          }
        });

        delete (window as any).__LOAD_FRAME__;
        delete (window as any).__LOAD_VISUALIZER__;

        // If frameLoader wasn't called, resolve with false
        if (!tabContainersRef.current.has(tab.id)) {
          console.warn('Frame loader was not called for tab:', tab.id);
          resolve(false);
        }
      }, 1000); // Longer timeout to ensure frame loads
    });
  };

  // Imperative function to switch tab visibility
  const switchToTab = (tabId: string, tabData?: OpenTab) => {
    // Use provided tab data or look up from state
    const activeTab = tabData || openTabs.find(tab => tab.id === tabId);

    console.log('Switching to tab:', tabId, 'type:', activeTab?.type);

    // Hide all frame containers
    tabContainersRef.current.forEach((container, id) => {
      console.log('Hiding container for tab:', id);
      container.domElement.style.display = 'none';
    });

    // Show the active tab's container if it's not a new tab
    if (activeTab && activeTab.type !== 'newtab') {
      const container = tabContainersRef.current.get(tabId);
      if (container) {
        console.log('Showing container for tab:', tabId);
        container.domElement.style.display = 'block';
      } else {
        console.warn('No container found for tab:', tabId);
      }
    }

    setActiveTabId(tabId);
  };

  const openFrameInNewTab = async (frame: Frame, fileInput?: FileInput) => {
    const title = fileInput
      ? fileInput.path.split('/').pop() || 'Unknown File'
      : frame.name;

    let frameData;

    // Load frame data
    try {
      frameData = await loadFrame(frame.id);
    } catch (error) {
      console.error('Failed to load frame data for new tab:', error);
      alert(`Failed to load ${frame.name}: ${error}`);
      return;
    }

    // Check if we have an active new tab to transform
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

      // Create the frame container and wait for it to be ready
      const success = await createFrameContainer(transformedTab);

      if (success) {
        // Switch to show this tab, passing the transformed tab data
        switchToTab(transformedTab.id, transformedTab);
      } else {
        console.error('Failed to create frame container for transformed tab');
        alert(`Failed to load ${frame.name}`);
      }
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

      // Create the frame container and wait for it to be ready
      const success = await createFrameContainer(newTab);

      if (success) {
        // Switch to show this tab, passing the new tab data
        switchToTab(tabId, newTab);
      } else {
        console.error('Failed to create frame container for new tab');
        alert(`Failed to load ${frame.name}`);
      }
    }

    setShowFrameSelection(false);
    setPendingFileInput(null);
  };

  const closeTab = (tabId: string) => {
    console.log('Closing tab:', tabId);

    // Execute cleanup callbacks for this tab
    executeCleanup(tabId);

    // Cleanup the tab's container
    const container = tabContainersRef.current.get(tabId);
    if (container) {
      console.log('Cleaning up container for tab:', tabId);
      try {
        container.reactRoot.unmount();

        // Remove the frame-specific style element
        if (container.styleElement && document.head.contains(container.styleElement)) {
          document.head.removeChild(container.styleElement);
        }

        if (frameRootRef.current && frameRootRef.current.contains(container.domElement)) {
          frameRootRef.current.removeChild(container.domElement);
        }
      } catch (error) {
        console.warn('Error cleaning up tab container:', error);
      }
      tabContainersRef.current.delete(tabId);
    }

    setOpenTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);

      // If we closed the active tab, activate another one
      if (activeTabId === tabId) {
        const currentIndex = prev.findIndex(tab => tab.id === tabId);
        if (filtered.length > 0) {
          const newActiveIndex = Math.min(currentIndex, filtered.length - 1);
          const newActiveTab = filtered[newActiveIndex];
          switchToTab(newActiveTab.id);
        } else {
          // If no tabs left, create a new tab
          const newTab: OpenTab = {
            id: generateTabId(),
            title: 'New Tab',
            type: 'newtab'
          };
          setOpenTabs([newTab]);
          switchToTab(newTab.id);
          return [newTab];
        }
      }

      return filtered;
    });
  };

  // Handle tab switching
  const handleTabSwitch = (tabId: string) => {
    switchToTab(tabId);
  };

  const selectFrame = async (frame: Frame) => {
    if (pendingFileInput) {
      await openFrameInNewTab(frame, pendingFileInput);
    }
  };

  const launchStandaloneFrame = async (frame: Frame) => {
    try {
      console.log('Launching standalone frame:', frame.name, frame.id);
      await openFrameInNewTab(frame);
    } catch (error) {
      console.error('Failed to launch standalone frame:', error);
      alert(`Failed to launch ${frame.name}: ${error}`);
    }
  };

  // Get the currently active tab
  const activeTab = openTabs.find(tab => tab.id === activeTabId);

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
          alert(`No app found for this file.\n\nFile: ${fileAnalysis.filename}\nType: ${fileAnalysis.mimetype}\nSize: ${(fileAnalysis.size / 1024).toFixed(1)} KB`);
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
    switchToTab(tabId);
    setShowFrameSelection(false);
    setPendingFileInput(null);
  };

  return (
    <div className="vf-app">
      <header id="vf-header">
        <div className="vf-header-content">
          {/* Tabs first, right after macOS traffic lights */}
          <div className="vf-header-tabs">
            <div className="vf-tabs-list">
              {openTabs.map(tab => (
                <div
                  key={tab.id}
                  className={`vf-tab ${tab.id === activeTabId ? 'vf-tab-active' : ''}`}
                  onClick={() => handleTabSwitch(tab.id)}
                >
                  <div className="vf-tab-icon">
                    {tab.type === 'newtab' ? '➕' : tab.type === 'standalone' ? '⚡' : '📄'}
                  </div>
                  <div className="vf-tab-content">
                    <span className="vf-tab-title">{tab.title}</span>
                    {tab.frame && <span className="vf-tab-subtitle">{tab.frame.name}</span>}
                  </div>
                  {tab.type !== 'newtab' && (
                    <button
                      className="vf-tab-close"
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
                className="vf-new-tab-btn"
                onClick={createNewTab}
                title="New tab"
              >
                +
              </button>
            </div>
          </div>

          {/* Vibeframe logo on the right */}
          <h1 className="vf-app-title">
            <div className="vf-app-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="20" height="20" rx="4" ry="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 8c2 0 2 4 4 4s2-4 4-4 2 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M6 16c2 0 2-4 4-4s2 4 4 4 2-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            VibeApps
          </h1>
        </div>
      </header>

      <div id="vf-main-layout">
        <main className="vf-content-area">
          {showFrameSelection ? (
            <div className="vf-frame-selection">
              <div className="selection-header">
                <h2 className="selection-title">Choose app</h2>
                <p className="selection-subtitle">
                  Multiple apps available for <span className="filename">{pendingFileInput?.path.split('/').pop()}</span>
                </p>
                <div className="file-meta">
                  <span className="file-type">{pendingFileInput?.mimetype}</span>
                </div>
              </div>

              <div className="frame-grid">
                {availableFrames.map(frame => (
                  <div
                    key={frame.id}
                    className="frame-card"
                    onClick={() => selectFrame(frame)}
                  >
                    <div className="card-header">
                      <h3 className="card-title">{frame.name}</h3>
                      <div className="card-badge">
                        <div className="badge-dot"></div>
                        Ready
                      </div>
                    </div>
                    <p className="card-description">{frame.description}</p>
                    <div className="card-footer">
                      <div className="supported-formats">
                        {getSupportedFormats(frame)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="selection-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowFrameSelection(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="frame-viewport-container">
              {/* Always render frame viewport for tab containers */}
              <div ref={frameRootRef} className="frame-viewport" />

              {/* Unified new tab interface when active tab is new tab */}
              {activeTab?.type === 'newtab' && (
                <div className="vf-new-tab-unified">
                  <div className="unified-content">
                    {/* Show only directory setup if no frames directory is properly configured */}
                    {!framesDirectory || framesDirectory === 'Not set' || frames.length === 0 ? (
                      <div className="directory-setup-only">
                        <div className="setup-header">
                          <div className="setup-icon">📁</div>
                          <h2 className="setup-title">Set up your apps directory</h2>
                          <p className="setup-description">
                            Choose a directory containing your visualization apps to get started.
                          </p>
                        </div>

                        <div className="directory-card">
                          <div className="directory-info">
                            <h4 className="directory-label">Current Directory</h4>
                            <div className="directory-path">
                              {framesDirectory || 'No directory selected'}
                            </div>
                          </div>
                          <div className="directory-actions">
                            <button
                              className="btn btn-primary"
                              onClick={handleChangeFramesDirectory}
                            >
                              <span className="btn-icon">📁</span>
                              Choose Directory
                            </button>
                            {framesDirectory && framesDirectory !== 'Not set' && (
                              <button
                                className="btn btn-outline"
                                onClick={handleReloadFrames}
                                disabled={isLoadingFrames}
                              >
                                <span className="btn-icon">{isLoadingFrames ? '⟳' : '🔄'}</span>
                                Reload
                              </button>
                            )}
                          </div>
                        </div>

                        {framesDirectory && framesDirectory !== 'Not set' && frames.length === 0 && (
                          <div className="setup-hint">
                            <p>No visualization apps found in this directory.</p>
                            <p>Make sure your directory contains properly configured apps with viz.json files.</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* Main drop zone section */}
                        <div className="drop-zone-section">
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
                        </div>

                        {/* Divider */}
                        <div className="section-divider"></div>

                        {/* Standalone frames section */}
                        {frames.filter(f => f.standalone).length > 0 && (
                          <div className="utilities-section">
                            <div className="section-card">
                              <div className="section-header">
                                <h4 className="section-title">
                                  <span className="section-icon">⚡</span>
                                  Standalone Apps
                                </h4>
                                <span className="section-count">{frames.filter(f => f.standalone).length}</span>
                              </div>
                              <div className="utilities-grid">
                                {frames.filter(f => f.standalone).map(frame => (
                                  <button
                                    key={frame.id}
                                    className="utility-card"
                                    onClick={() => launchStandaloneFrame(frame)}
                                  >
                                    <div className="utility-icon">⚡</div>
                                    <div className="utility-content">
                                      <h5 className="utility-title">{frame.name}</h5>
                                      <p className="utility-description">{frame.description}</p>
                                    </div>
                                    <div className="utility-action">Launch</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Directory controls section */}
                        <div className="controls-section">
                          <div className="section-card">
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
                        </div>

                        {/* File-based frames section - collapsible */}
                        {frames.filter(f => !f.standalone).length > 0 && (
                          <div className="frames-section">
                            <div className="section-card">
                              <div className="section-header">
                                <button
                                  className="section-header-button"
                                  onClick={() => setShowFileFrames(!showFileFrames)}
                                >
                                  <h4 className="section-title">
                                    <span className="section-icon">🎨</span>
                                    File Apps
                                  </h4>
                                  <div className="section-meta">
                                    <span className="section-count">{frames.filter(f => !f.standalone).length}</span>
                                    <span className="section-toggle">{showFileFrames ? '▼' : '▶'}</span>
                                  </div>
                                </button>
                              </div>
                              {showFileFrames && (
                                isLoadingFrames ? (
                                  <div className="loading-state">
                                    <span className="loading-spinner">⟳</span>
                                    Loading apps...
                                  </div>
                                ) : (
                                  <div className="frames-grid">
                                    {frames.filter(f => !f.standalone).map(frame => (
                                      <div key={frame.id} className="frame-info-card">
                                        <div className="frame-info-header">
                                          <h5 className="frame-info-title">{frame.name}</h5>
                                          <div className="frame-info-status">
                                            <span className="status-dot"></span>
                                          </div>
                                        </div>
                                        <p className="frame-info-description">{frame.description}</p>
                                        <div className="frame-info-formats">
                                          {getSupportedFormats(frame)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;