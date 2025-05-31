import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

// Enable remote module for renderer access to app.getPath
import '@electron/remote/main';
const remoteMain = require('@electron/remote/main');
remoteMain.initialize();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Store the selected apps directory
let selectedAppsDir: string | null = null;

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

    case 'file-size':
      const size = fileAnalysis.size;
      if (matcher.minSize !== undefined && size < matcher.minSize) return false;
      if (matcher.maxSize !== undefined && size > matcher.maxSize) return false;
      return true;

    case 'combined':
      if (!matcher.conditions) return false;
      const results = matcher.conditions.map(condition => evaluateMatcher(condition, fileAnalysis));
      return matcher.operator === 'OR'
        ? results.some(Boolean)
        : results.every(Boolean);

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

async function loadApps(): Promise<AppConfig[]> {
  // Use the selected directory directly instead of copying
  const APPS_DIR = selectedAppsDir || path.join(app.getPath('userData'), 'apps');
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

// Function to show app directory selection dialog
async function selectAppsDirectory(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Select Apps Directory',
    message: 'Choose the folder containing your apps',
    buttonLabel: 'Select Folder',
    properties: ['openDirectory'],
    defaultPath: path.join(require('os').homedir(), 'Desktop')
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];

  // Validate that this directory contains apps
  try {
    const contents = fs.readdirSync(selectedPath);
    const appFolders = contents.filter(item => {
      const itemPath = path.join(selectedPath, item);
      if (!fs.statSync(itemPath).isDirectory()) return false;

      // Check if it has a viz.json file
      const vizJsonPath = path.join(itemPath, 'viz.json');
      return fs.existsSync(vizJsonPath);
    });

    if (appFolders.length === 0) {
      dialog.showErrorBox('Invalid Directory', 'The selected directory does not contain any valid apps.\n\nApps should be folders containing a viz.json file.');
      return null;
    }

    console.log(`Found ${appFolders.length} app(s):`, appFolders);
    return selectedPath;
  } catch (error) {
    console.error('Error validating apps directory:', error);
    dialog.showErrorBox('Error', 'Could not read the selected directory.');
    return null;
  }
}

// Load and save user preferences
function getUserDataPath() {
  return path.join(app.getPath('userData'), 'preferences.json');
}

interface StartupAppConfig {
  enabled: boolean;
  tabOrder: number;
}

interface UserPreferences {
  appsDir?: string;
  startupApps?: Record<string, StartupAppConfig>;
}

