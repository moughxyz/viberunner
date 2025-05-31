import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// Direct Node.js access with full integration
const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const { app } = require('@electron/remote') || require('electron').remote?.app;

// Expose React and ReactDOM globally for apps
(window as any).React = React;
(window as any).ReactDOM = { createRoot };

// Simplified API - only direct operations, no IPC
const api = {
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

  // User Preferences API for apps
  getAppPreferences: (appId: string) => {
    try {
      const FRAMES_DIR = getFramesDirectory();
      const framePath = path.join(FRAMES_DIR, appId);
      const metadataPath = path.join(framePath, 'viz.json');

      if (!fs.existsSync(metadataPath)) {
        console.warn(`No viz.json found for app ${appId}`);
        return {};
      }

      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      return metadata.userPreferences || {};
    } catch (error) {
      console.error(`Failed to read preferences for app ${appId}:`, error);
      return {};
    }
  },

  setAppPreferences: (appId: string, preferences: any) => {
    try {
      const FRAMES_DIR = getFramesDirectory();
      const framePath = path.join(FRAMES_DIR, appId);
      const metadataPath = path.join(framePath, 'viz.json');

      if (!fs.existsSync(metadataPath)) {
        throw new Error(`No viz.json found for app ${appId}`);
      }

      // Read current metadata
      const metadataContent = fs.readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent);

      // Update preferences
      metadata.userPreferences = preferences;

      // Write back to file with pretty formatting
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      console.log(`Updated preferences for app ${appId}`);
      return true;
    } catch (error) {
      console.error(`Failed to write preferences for app ${appId}:`, error);
      return false;
    }
  },

  updateAppPreference: (appId: string, key: string, value: any) => {
    try {
      const currentPreferences = api.getAppPreferences(appId);
      const updatedPreferences = { ...currentPreferences, [key]: value };
      return api.setAppPreferences(appId, updatedPreferences);
    } catch (error) {
      console.error(`Failed to update preference ${key} for app ${appId}:`, error);
      return false;
    }
  },

  removeAppPreference: (appId: string, key: string) => {
    try {
      const currentPreferences = api.getAppPreferences(appId);
      const updatedPreferences = { ...currentPreferences };
      delete updatedPreferences[key];
      return api.setAppPreferences(appId, updatedPreferences);
    } catch (error) {
      console.error(`Failed to remove preference ${key} for app ${appId}:`, error);
      return false;
    }
  },

  getAppPreference: (appId: string, key: string, defaultValue: any = null) => {
    try {
      const preferences = api.getAppPreferences(appId);
      return preferences.hasOwnProperty(key) ? preferences[key] : defaultValue;
    } catch (error) {
      console.error(`Failed to get preference ${key} for app ${appId}:`, error);
      return defaultValue;
    }
  },

  // Helper functions
  path: path,
  mime: mime,

  // Exposed modules for advanced usage
  fs: fs,
  require: require
};

// Make API available globally for apps
(window as any).api = api;

