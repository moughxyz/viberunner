import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import os from 'os';

// Enable remote module for renderer access to app.getPath
import '@electron/remote/main';
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

// Configure autoupdate
autoUpdater.checkForUpdatesAndNotify();

// Handle autoupdate events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  autoUpdater.quitAndInstall();
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Enhanced matcher types
interface FileMatcher {
  type: 'mimetype' | 'filename' | 'filename-contains' | 'path-pattern' | 'content-json' | 'content-regex' | 'file-size' | 'combined';
  priority: number;

  // Type-specific properties
  mimetype?: string;
  pattern?: string;
  substring?: string; // For filename-contains matcher
  extension?: string; // Optional extension filter for filename-contains matcher
  requiredProperties?: string[];
  regex?: string;
  minSize?: number;
  maxSize?: number;

  // For combined matchers
  conditions?: FileMatcher[];
  operator?: 'AND' | 'OR';
}

interface AppConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;

  // Enhanced matching
  matchers?: FileMatcher[];

  // Legacy support
  mimetypes?: string[];

  // Standalone apps (no file input required)
  standalone?: boolean;

  // Custom icon (relative path to icon file in app directory)
  icon?: string;
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

// Helper functions
async function getMimetype(filePath: string): Promise<string> {
  // Check if it's a directory first
  try {
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      return 'inode/directory';
    }
  } catch (error) {
    // If we can't stat the file, fall back to mime lookup
  }

  const mimetype = mime.lookup(filePath);
  return mimetype || 'application/octet-stream';
}

// Enhanced file analysis
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

// Enhanced matcher evaluation
function evaluateMatcher(matcher: FileMatcher, fileAnalysis: FileAnalysis): boolean {
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

    case 'path-pattern':
      if (matcher.pattern) {
        const regexPattern = matcher.pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\?/g, '.');
        return new RegExp(`^${regexPattern}$`).test(fileAnalysis.path);
      }
      return false;

    case 'content-json':
      if (!fileAnalysis.isJson || !fileAnalysis.jsonContent) return false;
      if (matcher.requiredProperties) {
        return matcher.requiredProperties.every(prop =>
          fileAnalysis.jsonContent && fileAnalysis.jsonContent[prop] !== undefined
        );
      }
      return true;

    case 'content-regex':
      if (matcher.regex) {
        try {
          return new RegExp(matcher.regex).test(fileAnalysis.content);
        } catch {
          return false;
        }
      }
      return false;

    case 'file-size': {
      const size = fileAnalysis.size;
      if (matcher.minSize !== undefined && size < matcher.minSize) return false;
      if (matcher.maxSize !== undefined && size > matcher.maxSize) return false;
      return true;
    }

    case 'combined': {
      if (!matcher.conditions) return false;
      const results = matcher.conditions.map(condition => evaluateMatcher(condition, fileAnalysis));
      return matcher.operator === 'OR'
        ? results.some(Boolean)
        : results.every(Boolean);
    }

    default:
      return false;
  }
}

// Find matching apps with enhanced criteria
function findMatchingApps(apps: AppConfig[], fileAnalysis: FileAnalysis): Array<{app: AppConfig, priority: number}> {
  const matches: Array<{app: AppConfig, priority: number}> = [];

  for (const app of apps) {
    let bestPriority = -1;

    // Check enhanced matchers first
    if (app.matchers) {
      for (const matcher of app.matchers) {
        if (evaluateMatcher(matcher, fileAnalysis)) {
          bestPriority = Math.max(bestPriority, matcher.priority);
        }
      }
    }

    // Fallback to legacy mimetype matching
    if (bestPriority === -1 && app.mimetypes) {
      if (app.mimetypes.includes(fileAnalysis.mimetype)) {
        bestPriority = 50; // Default priority for legacy matchers
      }
    }

    if (bestPriority > -1) {
      matches.push({ app, priority: bestPriority });
    }
  }

  // Sort by priority (highest first)
  return matches.sort((a, b) => b.priority - a.priority);
}

// Function to get the hardcoded apps directory
function getAppsDirectory(): string {
  const appsDir = path.join(app.getPath('userData'), 'Apps');

  // Ensure the directory exists
  if (!fs.existsSync(appsDir)) {
    fs.mkdirSync(appsDir, { recursive: true });
    console.log('Created Apps directory:', appsDir);
  }

  return appsDir;
}

async function loadApps(): Promise<AppConfig[]> {
  // Use the hardcoded Apps directory
  const APPS_DIR = getAppsDirectory();
  console.log('loadApps: Loading from directory:', APPS_DIR);

  if (!fs.existsSync(APPS_DIR)) {
    console.log('loadApps: Directory does not exist:', APPS_DIR);
    return [];
  }

  try {
    console.log('loadApps: Reading directory contents');
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
      console.log(`loadApps: Processing directory: ${dir}`);
      const vizPath = path.join(APPS_DIR, dir);
      const metadataPath = path.join(vizPath, 'viz.json');

      console.log(`loadApps: Looking for metadata at: ${metadataPath}`);
      if (!fs.existsSync(metadataPath)) {
        console.log(`loadApps: No viz.json found for ${dir}`);
        return null;
      }

      try {
        console.log(`loadApps: Reading metadata for ${dir}`);
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        console.log(`loadApps: Metadata content for ${dir}:`, metadataContent);

        const metadata = JSON.parse(metadataContent) as AppConfig;
        console.log(`loadApps: Parsed metadata for ${dir}:`, metadata);

        const result: AppConfig = {
          ...metadata,
          id: dir,
        };
        console.log(`loadApps: Final app object for ${dir}:`, result);
        return result;
      } catch (parseError) {
        console.error(`loadApps: Error parsing metadata for ${dir}:`, parseError);
        return null;
      }
    })
    .filter(Boolean) as AppConfig[];

    console.log('loadApps: Final apps array:', apps);
    return apps;
  } catch (error) {
    console.error('loadApps: Error in loadApps function:', error);
    throw error;
  }
}

