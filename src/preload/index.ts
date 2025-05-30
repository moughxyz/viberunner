import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getVisualizers: () => ipcRenderer.invoke('get-visualizers'),
    loadVisualizer: (id: string) => ipcRenderer.invoke('load-visualizer', id),
    getMimetype: (filePath: string) => ipcRenderer.invoke('get-mimetype', filePath),
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
    handleFileDrop: (filePath: string) => ipcRenderer.invoke('handle-file-drop', filePath),
    getVisualizersDirectory: () => ipcRenderer.invoke('get-visualizers-directory'),
    changeVisualizersDirectory: () => ipcRenderer.invoke('change-visualizers-directory'),
    reloadVisualizers: () => ipcRenderer.invoke('reload-visualizers'),
    readDirectory: (dirPath: string) => ipcRenderer.invoke('read-directory', dirPath),
    findMatchingVisualizers: (filePath: string) => ipcRenderer.invoke('find-matching-visualizers', filePath),
    // File writing and backup operations
    writeFile: (filePath: string, content: string, encoding?: 'utf8' | 'base64') =>
      ipcRenderer.invoke('write-file', filePath, content, encoding),
    backupFile: (filePath: string) => ipcRenderer.invoke('backup-file', filePath),
    saveFileDialog: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>
    }) => ipcRenderer.invoke('save-file-dialog', options)
  }
);