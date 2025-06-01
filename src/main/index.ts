import { app, BrowserWindow, ipcMain, dialog, Menu, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import { exec } from 'child_process';
import os from 'os';

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

// Permission Manager for handling file system access
class PermissionManager {
  private grantedPaths = new Set<string>();
  private bookmarks = new Map<string, Buffer>(); // Store security-scoped bookmarks
  private bookmarksFile = path.join(app.getPath('userData'), 'bookmarks.json');

  constructor() {
    this.loadStoredBookmarks();
  }

  async checkAccess(path: string): Promise<boolean> {
    // Check if path is already granted in current session
    for (const grantedPath of this.grantedPaths) {
      if (path.startsWith(grantedPath)) {
        return true;
      }
    }

    // Check if we have a stored bookmark for this path or a parent path
    for (const [bookmarkPath, bookmark] of this.bookmarks) {
      if (path.startsWith(bookmarkPath)) {
        try {
          // Try to start accessing the bookmark - convert Buffer to base64 string
          const bookmarkString = bookmark.toString('base64');
          const stopAccessingSecurityScopedResource = app.startAccessingSecurityScopedResource(bookmarkString);
          if (stopAccessingSecurityScopedResource) {
            this.grantedPaths.add(bookmarkPath);
            return true;
          }
        } catch (error) {
          console.log(`Bookmark for ${bookmarkPath} is no longer valid:`, error);
          // Remove invalid bookmark
          this.bookmarks.delete(bookmarkPath);
          this.saveBookmarks();
        }
      }
    }

    return false;
  }

  // Check without dialog - useful for testing existing permissions
  hasStoredAccess(path: string): boolean {
    for (const grantedPath of this.grantedPaths) {
      if (path.startsWith(grantedPath)) {
        return true;
      }
    }

    for (const bookmarkPath of this.bookmarks.keys()) {
      if (path.startsWith(bookmarkPath)) {
        return true;
      }
    }

    return false;
  }

  async checkAccessSilent(path: string): Promise<boolean> {
    // Check current session first
    for (const grantedPath of this.grantedPaths) {
      if (path.startsWith(grantedPath)) {
        return true;
      }
    }

    // Try to restore from bookmarks without showing dialogs
    for (const [bookmarkPath, bookmark] of this.bookmarks) {
      if (path.startsWith(bookmarkPath)) {
        try {
          // Convert Buffer to base64 string for Electron API
          const bookmarkString = bookmark.toString('base64');
          const stopAccessingSecurityScopedResource = app.startAccessingSecurityScopedResource(bookmarkString);
          if (stopAccessingSecurityScopedResource) {
            this.grantedPaths.add(bookmarkPath);
            return true;
          }
        } catch (error) {
          console.log(`Bookmark for ${bookmarkPath} is no longer valid:`, error);
          this.bookmarks.delete(bookmarkPath);
          this.saveBookmarks();
        }
      }
    }

    return false;
  }

  async requestAccess(path: string, reason: string): Promise<boolean> {
    // Check if already granted
    if (await this.checkAccessSilent(path)) return true;

    // Get the main window to use as parent for the dialog
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

    // Show permission dialog
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Directory Access Required',
      message: `${reason}\n\nPlease select the directory to grant access:`,
      buttonLabel: 'Grant Access',
      properties: ['openDirectory'], // Remove createBookmarks as it's not a valid property
      defaultPath: path,
      securityScopedBookmarks: true // Enable bookmark creation
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const grantedPath = result.filePaths[0];
      this.grantedPaths.add(grantedPath);

      // Create and store security-scoped bookmark
      if (result.bookmarks && result.bookmarks.length > 0) {
        // Convert base64 string to Buffer for storage
        const bookmarkBuffer = Buffer.from(result.bookmarks[0], 'base64');
        this.bookmarks.set(grantedPath, bookmarkBuffer);
        this.saveBookmarks();
        console.log('Created persistent bookmark for:', grantedPath);
      }

      console.log('Granted access to:', grantedPath);
      return true;
    }

    return false;
  }

  async requestCommonDirectoryAccess(): Promise<void> {
    const commonDirs = [
      { path: app.getPath('documents'), name: 'Documents' },
      { path: app.getPath('desktop'), name: 'Desktop' },
      { path: app.getPath('downloads'), name: 'Downloads' }
    ];

    // Check which directories we don't already have access to
    const needAccess = [];
    for (const dir of commonDirs) {
      if (!await this.checkAccessSilent(dir.path)) {
        needAccess.push(dir);
      }
    }

    if (needAccess.length === 0) {
      console.log('Already have access to all common directories');
      return;
    }

    // Get the main window to use as parent for the dialog
    const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

    // Show a single dialog explaining what we need
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'File System Access',
      message: 'Viberunner apps may need to read and write files',
      detail: `To provide the best experience, please grant access to common directories like ${needAccess.map(d => d.name).join(', ')} when prompted.\n\nThese permissions will be saved and won't be requested again.`,
      buttons: ['Grant Access', 'Skip'],
      defaultId: 0
    });

    if (result.response === 0) {
      // Request access to each needed directory
      for (const dir of needAccess) {
        try {
          await this.requestAccess(dir.path, `Grant access to your ${dir.name} folder for app file operations`);
        } catch (error) {
          console.log(`User skipped access to ${dir.name}:`, error);
        }
      }
    }
  }

  hasAccess(path: string): boolean {
    for (const grantedPath of this.grantedPaths) {
      if (path.startsWith(grantedPath)) {
        return true;
      }
    }
    return false;
  }

  getGrantedPaths(): string[] {
    return Array.from(this.grantedPaths);
  }

  getStoredBookmarkPaths(): string[] {
    return Array.from(this.bookmarks.keys());
  }

  private loadStoredBookmarks(): void {
    try {
      if (fs.existsSync(this.bookmarksFile)) {
        const data = fs.readFileSync(this.bookmarksFile, 'utf8');
        const stored = JSON.parse(data);

        // Convert base64 strings back to Buffers
        for (const [path, base64Data] of Object.entries(stored)) {
          if (typeof base64Data === 'string') {
            this.bookmarks.set(path, Buffer.from(base64Data, 'base64'));
          }
        }

        console.log(`Loaded ${this.bookmarks.size} stored bookmarks`);
      }
    } catch (error) {
      console.error('Error loading stored bookmarks:', error);
    }
  }

  private saveBookmarks(): void {
    try {
      // Convert Buffers to base64 strings for storage
      const toStore: Record<string, string> = {};
      for (const [path, bookmark] of this.bookmarks) {
        toStore[path] = bookmark.toString('base64');
      }

      fs.writeFileSync(this.bookmarksFile, JSON.stringify(toStore, null, 2));
      console.log(`Saved ${this.bookmarks.size} bookmarks to disk`);
    } catch (error) {
      console.error('Error saving bookmarks:', error);
    }
  }

  // Clean up invalid bookmarks
  async validateAndCleanBookmarks(): Promise<void> {
    const invalidPaths: string[] = [];

    for (const [bookmarkPath, bookmark] of this.bookmarks) {
      try {
        // Convert Buffer to base64 string for Electron API
        const bookmarkString = bookmark.toString('base64');
        const stopAccessingSecurityScopedResource = app.startAccessingSecurityScopedResource(bookmarkString);
        if (stopAccessingSecurityScopedResource) {
          // Bookmark is valid, stop accessing for now
          stopAccessingSecurityScopedResource();
        } else {
          invalidPaths.push(bookmarkPath);
        }
      } catch (error) {
        console.log(`Bookmark for ${bookmarkPath} is invalid:`, error);
        invalidPaths.push(bookmarkPath);
      }
    }

    // Remove invalid bookmarks
    for (const invalidPath of invalidPaths) {
      this.bookmarks.delete(invalidPath);
    }

    if (invalidPaths.length > 0) {
      this.saveBookmarks();
      console.log(`Cleaned up ${invalidPaths.length} invalid bookmarks`);
    }
  }
}