function loadPreferences(): UserPreferences {
  try {
    const prefsPath = getUserDataPath();
    if (fs.existsSync(prefsPath)) {
      const data = fs.readFileSync(prefsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading preferences:', error);
  }
  return {};
}

function savePreferences(prefs: UserPreferences) {
  try {
    const prefsPath = getUserDataPath();
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

// Ensure apps are installed in the user data directory
async function ensureApps(): Promise<boolean> {
  if (!selectedAppsDir) {
    console.error('No apps directory selected');
    return false;
  }

  const appsDir = path.join(app.getPath('userData'), 'apps');

  console.log('Source apps dir:', selectedAppsDir);
  console.log('Target apps dir:', appsDir);

  try {
    // Create apps directory if it doesn't exist
    if (!fs.existsSync(appsDir)) {
      fs.mkdirSync(appsDir, { recursive: true });
      console.log('Created apps directory:', appsDir);
    }

    // Get all app folders from the selected directory
    const sourceContents = fs.readdirSync(selectedAppsDir);
    const appFolders = sourceContents.filter(item => {
      const itemPath = path.join(selectedAppsDir!, item);
      if (!fs.statSync(itemPath).isDirectory()) return false;

      // Check if it has a viz.json file
      const vizJsonPath = path.join(itemPath, 'viz.json');
      return fs.existsSync(vizJsonPath);
    });

    console.log(`Found ${appFolders.length} app(s) to copy:`, appFolders);

    // Copy each app
    for (const app of appFolders) {
      const sourcePath = path.join(selectedAppsDir, app);
      const targetPath = path.join(appsDir, app);

      console.log(`Processing ${app}:`);
      console.log('  Source:', sourcePath);
      console.log('  Target:', targetPath);

      // Check if viz.json exists in source
      const sourceVizJson = path.join(sourcePath, 'viz.json');
      if (!fs.existsSync(sourceVizJson)) {
        console.warn(`viz.json does not exist in source: ${sourceVizJson}`);
        continue;
      }

      // Remove existing app directory if it exists
      if (fs.existsSync(targetPath)) {
        try {
          // First try using fs.rmSync with recursive option
          fs.rmSync(targetPath, { recursive: true, force: true });
          console.log(`  Removed existing ${app} directory`);
        } catch (error) {
          console.log(`  fs.rmSync failed for ${app}, trying manual removal:`, error);
          // If that fails, try manual recursive removal
          const removeDir = (dir: string) => {
            if (fs.existsSync(dir)) {
              const files = fs.readdirSync(dir);
              for (const file of files) {
                const filePath = path.join(dir, file);
                try {
                  if (fs.lstatSync(filePath).isDirectory()) {
                    removeDir(filePath);
                  } else {
                    fs.unlinkSync(filePath);
                  }
                } catch (err) {
                  console.warn(`    Failed to remove ${filePath}:`, err);
                }
              }
              try {
                fs.rmdirSync(dir);
              } catch (err) {
                console.warn(`    Failed to remove directory ${dir}:`, err);
              }
            }
          };
          removeDir(targetPath);
          console.log(`  Manual removal completed for ${app}`);
        }
      }

      // Create target directory
      fs.mkdirSync(targetPath, { recursive: true });

      // Copy only essential files
      const essentialFiles = ['viz.json'];
      const essentialDirs = ['dist'];

      // Copy essential files
      for (const file of essentialFiles) {
        const sourceFile = path.join(sourcePath, file);
        const targetFile = path.join(targetPath, file);
        if (fs.existsSync(sourceFile)) {
          fs.copyFileSync(sourceFile, targetFile);
          console.log(`  Copied ${file}`);
        }
      }

      // Copy essential directories
      for (const dir of essentialDirs) {
        const sourceDir = path.join(sourcePath, dir);
        const targetDir = path.join(targetPath, dir);
        if (fs.existsSync(sourceDir)) {
          fs.cpSync(sourceDir, targetDir, { recursive: true });
          console.log(`  Copied ${dir} directory`);
        }
      }

      // Verify the copy worked
      const targetVizJson = path.join(targetPath, 'viz.json');
      if (fs.existsSync(targetVizJson)) {
        console.log(`  viz.json successfully copied for ${app}`);
      } else {
        console.error(`  viz.json was not copied properly for ${app}`);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to ensure apps:', error);
    return false;
  }
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 1000,
    width: 1600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true
    },
    titleBarStyle: 'hiddenInset',
    vibrancy: 'under-window',
    backgroundColor: '#1a1a1a'
  });

  // Enable remote module for this window
  remoteMain.enable(mainWindow.webContents);

  // and load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${process.env.VITE_DEV_NAME}/index.html`));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  // Load user preferences
  const prefs = loadPreferences();

  // Check if we have a saved apps directory
  if (prefs.appsDir && fs.existsSync(prefs.appsDir)) {
    selectedAppsDir = prefs.appsDir;
    console.log('Using saved apps directory:', selectedAppsDir);
  } else {
    // Show dialog to select apps directory
    console.log('No saved apps directory found, prompting user...');
    selectedAppsDir = await selectAppsDirectory();

    if (!selectedAppsDir) {
      // User cancelled or no valid directory selected
      dialog.showErrorBox('No Apps Directory', 'You must select a valid apps directory to use the application.');
      app.quit();
      return;
    }

    // Save the selected directory
    savePreferences({ appsDir: selectedAppsDir });
    console.log('Saved apps directory preference:', selectedAppsDir);
  }

  // Register IPC handlers BEFORE creating the window
  registerIpcHandlers();

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
  ipcMain.removeAllListeners('read-file');
  ipcMain.removeAllListeners('change-frames-directory');
  ipcMain.removeAllListeners('reload-apps');
  ipcMain.removeAllListeners('read-directory');
  ipcMain.removeAllListeners('find-matching-apps');
  ipcMain.removeAllListeners('write-file');
  ipcMain.removeAllListeners('backup-file');
  ipcMain.removeAllListeners('save-file-dialog');

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

    // Use the selected directory directly
    const APPS_DIR = selectedAppsDir || path.join(app.getPath('userData'), 'apps');
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

  ipcMain.handle('read-file', async (_event, filePath: string) => {
    const content = fs.readFileSync(filePath);
    return content.toString('base64');
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

  ipcMain.handle('change-frames-directory', async () => {
    try {
      console.log('change-frames-directory handler called');
      const newDir = await selectAppsDirectory();
      if (newDir) {
        selectedAppsDir = newDir;
        savePreferences({ appsDir: newDir });
        console.log('Changed frames directory to:', newDir);
        return { success: true, directory: newDir };
      }
      return { success: false, directory: null };
    } catch (error) {
      console.error('Error in change-frames-directory handler:', error);
      throw error;
    }
  });

  ipcMain.handle('reload-apps', async () => {
    if (selectedAppsDir) {
      const success = await ensureApps();
      const apps = await loadApps();
      return { success, apps };
    }
    return { success: false, apps: [] };
  });

  // Read directory contents for folder visualization
  ipcMain.handle('read-directory', async (_event, dirPath: string) => {
    try {
      console.log('Reading directory:', dirPath);

      if (!fs.existsSync(dirPath)) {
        throw new Error(`Directory does not exist: ${dirPath}`);
      }

      const stats = fs.statSync(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${dirPath}`);
      }

      const items = fs.readdirSync(dirPath);
      const fileInfos = items.map(item => {
        const itemPath = path.join(dirPath, item);
        try {
          const itemStats = fs.statSync(itemPath);
          const isDirectory = itemStats.isDirectory();

          let extension = '';
          if (!isDirectory) {
            extension = path.extname(item).toLowerCase().replace('.', '');
          }

          return {
            name: item,
            path: itemPath,
            isDirectory,
            size: isDirectory ? 0 : itemStats.size,
            extension: extension || undefined,
            modified: itemStats.mtime.toISOString()
          };
        } catch (error) {
          console.warn(`Could not stat ${itemPath}:`, error);
          return {
            name: item,
            path: itemPath,
            isDirectory: false,
            size: 0,
            extension: '',
            modified: new Date().toISOString()
          };
        }
      });

      console.log(`Found ${fileInfos.length} items in ${dirPath}`);
      return { success: true, files: fileInfos };
    } catch (error) {
      console.error('Error reading directory:', error);
      return { success: false, error: (error as Error).message, files: [] };
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

  // File writing and backup operations for apps
  ipcMain.handle('write-file', async (_event, filePath: string, content: string, encoding: 'utf8' | 'base64' = 'utf8') => {
    try {
      // Validate file path for security
      if (!filePath || filePath.includes('..')) {
        throw new Error('Invalid file path');
      }

      if (encoding === 'base64') {
        const buffer = Buffer.from(content, 'base64');
        fs.writeFileSync(filePath, buffer);
      } else {
        fs.writeFileSync(filePath, content, 'utf8');
      }

      console.log(`File written successfully: ${filePath}`);
      return { success: true };
    } catch (error) {
      console.error('Error writing file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('backup-file', async (_event, filePath: string) => {
    try {
      // Validate file path for security
      if (!filePath || filePath.includes('..')) {
        throw new Error('Invalid file path');
      }

      if (!fs.existsSync(filePath)) {
        throw new Error('File does not exist');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${filePath}.backup.${timestamp}`;
      fs.copyFileSync(filePath, backupPath);

      console.log(`Backup created: ${backupPath}`);
      return { success: true, backupPath };
    } catch (error) {
      console.error('Error creating backup:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('save-file-dialog', async (_event, options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>
  } = {}) => {
    try {
      const result = await dialog.showSaveDialog({
        title: options.title || 'Save File',
        defaultPath: options.defaultPath,
        filters: options.filters || [
          { name: 'All Files', extensions: ['*'] }
        ]
      });

      return {
        success: !result.canceled,
        filePath: result.filePath || null,
        canceled: result.canceled
      };
    } catch (error) {
      console.error('Error showing save dialog:', error);
      return { success: false, error: (error as Error).message, canceled: true };
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

  console.log('All IPC handlers registered successfully');
}