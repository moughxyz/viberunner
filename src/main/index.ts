import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// Store the selected visualizers directory
let selectedVisualizersDir: string | null = null;

// Constants
const VISUALIZERS_DIR = path.join(app.getPath('userData'), 'visualizers');

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

interface VisualizerConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;

  // Enhanced matching
  matchers?: FileMatcher[];

  // Legacy support
  mimetypes?: string[];

  // Standalone visualizers (no file input required)
  standalone?: boolean;
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

// Find matching visualizers with enhanced criteria
function findMatchingVisualizers(visualizers: VisualizerConfig[], fileAnalysis: FileAnalysis): Array<{visualizer: VisualizerConfig, priority: number}> {
  const matches: Array<{visualizer: VisualizerConfig, priority: number}> = [];

  for (const visualizer of visualizers) {
    let bestPriority = -1;

    // Check enhanced matchers first
    if (visualizer.matchers) {
      for (const matcher of visualizer.matchers) {
        if (evaluateMatcher(matcher, fileAnalysis)) {
          bestPriority = Math.max(bestPriority, matcher.priority);
        }
      }
    }

    // Fallback to legacy mimetype matching
    if (bestPriority === -1 && visualizer.mimetypes) {
      if (visualizer.mimetypes.includes(fileAnalysis.mimetype)) {
        bestPriority = 50; // Default priority for legacy matchers
      }
    }

    if (bestPriority > -1) {
      matches.push({ visualizer, priority: bestPriority });
    }
  }

  // Sort by priority (highest first)
  return matches.sort((a, b) => b.priority - a.priority);
}

async function loadVisualizers(): Promise<VisualizerConfig[]> {
  console.log('loadVisualizers: Starting to load visualizers from:', VISUALIZERS_DIR);

  if (!fs.existsSync(VISUALIZERS_DIR)) {
    console.log('loadVisualizers: Creating visualizers directory');
    fs.mkdirSync(VISUALIZERS_DIR, { recursive: true });
  }

  try {
    console.log('loadVisualizers: Reading directory contents');
    const dirContents = fs.readdirSync(VISUALIZERS_DIR);
    console.log('loadVisualizers: Directory contents:', dirContents);

    const directories = dirContents.filter((dir: string) => {
      const fullPath = path.join(VISUALIZERS_DIR, dir);
      const isDir = fs.statSync(fullPath).isDirectory();
      console.log(`loadVisualizers: ${dir} is directory: ${isDir}`);
      return isDir;
    });
    console.log('loadVisualizers: Found directories:', directories);

    const visualizers = directories.map((dir: string) => {
      console.log(`loadVisualizers: Processing directory: ${dir}`);
      const vizPath = path.join(VISUALIZERS_DIR, dir);
      const metadataPath = path.join(vizPath, 'viz.json');

      console.log(`loadVisualizers: Looking for metadata at: ${metadataPath}`);
      if (!fs.existsSync(metadataPath)) {
        console.log(`loadVisualizers: No viz.json found for ${dir}`);
        return null;
      }

      try {
        console.log(`loadVisualizers: Reading metadata for ${dir}`);
        const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
        console.log(`loadVisualizers: Metadata content for ${dir}:`, metadataContent);

        const metadata = JSON.parse(metadataContent) as VisualizerConfig;
        console.log(`loadVisualizers: Parsed metadata for ${dir}:`, metadata);

        const result: VisualizerConfig = {
          ...metadata,
          id: dir,
        };
        console.log(`loadVisualizers: Final visualizer object for ${dir}:`, result);
        return result;
      } catch (parseError) {
        console.error(`loadVisualizers: Error parsing metadata for ${dir}:`, parseError);
        return null;
      }
    })
    .filter(Boolean) as VisualizerConfig[];

    console.log('loadVisualizers: Final visualizers array:', visualizers);
    return visualizers;
  } catch (error) {
    console.error('loadVisualizers: Error in loadVisualizers function:', error);
    throw error;
  }
}

// Function to show visualizer directory selection dialog
async function selectVisualizersDirectory(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    title: 'Select Visualizers Directory',
    message: 'Choose the folder containing your visualizers',
    buttonLabel: 'Select Folder',
    properties: ['openDirectory'],
    defaultPath: path.join(require('os').homedir(), 'Desktop')
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const selectedPath = result.filePaths[0];

  // Validate that this directory contains visualizers
  try {
    const contents = fs.readdirSync(selectedPath);
    const visualizerFolders = contents.filter(item => {
      const itemPath = path.join(selectedPath, item);
      if (!fs.statSync(itemPath).isDirectory()) return false;

      // Check if it has a viz.json file
      const vizJsonPath = path.join(itemPath, 'viz.json');
      return fs.existsSync(vizJsonPath);
    });

    if (visualizerFolders.length === 0) {
      dialog.showErrorBox('Invalid Directory', 'The selected directory does not contain any valid visualizers.\n\nVisualizers should be folders containing a viz.json file.');
      return null;
    }

    console.log(`Found ${visualizerFolders.length} visualizer(s):`, visualizerFolders);
    return selectedPath;
  } catch (error) {
    console.error('Error validating visualizers directory:', error);
    dialog.showErrorBox('Error', 'Could not read the selected directory.');
    return null;
  }
}