// Global permission manager instance
const permissionManager = new PermissionManager();

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
  // Get the main window to use as parent for the dialog
  const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];

  const result = await dialog.showOpenDialog(mainWindow, {
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
      webSecurity: false,
      sandbox: false,
      nodeIntegrationInSubFrames: true,
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
  // Initialize permission manager and validate stored bookmarks
  await permissionManager.validateAndCleanBookmarks();

  // Register IPC handlers BEFORE creating the window
  registerIpcHandlers();

  // NOTE: Removed automatic permission request on startup
  // Permissions will now be requested on-demand by individual apps
  // permissionManager.requestCommonDirectoryAccess();

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
  ipcMain.removeAllListeners('read-file');
  ipcMain.removeAllListeners('change-frames-directory');
  ipcMain.removeAllListeners('reload-apps');
  ipcMain.removeAllListeners('read-directory');
  ipcMain.removeAllListeners('find-matching-apps');
  ipcMain.removeAllListeners('write-file');
  ipcMain.removeAllListeners('backup-file');
  ipcMain.removeAllListeners('save-file-dialog');
  ipcMain.removeAllListeners('check-directory-access');
  ipcMain.removeAllListeners('request-directory-access');
  ipcMain.removeAllListeners('get-granted-paths');
  ipcMain.removeAllListeners('read-file-secure');
  ipcMain.removeAllListeners('get-platform');
  ipcMain.removeAllListeners('execute-command');

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

      // Check if we have permission to write to this location
      const directory = path.dirname(filePath);
      const hasAccess = await permissionManager.checkAccess(directory);

      if (!hasAccess) {
        throw new Error('Access denied to directory');
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

  // Permission management handlers
  ipcMain.handle('check-directory-access', async (_event, directoryPath: string) => {
    try {
      const hasAccess = await permissionManager.checkAccessSilent(directoryPath);
      return {
        success: true,
        hasAccess
      };
    } catch (error) {
      return {
        success: false,
        hasAccess: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('request-directory-access', async (_event, directoryPath: string, reason?: string) => {
    try {
      const granted = await permissionManager.requestAccess(
        directoryPath,
        reason || `Access required for: ${directoryPath}`
      );
      return {
        success: true,
        granted
      };
    } catch (error) {
      return {
        success: false,
        granted: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  ipcMain.handle('get-granted-paths', async (_event) => {
    try {
      const sessionPaths = permissionManager.getGrantedPaths();
      const storedPaths = permissionManager.getStoredBookmarkPaths();
      // Combine and deduplicate
      const allPaths = [...new Set([...sessionPaths, ...storedPaths])];
      return {
        success: true,
        grantedPaths: allPaths
      };
    } catch (error) {
      return {
        success: false,
        grantedPaths: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  // Enhanced read-file with permission checking
  ipcMain.handle('read-file-secure', async (_event, filePath: string) => {
    try {
      // Check if we have access to the file's directory
      const dirPath = path.dirname(filePath);
      const hasAccess = await permissionManager.checkAccess(dirPath);

      if (!hasAccess) {
        return {
          success: false,
          error: 'No permission to access file directory'
        };
      }

      // Read the file and return base64 encoded content
      const content = await fs.promises.readFile(filePath);
      return {
        success: true,
        content: content.toString('base64')
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
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

  // General-purpose command execution handler for plugins
  ipcMain.handle('execute-command', async (_event, command: string, options?: { timeout?: number }) => {
    return new Promise((resolve) => {
      try {
        const execOptions = {
          timeout: options?.timeout || 30000, // 30 second default timeout
          maxBuffer: 1024 * 1024 // 1MB buffer limit
        };

        exec(command, execOptions, (error, stdout, stderr) => {
          if (error) {
            console.error('Command execution error:', error);
            resolve({
              success: false,
              error: error.message,
              stdout: stdout || '',
              stderr: stderr || '',
              code: error.code
            });
            return;
          }

          console.log(`Command executed successfully: ${command.substring(0, 100)}${command.length > 100 ? '...' : ''}`);
          resolve({
            success: true,
            stdout: stdout || '',
            stderr: stderr || '',
            code: 0
          });
        });
      } catch (error) {
        resolve({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          stdout: '',
          stderr: '',
          code: -1
        });
      }
    });
  });

  console.log('All IPC handlers registered successfully');
}