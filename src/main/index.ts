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

// Helper functions
async function getMimetype(filePath: string): Promise<string> {
  const mimetype = mime.lookup(filePath);
  return mimetype || 'application/octet-stream';
}

async function loadVisualizers(): Promise<any[]> {
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

        const metadata = JSON.parse(metadataContent);
        console.log(`loadVisualizers: Parsed metadata for ${dir}:`, metadata);

        const result = {
          id: dir,
          ...metadata,
          path: vizPath
        };
        console.log(`loadVisualizers: Final visualizer object for ${dir}:`, result);
        return result;
      } catch (parseError) {
        console.error(`loadVisualizers: Error parsing metadata for ${dir}:`, parseError);
        return null;
      }
    })
    .filter(Boolean);

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
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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
    const bundlePath = path.join(visualizerDir, 'dist', 'index.js');

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
    const mimetype = await getMimetype(filePath);
    const content = fs.readFileSync(filePath);

    return {
      path: filePath,
      mimetype,
      content: content.toString('base64')
    };
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
}