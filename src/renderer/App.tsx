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

const getAppsDirectory = () => {
  try {
    const Store = require('electron-store');
    const store = new Store();
    let appsDir = store.get('preferences.appsDir');

    if (appsDir && typeof appsDir === 'string') {
      console.log('Using saved apps directory:', appsDir);
      return appsDir;
    }

    // Fallback to default directory
    const path = require('path');
    const os = require('os');
    const fallback = path.join(os.homedir(), 'ExampleApps');
    console.log('Using fallback apps directory:', fallback);
    return fallback;
  } catch (error) {
    console.error('Error getting apps directory:', error);
    return null;
  }
};

async function loadApps(): Promise<App[]> {
  try {
    const APPS_DIR = getAppsDirectory();
    console.log('loadApps: Looking for apps in:', APPS_DIR);

    if (!fs.existsSync(APPS_DIR)) {
      console.log('loadApps: Directory does not exist, creating it');
      fs.mkdirSync(APPS_DIR, { recursive: true });
      return [];
    }

    const dirContents = fs.readdirSync(APPS_DIR);
    console.log('loadApps: Directory contents:', dirContents);

    const directories = dirContents.filter((dir: string) => {
      const fullPath = path.join(APPS_DIR, dir);
      const isDir = fs.statSync(fullPath).isDirectory();
      console.log(`loadApps: ${dir} is directory: ${isDir}`);
      return isDir;
    });

    console.log('loadApps: Found directories:', directories);

    const apps = directories.map((dir: string) => {
      const appPath = path.join(APPS_DIR, dir);
      const metadataPath = path.join(appPath, 'viz.json');
      console.log(`loadApps: Checking for metadata at: ${metadataPath}`);

      if (!fs.existsSync(metadataPath)) {
        console.log(`loadApps: No viz.json found for ${dir}`);
        return null;
      }

      try {
        const metadataContent = fs.readFileSync(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        console.log(`loadApps: Successfully loaded metadata for ${dir}:`, metadata);

        return {
          id: dir,
          ...metadata
        };
      } catch (error) {
        console.error(`Error loading metadata for ${dir}:`, error);
        return null;
      }
    })
      .filter(Boolean) as App[];

    console.log('loadApps: Final apps array:', apps);
    return apps;
  } catch (error) {
    console.error('Error in loadApps function:', error);
    return [];
  }
}

async function loadApp(id: string) {
  const APPS_DIR = getAppsDirectory();
  const appPath = path.join(APPS_DIR, id);
  const bundlePath = path.join(appPath, 'dist', 'bundle.iife.js');

  if (!fs.existsSync(bundlePath)) {
    throw new Error(`Bundle not found at: ${bundlePath}`);
  }

  const bundleContent = fs.readFileSync(bundlePath, 'utf8');

  // Load metadata if needed
  const metadataPath = path.join(appPath, 'viz.json');
  const metadata = fs.existsSync(metadataPath)
    ? JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
    : {};

  return { bundleContent, metadata };
}

// Remove content and analysis - apps will handle these directly
const fileAnalysisCache = new Map();

interface App {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  mimetypes?: string[];
  matchers?: Array<{
    type: string;
    [key: string]: any;
  }>;
  standalone?: boolean;
  icon?: string;
}

interface Tab {
  id: string;
  title: string;
  type: 'newtab' | 'file' | 'standalone';
  filePath?: string;
  app?: App; // Optional for new tab - represents the app/visualization
  isActive: boolean;
  isClosable: boolean;
  appData?: any; // Store the loaded app data for reloading
}

// Tab management state
const [tabs, setTabs] = useState<Tab[]>([]);

// Helper function to get supported formats for an app
const getSupportedFormats = (app: any): string => {
  if (app.standalone) {
    return 'Standalone utility';
  }

  if (app.mimetypes && app.mimetypes.length > 0) {
    return app.mimetypes.join(', ');
  }

  if (app.matchers && app.matchers.length > 0) {
    const formats: string[] = [];
    app.matchers.forEach((matcher: any) => {
      switch (matcher.type) {
        case 'mimetype':
          if (matcher.mimetype) formats.push(matcher.mimetype);
          break;
        case 'filename':
          if (matcher.pattern) formats.push(`File: ${matcher.pattern}`);
          break;
        case 'filename-contains':
          if (matcher.substring) formats.push(`Contains: ${matcher.substring}`);
          break;
        case 'path-pattern':
          if (matcher.pattern) formats.push(`Path: ${matcher.pattern}`);
          break;
        case 'content-json':
          formats.push('JSON content');
          break;
        case 'content-regex':
          formats.push('Content pattern');
          break;
        default:
          break;
      }
    });
    return formats.length > 0 ? formats.join(', ') : 'Various formats';
  }

  return 'Unknown formats';
};

const [apps, setApps] = useState<App[]>([]);
const [appsDirectory, setAppsDirectory] = useState<string>('');
const [isLoadingApps, setIsLoadingApps] = useState(false);
const [appIcons, setAppIcons] = useState<{[key: string]: string}>({});
const [startupApps, setStartupApps] = useState<{[key: string]: any}>({});
const [showManagement, setShowManagement] = useState(false);

const [showAppSelection, setShowAppSelection] = useState(false);
const [availableApps, setAvailableApps] = useState<App[]>([]);
const [pendingFilePath, setPendingFilePath] = useState<string | null>(null);

// Active tab state
const [activeTabId, setActiveTabId] = useState<string>('');

const appRootRef = useRef<HTMLDivElement>(null);
const hasLaunchedStartupApps = useRef<boolean>(false);

// Get the active tab
const activeTab = tabs.find(tab => tab.id === activeTabId);

// Create a preferences helper for this app
const prefs = (window as any).createPreferencesHelper?.('viberunner') || {
  getString: (key: string, defaultValue: string) => defaultValue,
  set: (key: string, value: any) => {},
  getObject: (key: string, defaultValue: any) => defaultValue
};

const loadAppIcon = async (app: App): Promise<string | null> => {
  if (!app.icon) return null;

  // Check if already cached
  if (appIcons[app.id]) {
    return appIcons[app.id];
  }

  try {
    const APPS_DIR = getAppsDirectory();
    const appDir = path.join(APPS_DIR, app.id);
    const fullIconPath = path.join(appDir, app.icon);

    const fs = require('fs');

    // Check if icon file exists
    if (!fs.existsSync(fullIconPath)) {
      throw new Error(`Icon file not found: ${app.icon}`);
    }

    // Read the icon file and convert to data URL
    const iconBuffer = fs.readFileSync(fullIconPath);
    const ext = path.extname(app.icon).toLowerCase();
    let mimeType = 'image/png'; // default

    if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';

    const iconData = `data:${mimeType};base64,${iconBuffer.toString('base64')}`;

    // Cache the icon
    setAppIcons(prev => ({ ...prev, [app.id]: iconData }));

    return iconData;
  } catch (error) {
    console.error(`Failed to load icon for ${app.name}:`, error);
    return null;
  }
};

// Load icons for all apps when apps change
useEffect(() => {
  apps.forEach(app => {
    if (app.icon && !appIcons[app.id]) {
      loadAppIcon(app);
    }
  });
}, [apps]);

// Load startup apps when component mounts and when apps change
useEffect(() => {
  const savedStartupApps = prefs.getObject('startupApps', {});
  setStartupApps(savedStartupApps);
}, [apps]);

// Auto-launch startup apps when apps are loaded
useEffect(() => {
  console.log('Auto-launch effect triggered:', {
    appsLength: apps.length,
    startupAppsKeys: Object.keys(startupApps),
    hasLaunched: hasLaunchedStartupApps.current
  });

  if (apps.length > 0 && Object.keys(startupApps).length > 0 && !hasLaunchedStartupApps.current) {
    hasLaunchedStartupApps.current = true;

    // Wait a bit for the UI to settle
    setTimeout(() => {
      Object.entries(startupApps).forEach(([appId, shouldLaunch]) => {
        if (shouldLaunch) {
          console.log('Auto-launching startup app:', appId);

          // Find the app in our loaded apps
          const app = apps.find(f => f.id === appId);
          if (app) {
            // Create a new tab for this startup app
            const newTabId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            const newTab: Tab = {
              id: newTabId,
              title: app.name,
              type: 'standalone',
              app: app,
              isActive: false,
              isClosable: true
            };

            setTabs(prevTabs => {
              const existingNewTab = prevTabs.find(t => t.type === 'newtab');
              if (existingNewTab && prevTabs.length === 1) {
                // Replace the single new tab
                newTab.isActive = true;
                return [newTab];
              } else {
                // Add to existing tabs
                const updated = prevTabs.map(t => ({ ...t, isActive: false }));
                newTab.isActive = true;
                return [...updated, newTab];
              }
            });

            setActiveTabId(newTabId);
          }
        }
      });
    }, 1000);
  }
}, [apps, startupApps]);

// Load apps directory info
useEffect(() => {
  try {
    const dir = getAppsDirectory();
    setAppsDirectory(dir || 'Not set');
  } catch (error) {
    console.error('Error loading apps directory:', error);
    setAppsDirectory('Error loading directory');
  }
}, []);

const reloadApps = async () => {
  try {
    setIsLoadingApps(true);

    console.log('Reloading apps...');
    const apps = await loadApps();
    setApps(apps);
  } catch (error) {
    console.error('Error loading apps:', error);
    setApps([]);
  } finally {
    setIsLoadingApps(false);
  }
};

useEffect(() => {
  reloadApps();
}, []);

const handleChangeAppsDirectory = async () => {
  try {
    const result = await ipcRenderer.invoke('change-apps-directory');
    if (result.success) {
      setAppsDirectory(result.directory);
      await reloadApps();
    }
  } catch (error) {
    console.error('Error changing apps directory:', error);
  }
};

const handleReloadApps = async () => {
  await reloadApps();
};

// Load and render an app into a tab container
const loadAppIntoTab = async (tab: Tab) => {
  if (!tab.app) return;

  const container = document.getElementById(`tab-${tab.id}`);
  if (!container) return;

  try {
    // Load the app bundle and metadata
    const { bundleContent, metadata } = await loadApp(tab.app.id);

    // Clear the container
    container.innerHTML = '';

    // Create isolated wrapper for the app
    const isolationWrapper = document.createElement('div');
    isolationWrapper.style.cssText = `
      width: 100%;
      height: 100%;
      position: relative;
      overflow: auto;
      isolation: isolate;
      contain: layout style paint;
    `;

    container.className = 'tab-app-container';

    // Process and inject CSS isolation
    let processedBundleContent = bundleContent;

    // Inject CSS scoping for this specific app
    if (bundleContent.includes('<style>') || bundleContent.includes('stylesheet')) {
      const cssContent = bundleContent.match(/<style[^>]*>([\s\S]*?)<\/style>/gi)?.join('\n') || '';

      // Don't process if already scoped to .tab-app-container
      if (cssContent.includes('.tab-app-container') || cssContent.includes(`[data-app-id="${tab.id}"]`)) {
        console.log('CSS already scoped, skipping processing');
      } else {
        console.log('Processing CSS for scoping...');
        // Scope all CSS rules to this tab's container
        const scopedCSS = cssContent
          .replace(/<style[^>]*>|<\/style>/gi, '')
          .replace(/^\s*\*\s*\{/gm, `[data-app-id="${tab.id}"] * {`)
          // Scope element selectors
          .replace(/^(\s*)([a-zA-Z][a-zA-Z0-9]*)\s*\{/gm, `$1[data-app-id="${tab.id}"] $2 {`)
          // Scope class selectors
          .replace(/^(\s*)(\.[\w-]+)\s*\{/gm, `$1[data-app-id="${tab.id}"] $2 {`)
          // Scope ID selectors
          .replace(/^(\s*)(#[\w-]+)\s*\{/gm, `$1[data-app-id="${tab.id}"] $2 {`)
          // Scope complex selectors
          .replace(/^(\s*)([.#]?[\w-]+(?:\s+[.#]?[\w-]+)*)\s*\{/gm, `$1[data-app-id="${tab.id}"] $2 {`)

        // Additional safety scoping
        const additionalScoping = scopedCSS
          .replace(/^\s*\*\s*\{/gm, `[data-app-id="${tab.id}"] * {`)
          .replace(/^(\s*)([a-zA-Z][a-zA-Z0-9]*)\s*\{/gm, `$1[data-app-id="${tab.id}"] $2 {`)
          .replace(/^(\s*)(\.[\w-]+)\s*\{/gm, `$1[data-app-id="${tab.id}"] $2 {`)
          .replace(/^(\s*)(#[\w-]+)\s*\{/gm, `$1[data-app-id="${tab.id}"] $2 {`);

        // Inject scoped CSS
        const styleElement = document.createElement('style');
        styleElement.textContent = additionalScoping;
        styleElement.setAttribute('data-app-style', tab.app.id);
        document.head.appendChild(styleElement);
      }
    }

    // JavaScript isolation and injection
    const appStyleInterceptor = `
      (function() {
        const originalCreateElement = document.createElement;
        document.createElement = function(tagName) {
          const element = originalCreateElement.call(document, tagName);
          if (tagName.toLowerCase() === 'style') {
            element.textContent = element.textContent || '';
            const appId = "${tab.id}";

            // Intercept style content and scope it
            const originalTextContentSetter = Object.getOwnPropertyDescriptor(Element.prototype, 'textContent').set;
            Object.defineProperty(element, 'textContent', {
              set: function(value) {
                if (value && typeof value === 'string') {
                  const scopedValue = value
                    .replace(/^\\s*\\*\\s*\\{/gm, \`[data-app-id="\${appId}"] * {\`)
                    .replace(/^(\\s*)([a-zA-Z][a-zA-Z0-9]*)\\s*\\{/gm, \`$1[data-app-id="\${appId}"] $2 {\`)
                    .replace(/^(\\s*)(\\.[\\w-]+)\\s*\\{/gm, \`$1[data-app-id="\${appId}"] $2 {\`)
                    .replace(/^(\\s*)(#[\\w-]+)\\s*\\{/gm, \`$1[data-app-id="\${appId}"] $2 {\`);
                  originalTextContentSetter.call(this, scopedValue);
                } else {
                  originalTextContentSetter.call(this, value);
                }
              },
              get: function() {
                return originalTextContentSetter ? originalTextContentSetter.call(this) : '';
              }
            });
          }
          return element;
        };
      })();
    `;

    // Create and inject the script
    const script = document.createElement('script');
    script.textContent = appStyleInterceptor + '\n' + processedBundleContent;

    // Set up the app environment
    const props: any = {
      container: isolationWrapper,
      tabId: tab.id,
      appId: tab.app.id
    };

    // Add file-specific props if this is a file tab
    if (tab.type === 'file' && tab.filePath) {
      props.fileInput = {
        path: tab.filePath,
        mimetype: 'application/octet-stream' // Will be detected properly in real implementation
      };

      // Legacy support
      props.fileData = {
        path: tab.filePath,
        mimetype: 'application/octet-stream',
        content: '', // Apps should read files directly now
        analysis: {}
      };
    }

    // Make props available globally for the app to pick up
    (window as any).__LOAD_VISUALIZER__ = (AppComponent: any) => {
      console.log('Loading app component:', AppComponent);

      // Use React to render the app component
      const React = (window as any).React;
      const ReactDOM = (window as any).ReactDOM;

      if (React && ReactDOM && AppComponent) {
        // Create element using React.createElement
        const element = React.createElement(AppComponent, props);

        // Render using ReactDOM.render
        const createRoot = ReactDOM.createRoot || ReactDOM.render;
        if (createRoot === ReactDOM.createRoot) {
          // React 18+ way
          const root = createRoot(isolationWrapper);
          root.render(element);
        } else {
          // React 17 way
          ReactDOM.render(element, isolationWrapper);
        }
      } else {
        console.error('React, ReactDOM, or AppComponent not available');
      }
    };

    isolationWrapper.setAttribute('data-app-id', tab.id);
    container.appendChild(isolationWrapper);

    // Inject and execute the script
    document.body.appendChild(script);

    // Store app data for potential reloading
    setTabs(prev => prev.map(t =>
      t.id === tab.id
        ? { ...t, appData: { bundleContent, metadata } }
        : t
    ));

  } catch (error) {
    console.error('Error loading app:', error);
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; color: #ef4444; background: #1a1a1a; border-radius: 8px; margin: 20px;">
          <h3>❌ Error Loading App</h3>
          <p><strong>App:</strong> ${tab.app.name}</p>
          <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
          <p>Please check that the app is properly built and the bundle.iife.js file exists.</p>
          <details style="margin-top: 10px;">
            <summary>Technical Details</summary>
            <pre style="background: #0a0a0a; padding: 10px; border-radius: 4px; overflow: auto; font-size: 12px;">
              App ID: ${tab.app.id}
              Expected bundle: ${tab.app.id}/dist/bundle.iife.js

              ${error instanceof Error ? error.stack : 'No stack trace available'}
            </pre>
          </details>
        </div>
      `;
    }
  }
};

// Clean up app-specific styles when tab is removed
const cleanupAppTab = (tabId: string) => {
  // Remove the app-specific style element
  const styleElement = document.querySelector(`style[data-app-style="${tabId}"]`);
  if (styleElement) {
    styleElement.remove();
  }

  // Clean up any app-specific resources
  executeCleanup(tabId);
};

// Function to set a tab as active and ensure it's loaded
const setActiveTab = (tabId: string) => {
  setActiveTabId(tabId);
  setTabs(prev => prev.map(tab => ({
    ...tab,
    isActive: tab.id === tabId
  })));

  // Load the app if it's not a new tab and hasn't been loaded yet
  const tab = tabs.find(t => t.id === tabId);
  if (tab && tab.type !== 'newtab' && tab.app) {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      loadAppIntoTab(tab);
    }, 100);
  }
};

const closeTab = (tabId: string) => {
  setTabs(prev => {
    const filtered = prev.filter(tab => tab.id !== tabId);

    // Clean up app-specific resources
    cleanupAppTab(tabId);

    // If we closed the active tab, activate another one
    if (activeTabId === tabId) {
      if (filtered.length > 0) {
        const newActiveTab = filtered[filtered.length - 1];
        setActiveTabId(newActiveTab.id);
        // Update active state
        return filtered.map(tab => ({
          ...tab,
          isActive: tab.id === newActiveTab.id
        }));
      } else {
        // No tabs left, create a new tab
        const newTabId = Date.now().toString();
        const newTab: Tab = {
          id: newTabId,
          title: 'New Tab',
          type: 'newtab',
          isActive: true,
          isClosable: false
        };
        setActiveTabId(newTabId);
        return [newTab];
      }
    }

    return filtered;
  });
};

const createNewTab = () => {
  const newTabId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
  const newTab: Tab = {
    id: newTabId,
    title: 'New Tab',
    type: 'newtab',
    isActive: true,
    isClosable: tabs.length > 0 // Can't close if it's the only tab
  };

  setTabs(prev => {
    const updatedTabs = prev.map(tab => ({ ...tab, isActive: false }));
    return [...updatedTabs, newTab];
  });

  setActiveTabId(newTabId);
  setShowAppSelection(false);
};

const addAppTab = (app: App, filePath?: string) => {
  const tabId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

  const newTab: Tab = {
    id: tabId,
    title: filePath ? `${path.basename(filePath)} - ${app.name}` : app.name,
    type: filePath ? 'file' : 'standalone',
    filePath,
    app: app,
    isActive: true,
    isClosable: true
  };

  setTabs(prev => {
    // If there's only one new tab, replace it
    const existingNewTab = prev.find(t => t.type === 'newtab');
    if (existingNewTab && prev.length === 1) {
      return [newTab];
    }

    // Otherwise add to existing tabs
    const updatedTabs = prev.map(tab => ({ ...tab, isActive: false }));
    return [...updatedTabs, newTab];
  });

  setActiveTabId(tabId);
  setShowAppSelection(false);
};

async function findMatchingApps(filePath: string): Promise<Array<{app: App, priority: number}>> {
  const apps = await loadApps();
  const matches: Array<{app: App, priority: number}> = [];

  // File analysis for matching
  for (const app of apps) {
    // ... existing matching logic ...
  }

  // Sort by priority (highest first)
  return matches.sort((a, b) => b.priority - a.priority);
}

// Handle file drop
const handleFileDrop = async (filePath: string) => {
  if (!filePath) return;

  try {
    // Find matching apps directly
    const matches = await findMatchingApps(filePath);

    if (matches.length === 0) {
      // No matching apps found
      alert('No apps found that can handle this file type.');
      return;
    }

    if (matches.length === 1) {
      // Single match - load it directly
      addAppTab(matches[0].app, filePath);
    } else {
      // Multiple matches - show selection
      setPendingFilePath(filePath);
      setAvailableApps(matches.map((m: any) => ({
        ...m.app,
        priority: m.priority
      })));
      setShowAppSelection(true);
    }
  } catch (error) {
    console.error('Error processing file drop:', error);
    alert('Error processing the dropped file.');
  }
};

// Load app when activeTab changes
useEffect(() => {
  const tab = tabs.find(t => t.id === activeTabId);
  if (tab && tab.app && tab.type !== 'newtab') {
    loadAppIntoTab(tab);
  }
}, [activeTabId, tabs]);

// Handle app selection for file
const handleAppSelection = (app: App) => {
  if (pendingFilePath) {
    addAppTab(app, pendingFilePath);
    setPendingFilePath(null);
  }
  setShowAppSelection(false);
};

{showAppSelection && activeTab?.type === 'newtab' ? (
  <div className="vf-app-selection">
    <div style={{
      padding: '40px',
      textAlign: 'center',
      color: '#ffffff',
      background: 'rgba(26, 26, 26, 0.95)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      margin: '40px',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h3 style={{ marginBottom: '20px', color: '#ffffff' }}>
        Choose an App for: {pendingFilePath ? path.basename(pendingFilePath) : 'File'}
      </h3>

      <div className="app-grid">
        {availableApps.map((app) => (
          <div
            key={app.id}
            className="app-card"
            onClick={() => handleAppSelection(app)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{
              padding: '20px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              transition: 'all 0.2s ease'
            }}>
              <h4 style={{ color: '#ffffff', marginBottom: '10px' }}>{app.name}</h4>
              <p style={{ color: '#b3b3b3', fontSize: '14px', marginBottom: '15px' }}>{app.description}</p>
              <div style={{
                background: 'rgba(59, 130, 246, 0.2)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#60a5fa'
              }}>
                Priority: {(app as any).priority || 'Unknown'}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAppSelection(false)}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '6px',
          color: '#ffffff',
          cursor: 'pointer'
        }}
      >
        Cancel
      </button>
    </div>
  </div>
) : (
  <div className="app-viewport-container">
    {/* App viewport for rendering apps */}
    <div ref={appRootRef} className="app-viewport" />

    {/* Tab containers for background tab persistence */}
    {tabs.map(tab => (
      <div
        key={tab.id}
        id={`tab-${tab.id}`}
        style={{
          display: tab.isActive ? 'block' : 'none',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          background: '#0a0a0a',
          zIndex: tab.isActive ? 10 : 1
        }}
      />
    ))}
  </div>
)}

// ... existing code ...

{/* Apps Management Panel */}
<div
  className={`vf-floating-panel ${showManagement ? 'visible' : ''}`}
  style={{
    position: 'absolute',
    top: '60px',
    right: '20px',
    width: '400px',
    maxHeight: 'calc(100vh - 120px)',
    background: 'rgba(26, 26, 26, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    color: '#ffffff',
    fontSize: '14px',
    zIndex: 1000,
    overflow: 'auto',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
  }}
>
  <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
    <h3 style={{ margin: '0 0 10px 0', color: '#ffffff' }}>⚙️ Apps Management</h3>
    <p style={{ margin: 0, color: '#b3b3b3', fontSize: '13px' }}>
      Manage your Viberunner apps and directory settings
    </p>
  </div>

  {/* Apps Directory Section */}
  <div style={{ marginBottom: '25px' }}>
    <h4 style={{ margin: '0 0 10px 0', color: '#ffffff', fontSize: '16px' }}>📁 Apps Directory</h4>
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      padding: '12px',
      borderRadius: '6px',
      marginBottom: '10px',
      wordBreak: 'break-all',
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#b3b3b3'
    }}>
      {appsDirectory}
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      <button
        onClick={handleChangeAppsDirectory}
        style={{
          flex: 1,
          padding: '8px 12px',
          background: 'rgba(59, 130, 246, 0.2)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '6px',
          color: '#60a5fa',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        📂 Change Directory
      </button>
      <button
        onClick={handleReloadApps}
        disabled={isLoadingApps}
        style={{
          flex: 1,
          padding: '8px 12px',
          background: 'rgba(34, 197, 94, 0.2)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '6px',
          color: '#4ade80',
          fontSize: '12px',
          cursor: 'pointer',
          opacity: isLoadingApps ? 0.5 : 1
        }}
      >
        {isLoadingApps ? '🔄 Loading...' : '🔄 Reload Apps'}
      </button>
    </div>
  </div>

  {/* Apps List */}
  <div>
    <h4 style={{ margin: '0 0 15px 0', color: '#ffffff', fontSize: '16px' }}>
      🚀 Available Apps ({apps.length})
    </h4>

    {apps.length === 0 ? (
      <div style={{
        textAlign: 'center',
        padding: '20px',
        color: '#808080',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '6px'
      }}>
        <p style={{ margin: '0 0 10px 0' }}>📭 No apps found</p>
        <p style={{ margin: 0, fontSize: '12px' }}>
          Add apps to your apps directory to see them here
        </p>
      </div>
    ) : (
      <div className="apps-grid" style={{
        display: 'grid',
        gap: '12px',
        maxHeight: '400px',
        overflowY: 'auto'
      }}>
        {apps.map((app) => (
          <div key={app.id} className="app-info-card">
            <div className="app-info-header">
              <h5 className="app-info-title">{app.name}</h5>
              <div className="app-info-status">
                {app.standalone ? '⚡ Standalone' : '📄 File Handler'}
              </div>
            </div>
            <p className="app-info-description">{app.description}</p>
            <div className="app-info-formats">
              <strong>Formats:</strong> {getSupportedFormats(app)}
            </div>

            {/* Startup App Toggle for Standalone Apps */}
            {app.standalone && (
              <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px' }}>
                  <input
                    type="checkbox"
                    checked={!!startupApps[app.id]}
                    onChange={(e) => {
                      const newStartupApps = { ...startupApps };
                      if (e.target.checked) {
                        newStartupApps[app.id] = true;
                      } else {
                        delete newStartupApps[app.id];
                      }
                      setStartupApps(newStartupApps);
                      prefs.set('startupApps', newStartupApps);
                    }}
                    style={{ margin: 0 }}
                  />
                  <span style={{ color: '#b3b3b3' }}>🚀 Launch on startup</span>
                </label>
              </div>
            )}

            {/* Launch Button for Standalone Apps */}
            {app.standalone && (
              <div style={{ marginTop: '10px' }}>
                <button
                  onClick={() => addAppTab(app)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    background: 'rgba(34, 197, 94, 0.2)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '6px',
                    color: '#4ade80',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  🚀 Launch
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>

  {/* Close Button */}
  <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
    <button
      onClick={() => setShowManagement(false)}
      style={{
        width: '100%',
        padding: '10px',
        background: 'rgba(255, 255, 255, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '6px',
        color: '#ffffff',
        cursor: 'pointer'
      }}
    >
      ✕ Close
    </button>
  </div>
</div>

// ... existing code ...
