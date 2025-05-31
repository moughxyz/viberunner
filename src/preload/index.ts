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
    getAppsDirectory: () => ipcRenderer.invoke('get-apps-directory'),
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
    // Launch standalone apps
    launchStandaloneApp: (id: string) => ipcRenderer.invoke('launch-standalone-app', id)
  }
);