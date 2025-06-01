import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getApps: () => ipcRenderer.invoke('get-apps'),
    loadApp: (id: string) => ipcRenderer.invoke('load-app', id),
    getMimetype: (filePath: string) => ipcRenderer.invoke('get-mimetype', filePath),
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    handleFileDrop: (filePath: string) => ipcRenderer.invoke('handle-file-drop', filePath),
    changeAppsDirectory: () => ipcRenderer.invoke('change-frames-directory'),
    reloadApps: () => ipcRenderer.invoke('reload-apps'),
    readDirectory: (dirPath: string) => ipcRenderer.invoke('read-directory', dirPath),
    findMatchingApps: (filePath: string) => ipcRenderer.invoke('find-matching-apps', filePath),
    // File writing and backup operations
    writeFile: (filePath: string, content: string, encoding?: 'utf8' | 'base64') =>
      ipcRenderer.invoke('write-file', filePath, content, encoding),
    backupFile: (filePath: string) => ipcRenderer.invoke('backup-file', filePath),
    saveFileDialog: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>
    }) => ipcRenderer.invoke('save-file-dialog', options),
    // Permission system
    checkDirectoryAccess: (directoryPath: string) =>
      ipcRenderer.invoke('check-directory-access', directoryPath),
    requestDirectoryAccess: (directoryPath: string, reason?: string) =>
      ipcRenderer.invoke('request-directory-access', directoryPath, reason),
    getGrantedPaths: () => ipcRenderer.invoke('get-granted-paths'),
    readFileSecure: (filePath: string) => ipcRenderer.invoke('read-file-secure', filePath),
    // System operations for plugins
    getPlatform: () => ipcRenderer.invoke('get-platform'),
    executeCommand: (command: string, options?: { timeout?: number }) =>
      ipcRenderer.invoke('execute-command', command, options),
    // Launch standalone apps
    launchStandaloneApp: (id: string) => ipcRenderer.invoke('launch-standalone-app', id),
    // Startup app management
    getStartupApps: () => ipcRenderer.invoke('get-startup-apps'),
    setStartupApp: (appId: string, config: { enabled: boolean; tabOrder: number }) =>
      ipcRenderer.invoke('set-startup-app', appId, config),
    removeStartupApp: (appId: string) => ipcRenderer.invoke('remove-startup-app', appId),
    // Listen for startup app launch events from main process
    onLaunchStartupApp: (callback: (event: any, data: { appId: string; config: any }) => void) =>
      ipcRenderer.on('launch-startup-app', callback),
    removeStartupAppListeners: () => ipcRenderer.removeAllListeners('launch-startup-app')
  }
);