// Create the application menu bar
const createMenuBar = (): void => {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          role: 'quit'
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open Data Directory',
          click: async () => {
            const userDataPath = app.getPath('userData');
            try {
              await shell.openPath(userDataPath);
              console.log('Opened data directory:', userDataPath);
            } catch (error) {
              console.error('Failed to open data directory:', error);
              dialog.showErrorBox('Error', `Failed to open data directory: ${error}`);
            }
          }
        }
      ]
    }
  ];

  // macOS specific adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    const windowMenu = template.find(item => item.label === 'Window');
    if (windowMenu && windowMenu.submenu && Array.isArray(windowMenu.submenu)) {
      windowMenu.submenu = [
        { role: 'close' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ];
    }
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 1000,
    width: 1600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true,
      // sandbox: false,
      // nodeIntegrationInSubFrames: true,
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    backgroundColor: '#1a1a1a'
  });

  // Enable remote module for this window
  remoteMain.enable(mainWindow.webContents);

  // and load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    // Development mode - load from Vite dev server
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Production mode - load from packaged files
    // In packaged mode, the renderer files are in the app.asar
    const isDev = process.env.NODE_ENV === 'development';
    const rendererPath = isDev
      ? path.join(__dirname, `../renderer/${process.env.VITE_DEV_NAME}/index.html`)
      : path.join(__dirname, '../dist/index.html');

    mainWindow.loadFile(rendererPath);
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(async () => {
  // Register IPC handlers BEFORE creating the window
  registerIpcHandlers();

  // Create menu bar
  createMenuBar();

  createWindow();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle file drops
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  const mainWindow = BrowserWindow.getAllWindows()[0];
  if (mainWindow) {
    mainWindow.webContents.send('file-dropped', filePath);
  }
});

// Register all IPC handlers
function registerIpcHandlers() {
  // Clear existing handlers to prevent conflicts
  ipcMain.removeAllListeners('get-apps');
  ipcMain.removeAllListeners('load-app');
  ipcMain.removeAllListeners('get-mimetype');
  ipcMain.removeAllListeners('find-matching-apps');

  console.log('Registering IPC handlers...');

  ipcMain.handle('get-apps', async () => {
    try {
      console.log('IPC get-apps: Starting to get apps');
      const apps = await loadApps();
      console.log('IPC get-apps: Successfully loaded apps:', apps.length);
      return apps;
    } catch (error) {
      console.error('IPC get-apps: Error occurred:', error);
      throw error;
    }
  });

  ipcMain.handle('load-app', async (_event, id: string) => {
    const apps = await loadApps();
    const appInstance = apps.find(v => v.id === id);
    if (!appInstance) {
      throw new Error(`App ${id} not found`);
    }

    // Use the hardcoded Apps directory
    const APPS_DIR = getAppsDirectory();
    const appDir = path.join(APPS_DIR, appInstance.id);
    const bundlePath = path.join(appDir, 'dist', 'bundle.iife.js');

    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle not found: ${bundlePath}`);
    }

    const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
    return { bundleContent, config: appInstance };
  });

  ipcMain.handle('get-mimetype', async (_event, filePath: string) => {
    return await getMimetype(filePath);
  });

  ipcMain.handle('handle-file-drop', async (_event, filePath: string) => {
    const fileAnalysis = await analyzeFile(filePath);

    // For directories, don't try to read content as binary
    if (fileAnalysis.mimetype === 'inode/directory') {
      return {
        path: filePath,
        mimetype: fileAnalysis.mimetype,
        content: '', // Empty content for directories
        analysis: fileAnalysis
      };
    } else {
      // For files, read the content as base64 if it hasn't been read yet
      let content = fileAnalysis.content;
      if (!content && fs.existsSync(filePath)) {
        const binaryContent = fs.readFileSync(filePath);
        content = binaryContent.toString('base64');
      }

      return {
        path: filePath,
        mimetype: fileAnalysis.mimetype,
        content,
        analysis: fileAnalysis
      };
    }
  });

  // New enhanced app matching endpoint
  ipcMain.handle('find-matching-apps', async (_event, filePath: string) => {
    try {
      const apps = await loadApps();
      const fileAnalysis = await analyzeFile(filePath);
      const matches = findMatchingApps(apps, fileAnalysis);

      return {
        success: true,
        matches: matches.map(m => ({
          app: m.app,
          priority: m.priority,
          matchReasons: [] // Could add detailed match reasons here
        })),
        fileAnalysis
      };
    } catch (error) {
      console.error('Error finding matching apps:', error);
      return {
        success: false,
        error: (error as Error).message,
        matches: [],
        fileAnalysis: null
      };
    }
  });

  // Close window handler for keyboard shortcuts
  ipcMain.handle('close-window', async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.close();
        return { success: true };
      }
      return { success: false, error: 'No focused window found' };
    } catch (error) {
      console.error('Error closing window:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Platform detection handler
  ipcMain.handle('get-platform', async () => {
    try {
      const platform = os.platform();
      console.log('Platform detected:', platform);
      return {
        success: true,
        platform
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Autoupdate handlers
  ipcMain.handle('check-for-updates', async () => {
    try {
      const updateInfo = await autoUpdater.checkForUpdates();
      return {
        success: true,
        updateInfo
      };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('download-update', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error downloading update:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('quit-and-install', async () => {
    try {
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error) {
      console.error('Error installing update:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('get-app-version', async () => {
    return {
      success: true,
      version: app.getVersion()
    };
  });

  console.log('All IPC handlers registered successfully');
}