// Enhanced preferences helper for easier app usage
(window as any).createPreferencesHelper = (appId: string) => {
  return {
    get: (key: string, defaultValue: any = null) => api.getAppPreference(appId, key, defaultValue),
    set: (key: string, value: any) => api.updateAppPreference(appId, key, value),
    remove: (key: string) => api.removeAppPreference(appId, key),
    getAll: () => api.getAppPreferences(appId),
    setAll: (preferences: Record<string, any>) => api.setAppPreferences(appId, preferences),
    clear: () => api.setAppPreferences(appId, {}),

    // Convenience methods for common data types
    getString: (key: string, defaultValue: string = '') => {
      const value = api.getAppPreference(appId, key, defaultValue);
      return typeof value === 'string' ? value : defaultValue;
    },
    getNumber: (key: string, defaultValue: number = 0) => {
      const value = api.getAppPreference(appId, key, defaultValue);
      return typeof value === 'number' ? value : defaultValue;
    },
    getBoolean: (key: string, defaultValue: boolean = false) => {
      const value = api.getAppPreference(appId, key, defaultValue);
      return typeof value === 'boolean' ? value : defaultValue;
    },
    getObject: (key: string, defaultValue: any = {}) => {
      const value = api.getAppPreference(appId, key, defaultValue);
      return (typeof value === 'object' && value !== null) ? value : defaultValue;
    },

    // Array helpers
    getArray: (key: string, defaultValue: any[] = []) => {
      const value = api.getAppPreference(appId, key, defaultValue);
      return Array.isArray(value) ? value : defaultValue;
    },
    pushToArray: (key: string, item: any) => {
      const currentArray = api.getAppPreference(appId, key, []);
      const newArray = Array.isArray(currentArray) ? [...currentArray, item] : [item];
      return api.updateAppPreference(appId, key, newArray);
    },
    removeFromArray: (key: string, item: any) => {
      const currentArray = api.getAppPreference(appId, key, []);
      if (Array.isArray(currentArray)) {
        const newArray = currentArray.filter(existing => existing !== item);
        return api.updateAppPreference(appId, key, newArray);
      }
      return false;
    }
  };
};

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
      if (prefs.appsDir && fs.existsSync(prefs.appsDir)) {
        console.log('Using saved frames directory:', prefs.appsDir);
        return prefs.appsDir;
      }
    }
  } catch (error) {
    console.warn('Could not load preferences:', error);
  }

  // Fallback to default location
  const userDataPath = app?.getPath('userData') || path.join(require('os').homedir(), '.viberunner');
  const fallback = path.join(userDataPath, 'apps');
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
    console.error('Error in loadFrames function:', error);
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

  // Also load the metadata
  const metadataPath = path.join(framePath, 'viz.json');
  let config = null;
  if (fs.existsSync(metadataPath)) {
    const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
    config = JSON.parse(metadataContent);
  }

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
  icon?: string; // Custom icon path
  userPreferences?: Record<string, any>; // User preferences storage
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
  const [framesDirectory, setFramesDirectory] = useState<string>('');
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([
    { id: 'default-tab', title: 'New Tab', type: 'newtab' }
  ]);
  const [activeTabId, setActiveTabId] = useState('default-tab');
  const [showFrameSelection, setShowFrameSelection] = useState(false);
  const [availableFrames, setAvailableFrames] = useState<Frame[]>([]);
  const [pendingFileInput, setPendingFileInput] = useState<FileInput | null>(null);
  const [appIcons, setAppIcons] = useState<Record<string, string>>({});
  const [startupApps, setStartupApps] = useState<Record<string, { enabled: boolean; tabOrder: number }>>({});

  const frameRootRef = useRef<HTMLDivElement>(null);
  const hasLaunchedStartupApps = useRef<boolean>(false);

  // Get the currently active tab
  const activeTab = openTabs.find(tab => tab.id === activeTabId);

  // Function to load app icon
  const loadAppIcon = async (frame: Frame): Promise<string | null> => {
    if (!frame.icon) return null;

    // Check if already cached
    if (appIcons[frame.id]) {
      return appIcons[frame.id];
    }

    try {
      const FRAMES_DIR = getFramesDirectory();
      const appDir = path.join(FRAMES_DIR, frame.id);
      const fullIconPath = path.join(appDir, frame.icon);

      // Ensure the icon path is within the app directory
      if (!fullIconPath.startsWith(appDir)) {
        throw new Error('Icon path must be within app directory');
      }

      if (!fs.existsSync(fullIconPath)) {
        throw new Error(`Icon file not found: ${frame.icon}`);
      }

      // Read the icon file as base64
      const iconBuffer = fs.readFileSync(fullIconPath);
      const mimeType = mime.lookup(fullIconPath) || 'application/octet-stream';
      const iconData = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;

      setAppIcons(prev => ({ ...prev, [frame.id]: iconData }));
      return iconData;
    } catch (error) {
      console.error(`Failed to load icon for ${frame.name}:`, error);
    }

    return null;
  };

  // Load startup app preferences
  const loadStartupApps = async () => {
    try {
      const { app } = require('@electron/remote');
      const prefsPath = path.join(app.getPath('userData'), 'preferences.json');

      if (fs.existsSync(prefsPath)) {
        const prefsContent = fs.readFileSync(prefsPath, 'utf8');
        const prefs = JSON.parse(prefsContent);
        setStartupApps(prefs.startupApps || {});
      }
    } catch (error) {
      console.error('Error loading startup apps:', error);
    }
  };

  // Save startup app preferences
  const saveStartupApps = (newStartupApps: Record<string, { enabled: boolean; tabOrder: number }>) => {
    try {
      const { app } = require('@electron/remote');
      const prefsPath = path.join(app.getPath('userData'), 'preferences.json');

      // Load existing preferences
      let prefs = {};
      if (fs.existsSync(prefsPath)) {
        const prefsContent = fs.readFileSync(prefsPath, 'utf8');
        prefs = JSON.parse(prefsContent);
      }

      // Update startup apps
      (prefs as any).startupApps = newStartupApps;

      // Save back to file
      fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2), 'utf8');

      setStartupApps(newStartupApps);
    } catch (error) {
      console.error('Error saving startup apps:', error);
    }
  };

  // Toggle startup app enabled state
  const toggleStartupApp = async (appId: string, enabled: boolean) => {
    try {
      const newStartupApps = { ...startupApps };

      if (enabled) {
        // If enabling, set a default tab order if not already set
        const currentConfig = startupApps[appId] || { enabled: false, tabOrder: 1 };
        if (!currentConfig.tabOrder) {
          const maxTabOrder = Math.max(0, ...Object.values(startupApps).map(app => app.tabOrder));
          currentConfig.tabOrder = maxTabOrder + 1;
        }
        newStartupApps[appId] = { ...currentConfig, enabled: true };
      } else {
        delete newStartupApps[appId];
      }

      saveStartupApps(newStartupApps);
    } catch (error) {
      console.error('Error toggling startup app:', error);
    }
  };

  // Update tab order for startup app
  const updateStartupAppTabOrder = async (appId: string, tabOrder: number) => {
    try {
      const currentConfig = startupApps[appId];
      if (!currentConfig || !currentConfig.enabled) return;

      const newStartupApps = {
        ...startupApps,
        [appId]: { ...currentConfig, tabOrder }
      };

      saveStartupApps(newStartupApps);
    } catch (error) {
      console.error('Error updating startup app tab order:', error);
    }
  };

  // Load icons for all frames when frames change
  useEffect(() => {
    frames.forEach(frame => {
      if (frame.icon && !appIcons[frame.id]) {
        loadAppIcon(frame);
      }
    });
  }, [frames]);

  // Load startup apps when component mounts and when frames change
  useEffect(() => {
    loadStartupApps();
  }, [frames]);

  // Keyboard shortcuts for tab/window management
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+W (macOS) or Ctrl+W (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'w') {
        event.preventDefault();

        // If multiple tabs or active tab is not a new tab, close the active tab
        if (openTabs.length > 1 || (activeTab && activeTab.type !== 'newtab')) {
          if (activeTabId) {
            closeTab(activeTabId);
          }
        } else {
          // Only a new tab remains or no tabs, close the window
          try {
            ipcRenderer.invoke('close-window');
          } catch (error) {
            console.error('Failed to close window:', error);
            // Fallback: try to close via window object
            window.close();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openTabs, activeTabId, activeTab]);

  // Auto-launch startup apps when frames are loaded
  useEffect(() => {
    console.log('Auto-launch useEffect triggered:', {
      framesLength: frames.length,
      startupAppsCount: Object.keys(startupApps).length,
      hasLaunched: hasLaunchedStartupApps.current,
      startupApps
    });

    if (frames.length > 0 && Object.keys(startupApps).length > 0 && !hasLaunchedStartupApps.current) {
      const enabledStartupApps = Object.entries(startupApps)
        .filter(([_, config]) => config.enabled)
        .sort(([, a], [, b]) => a.tabOrder - b.tabOrder);

      console.log('Enabled startup apps:', enabledStartupApps);

      if (enabledStartupApps.length > 0) {
        console.log(`Auto-launching ${enabledStartupApps.length} startup apps...`);

        // Launch each app with a small delay
        enabledStartupApps.forEach(([appId, config], index) => {
          console.log(`Scheduling launch for ${appId} with ${index * 500}ms delay`);
          setTimeout(() => {
            const frame = frames.find(f => f.id === appId);
            console.log(`Attempting to launch ${appId}:`, {
              frameFound: !!frame,
              frameName: frame?.name,
              isStandalone: frame?.standalone,
              allFrameIds: frames.map(f => f.id)
            });
            if (frame && frame.standalone) {
              console.log(`Auto-launching startup app: ${appId} (tab order: ${config.tabOrder})`);
              // Force new tab for startup apps to prevent them from overwriting each other
              openFrameInNewTab(frame, undefined, true);
            } else {
              console.warn(`Could not launch ${appId}:`, {
                frameFound: !!frame,
                isStandalone: frame?.standalone
              });
            }
          }, index * 500); // 500ms delay between each app
        });

        // After all startup apps are launched, switch to the "New Tab"
        const switchToNewTabDelay = enabledStartupApps.length * 500 + 300; // Extra 300ms buffer
        setTimeout(() => {
          console.log('Switching to New Tab after startup apps launch');
          setOpenTabs(prev => {
            const newTab = prev.find(tab => tab.type === 'newtab');
            if (newTab) {
              switchToTab(newTab.id);
            }
            return prev;
          });
        }, switchToNewTabDelay);
      }
      hasLaunchedStartupApps.current = true;
    }
  }, [frames, startupApps]);

  // Function to get icon for display (returns Viberunner logo fallback if no custom icon)
  const getAppIcon = (frame: Frame): string => {
    if (appIcons[frame.id]) {
      return appIcons[frame.id];
    }

    // Return Viberunner SVG logo as fallback
    return getViberunnerLogoPath();
  };

  // Function to get Viberunner logo as data URL
  const getViberunnerLogoPath = (): string => {
    try {
      // Load SVG file and convert to data URL
      const svgPath = path.resolve(__dirname, '../assets/viberunner-logo.svg');
      if (fs.existsSync(svgPath)) {
        const svgContent = fs.readFileSync(svgPath, 'utf8');
        return `data:image/svg+xml;base64,${btoa(svgContent)}`;
      } else {
        // Try alternative path
        const altPath = path.resolve(process.cwd(), 'src/assets/viberunner-logo.svg');
        if (fs.existsSync(altPath)) {
          const svgContent = fs.readFileSync(altPath, 'utf8');
          return `data:image/svg+xml;base64,${btoa(svgContent)}`;
        }
        throw new Error('SVG file not found');
      }
    } catch (error) {
      console.warn('Failed to load Viberunner logo SVG, using fallback:', error);
      // Fallback to inline SVG if file loading fails
      const svg = `<svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 50 H25 L35 20 L50 80 L65 20 L75 50 H95" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;
      return `data:image/svg+xml;base64,${btoa(svg)}`;
    }
  };

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
      // Reset startup apps launch flag so they can launch again after reload
      hasLaunchedStartupApps.current = false;
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
  }, []);

  const handleChangeFramesDirectory = async () => {
    try {
      const result = await ipcRenderer.invoke('change-frames-directory');
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
    container.style.visibility = 'hidden';
    container.style.zIndex = '-1';
    container.style.opacity = '0';
    container.style.background = 'var(--background)';
    frameRootRef.current.appendChild(container);

    // Prepare props with cleanup support
    let props;
    if (!tab.fileInput) {
      props = {
        container,
        tabId: tab.id,
        appId: tab.frame.id
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
        tabId: tab.id,
        appId: tab.frame.id
      };
    }

    return new Promise<boolean>((resolve) => {
      // Create script and load frame
      const script = document.createElement('script');
      script.type = 'text/javascript';

      let processedBundleContent = tab.frameData.bundleContent;

      // CSS scoping patterns for auto-scoping
      const cssPatterns = [
        /(['"`])([^'"`]*\.css[^'"`]*)\1/g,
        /(['"`])([^'"`]*{[^}]*}[^'"`]*)\1/g
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
          isolationWrapper.setAttribute('data-frame-id', tab.id);

          const root = createRoot(isolationWrapper);
          root.render(React.createElement(FrameComponent, props));

          // Store container reference in tabContainersRef for tab switching
          tabContainersRef.current.set(tab.id, {
            domElement: container,
            reactRoot: root,
            styleElement: undefined
          });

          // Show the container with proper stacking
          container.style.display = 'block';
          container.style.visibility = 'visible';
          container.style.zIndex = '10';
          container.style.opacity = '1';

          resolve(true);
        } catch (error) {
          console.error('Error rendering frame:', error);
          resolve(false);
        }
      };

      // Make the frame loader available globally with backward compatibility
      (window as any).__LOAD_APP__ = frameLoader;
      (window as any).__LOAD_VISUALIZER__ = frameLoader; // Backward compatibility
      (window as any).__LOAD_FRAME__ = frameLoader; // Backward compatibility

      script.onload = () => {
        // Clean up after script loads
        setTimeout(() => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          delete (window as any).__LOAD_APP__;
          delete (window as any).__LOAD_VISUALIZER__;
          delete (window as any).__LOAD_FRAME__;
        }, 1000);
      };

      script.onerror = (error) => {
        console.error('Script loading error:', error);
        resolve(false);
      };

      document.head.appendChild(script);
    });
  };

  // Imperative function to switch tab visibility
  const switchToTab = (tabId: string, tabData?: OpenTab) => {
    // Use provided tab data or look up from state
    const activeTab = tabData || openTabs.find(tab => tab.id === tabId);

    console.log('Switching to tab:', tabId, 'type:', activeTab?.type);

    // Hide all frame containers with enhanced visibility control
    tabContainersRef.current.forEach((container, id) => {
      console.log('Hiding container for tab:', id);
      const element = container.domElement;
      element.style.display = 'none';
      element.style.visibility = 'hidden';
      element.style.zIndex = '-1';
      element.style.opacity = '0';
    });

    // Show the active tab's container if it's not a new tab
    if (activeTab && activeTab.type !== 'newtab') {
      const container = tabContainersRef.current.get(tabId);
      if (container) {
        console.log('Showing container for tab:', tabId);
        const element = container.domElement;
        element.style.display = 'block';
        element.style.visibility = 'visible';
        element.style.zIndex = '10';
        element.style.opacity = '1';
      } else {
        console.warn('No container found for tab:', tabId);
      }
    }

    setActiveTabId(tabId);
  };

  const openFrameInNewTab = async (frame: Frame, fileInput?: FileInput, forceNewTab: boolean = false) => {
    const title = fileInput
      ? fileInput.path.split('/').pop() || 'Unknown File'
      : frame.name;

    let frameData;

    // Load frame data
    try {
      frameData = await loadFrame(frame.id);
    } catch (error) {
      console.error('Failed to load frame data:', error);
      alert(`Failed to load ${frame.name}: ${error}`);
      return;
    }

    // Check if we have an active new tab to transform (but not if forceNewTab is true)
    const currentTab = openTabs.find(tab => tab.id === activeTabId);

    if (!forceNewTab && currentTab && currentTab.type === 'newtab') {
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

        // Reorder tabs to keep "New Tab" at the end
        setTimeout(() => {
          setOpenTabs(prev => {
            const newTabTabs = prev.filter(tab => tab.type === 'newtab');
            const otherTabs = prev.filter(tab => tab.type !== 'newtab');
            return [...otherTabs, ...newTabTabs];
          });
        }, 50); // Small delay to ensure tab is properly added first
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

        // Reorder tabs to keep "New Tab" at the end
        setTimeout(() => {
          setOpenTabs(prev => {
            const newTabTabs = prev.filter(tab => tab.type === 'newtab');
            const otherTabs = prev.filter(tab => tab.type !== 'newtab');
            return [...otherTabs, ...newTabTabs];
          });
        }, 50); // Small delay to ensure tab is properly added first
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
    // Reset frame selection state when switching tabs
    setShowFrameSelection(false);
    setPendingFileInput(null);
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
                    {tab.type === 'newtab' ? (
                      <img
                        src={getViberunnerLogoPath()}
                        alt="New Tab"
                        style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                      />
                    ) : tab.frame ? (
                      <img
                        src={getAppIcon(tab.frame)}
                        alt={tab.frame.name}
                        style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                      />
                    ) : (
                      <img
                        src={getViberunnerLogoPath()}
                        alt="Default"
                        style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                      />
                    )}
                  </div>
                  <div className="vf-tab-content">
                    <span className="vf-tab-title">{tab.title}</span>
                    {tab.frame && <span className="vf-tab-subtitle">{tab.frame.name}</span>}
                  </div>
                  {tab.type !== 'newtab' || openTabs.length > 1 ? (
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
                  ) : null}
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

          {/* Viberunner logo on the right */}
          <h1 className="vf-app-title">
            <div className="vf-app-icon">
              <img
                src={getViberunnerLogoPath()}
                alt="Viberunner Logo"
                style={{ width: '24px', height: '24px', objectFit: 'contain' }}
              />
            </div>
            Viberunner
          </h1>
        </div>
      </header>

      <div id="vf-main-layout">
        <main className="vf-content-area">
          {showFrameSelection && activeTab?.type === 'newtab' ? (
            <div className="vf-frame-selection">
              <div className="selection-header">
                <h2 className="selection-title">Choose an app</h2>
                <p className="selection-subtitle">
                  Multiple apps can handle this file type. Choose one to continue:
                </p>
                <div className="file-meta">
                  <span className="filename">{path.basename(pendingFileInput?.path || '')}</span>
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
                      <div className="card-icon">
                        <img
                          src={getAppIcon(frame)}
                          alt={frame.name}
                          style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                        />
                      </div>
                      <div className="card-title-section">
                        <h3 className="card-title">{frame.name}</h3>
                        <div className="card-badge">
                          <div className="badge-dot"></div>
                          Ready
                        </div>
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
          ) : null}

          <div className="frame-viewport-container">
            {/* Always render frame viewport for tab containers */}
            <div ref={frameRootRef} className="frame-viewport" />

            {/* Unified new tab interface when active tab is new tab */}
            {activeTab?.type === 'newtab' && !showFrameSelection && (
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
                              {frames.filter(f => f.standalone).map(frame => {
                                const startupConfig = startupApps[frame.id];
                                const isStartupEnabled = startupConfig?.enabled || false;
                                const tabOrder = startupConfig?.tabOrder || 1;

                                return (
                                  <div key={frame.id} className="utility-card-container">
                                    <div className="utility-card" onClick={() => launchStandaloneFrame(frame)}>
                                      <div className="utility-icon">
                                        <img
                                          src={getAppIcon(frame)}
                                          alt={frame.name}
                                          style={{ width: '24px', height: '24px', objectFit: 'contain' }}
                                        />
                                      </div>
                                      <div className="utility-content">
                                        <h5 className="utility-title">{frame.name}</h5>
                                        <p className="utility-description">{frame.description}</p>
                                      </div>
                                      <div className="utility-action">Launch</div>
                                    </div>

                                    {/* Startup controls */}
                                    <div className="startup-controls" onClick={(e) => e.stopPropagation()}>
                                      <div className="startup-toggle">
                                        <label className="toggle-label" onClick={(e) => e.stopPropagation()}>
                                          <input
                                            type="checkbox"
                                            checked={isStartupEnabled}
                                            onChange={(e) => toggleStartupApp(frame.id, e.target.checked)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="toggle-checkbox"
                                          />
                                          <span className="toggle-slider"></span>
                                          <span className="toggle-text">Start on launch</span>
                                        </label>
                                      </div>

                                      {isStartupEnabled && (
                                        <div className="tab-order-control">
                                          <label className="tab-order-label">
                                            Tab order:
                                            <input
                                              type="number"
                                              min="1"
                                              max="99"
                                              value={tabOrder}
                                              onChange={(e) => updateStartupAppTabOrder(frame.id, parseInt(e.target.value) || 1)}
                                              onClick={(e) => e.stopPropagation()}
                                              className="tab-order-input"
                                            />
                                          </label>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
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

                      {/* File-based frames section - always visible */}
                      {frames.filter(f => !f.standalone).length > 0 && (
                        <div className="frames-section">
                          <div className="section-card">
                            <div className="section-header">
                              <h4 className="section-title">
                                <span className="section-icon">🎨</span>
                                File Apps
                              </h4>
                              <span className="section-count">{frames.filter(f => !f.standalone).length}</span>
                            </div>
                            {isLoadingFrames ? (
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
        </main>
      </div>
    </div>
  );
};

export default App;