// Load and save user preferences
function getUserDataPath() {
  return path.join(app.getPath('userData'), 'preferences.json');
}

function loadPreferences(): { visualizersDir?: string } {
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

function savePreferences(prefs: { visualizersDir?: string }) {
  try {
    const prefsPath = getUserDataPath();
    fs.writeFileSync(prefsPath, JSON.stringify(prefs, null, 2));
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

// Ensure visualizers are installed in the user data directory
async function ensureVisualizers(): Promise<boolean> {
  if (!selectedVisualizersDir) {
    console.error('No visualizers directory selected');
    return false;
  }

  const visualizersDir = path.join(app.getPath('userData'), 'visualizers');

  console.log('Source visualizers dir:', selectedVisualizersDir);
  console.log('Target visualizers dir:', visualizersDir);

  try {
    // Create visualizers directory if it doesn't exist
    if (!fs.existsSync(visualizersDir)) {
      fs.mkdirSync(visualizersDir, { recursive: true });
      console.log('Created visualizers directory:', visualizersDir);
    }

    // Get all visualizer folders from the selected directory
    const sourceContents = fs.readdirSync(selectedVisualizersDir);
    const visualizerFolders = sourceContents.filter(item => {
      const itemPath = path.join(selectedVisualizersDir!, item);
      if (!fs.statSync(itemPath).isDirectory()) return false;

      // Check if it has a viz.json file
      const vizJsonPath = path.join(itemPath, 'viz.json');
      return fs.existsSync(vizJsonPath);
    });

    console.log(`Found ${visualizerFolders.length} visualizer(s) to copy:`, visualizerFolders);

    // Copy each visualizer
    for (const visualizer of visualizerFolders) {
      const sourcePath = path.join(selectedVisualizersDir, visualizer);
      const targetPath = path.join(visualizersDir, visualizer);

      console.log(`Processing ${visualizer}:`);
      console.log('  Source:', sourcePath);
      console.log('  Target:', targetPath);

      // Check if viz.json exists in source
      const sourceVizJson = path.join(sourcePath, 'viz.json');
      if (!fs.existsSync(sourceVizJson)) {
        console.warn(`viz.json does not exist in source: ${sourceVizJson}`);
        continue;
      }

      // Remove existing visualizer directory if it exists
      if (fs.existsSync(targetPath)) {
        try {
          // First try using fs.rmSync with recursive option
          fs.rmSync(targetPath, { recursive: true, force: true });
          console.log(`  Removed existing ${visualizer} directory`);
        } catch (error) {
          console.log(`  fs.rmSync failed for ${visualizer}, trying manual removal:`, error);
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
          console.log(`  Manual removal completed for ${visualizer}`);
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
        console.log(`  viz.json successfully copied for ${visualizer}`);
      } else {
        console.error(`  viz.json was not copied properly for ${visualizer}`);
      }
    }

    return true;
  } catch (error) {
    console.error('Failed to ensure visualizers:', error);
    return false;
  }
}

const createWindow = (): void => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset', // Keep native macOS controls, hide title bar
    webPreferences: {
      nodeIntegration: true, // Allow direct Node.js access in renderer
      contextIsolation: false, // Remove context isolation for full access
      webSecurity: false // Allow loading local resources
    },
  });

  // and load the index.html of the app.
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  // Load user preferences
  const prefs = loadPreferences();

  // Check if we have a saved visualizers directory
  if (prefs.visualizersDir && fs.existsSync(prefs.visualizersDir)) {
    selectedVisualizersDir = prefs.visualizersDir;
    console.log('Using saved visualizers directory:', selectedVisualizersDir);
  } else {
    // Show dialog to select visualizers directory
    console.log('No saved visualizers directory found, prompting user...');
    selectedVisualizersDir = await selectVisualizersDirectory();

    if (!selectedVisualizersDir) {
      // User cancelled or no valid directory selected
      dialog.showErrorBox('No Visualizers Directory', 'You must select a valid visualizers directory to use the application.');
      app.quit();
      return;
    }

    // Save the selected directory
    savePreferences({ visualizersDir: selectedVisualizersDir });
    console.log('Saved visualizers directory preference:', selectedVisualizersDir);
  }

  // Now ensure visualizers are copied
  const success = await ensureVisualizers();
  if (!success) {
    dialog.showErrorBox('Visualizers Error', 'Failed to load visualizers. Please check the selected directory and try again.');
    app.quit();
    return;
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
  ipcMain.handle('get-visualizers', async () => {
    try {
      console.log('IPC get-visualizers: Starting to get visualizers');
      const visualizers = await loadVisualizers();
      console.log('IPC get-visualizers: Successfully loaded visualizers:', visualizers.length);
      return visualizers;
    } catch (error) {
      console.error('IPC get-visualizers: Error occurred:', error);
      throw error;
    }
  });

  ipcMain.handle('load-visualizer', async (event, id: string) => {
    const visualizers = await loadVisualizers();
    const visualizer = visualizers.find(v => v.id === id);
    if (!visualizer) {
      throw new Error(`Visualizer ${id} not found`);
    }

    const visualizerDir = path.join(VISUALIZERS_DIR, visualizer.id);
    const bundlePath = path.join(visualizerDir, 'dist', 'bundle.iife.js');

    if (!fs.existsSync(bundlePath)) {
      throw new Error(`Bundle not found: ${bundlePath}`);
    }

    const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
    return { bundleContent, config: visualizer };
  });

  ipcMain.handle('get-mimetype', async (event, filePath: string) => {
    return await getMimetype(filePath);
  });

  ipcMain.handle('read-file', async (event, filePath: string) => {
    const content = fs.readFileSync(filePath);
    return content.toString('base64');
  });

  ipcMain.handle('handle-file-drop', async (event, filePath: string) => {
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

  ipcMain.handle('get-visualizers-directory', () => {
    return selectedVisualizersDir;
  });

  ipcMain.handle('change-visualizers-directory', async () => {
    const newDir = await selectVisualizersDirectory();
    if (newDir) {
      selectedVisualizersDir = newDir;
      savePreferences({ visualizersDir: newDir });

      // Reload visualizers
      const success = await ensureVisualizers();
      return { success, directory: newDir };
    }
    return { success: false, directory: null };
  });

  ipcMain.handle('reload-visualizers', async () => {
    if (selectedVisualizersDir) {
      const success = await ensureVisualizers();
      const visualizers = await loadVisualizers();
      return { success, visualizers };
    }
    return { success: false, visualizers: [] };
  });

  // Read directory contents for folder visualization
  ipcMain.handle('read-directory', async (event, dirPath: string) => {
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

  // New enhanced visualizer matching endpoint
  ipcMain.handle('find-matching-visualizers', async (event, filePath: string) => {
    try {
      const visualizers = await loadVisualizers();
      const fileAnalysis = await analyzeFile(filePath);
      const matches = findMatchingVisualizers(visualizers, fileAnalysis);

      return {
        success: true,
        matches: matches.map(m => ({
          visualizer: m.visualizer,
          priority: m.priority,
          matchReasons: [] // Could add detailed match reasons here
        })),
        fileAnalysis
      };
    } catch (error) {
      console.error('Error finding matching visualizers:', error);
      return {
        success: false,
        error: (error as Error).message,
        matches: [],
        fileAnalysis: null
      };
    }
  });

  // File writing and backup operations for visualizers
  ipcMain.handle('write-file', async (event, filePath: string, content: string, encoding: 'utf8' | 'base64' = 'utf8') => {
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

  ipcMain.handle('backup-file', async (event, filePath: string) => {
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

  ipcMain.handle('save-file-dialog', async (event, options: {
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

  // Launch standalone visualizer without file input
  ipcMain.handle('launch-standalone-visualizer', async (event, id: string) => {
    try {
      const visualizers = await loadVisualizers();
      const visualizer = visualizers.find(v => v.id === id);

      if (!visualizer) {
        throw new Error(`Visualizer ${id} not found`);
      }

      if (!visualizer.standalone) {
        throw new Error(`Visualizer ${id} is not configured for standalone use`);
      }

      const visualizerDir = path.join(VISUALIZERS_DIR, visualizer.id);
      const bundlePath = path.join(visualizerDir, 'dist', 'bundle.iife.js');

      if (!fs.existsSync(bundlePath)) {
        throw new Error(`Bundle not found: ${bundlePath}`);
      }

      const bundleContent = fs.readFileSync(bundlePath, 'utf-8');
      return {
        bundleContent,
        config: visualizer,
        standalone: true
      };
    } catch (error) {
      console.error('Error launching standalone visualizer:', error);
      throw error;
    }
  });
}