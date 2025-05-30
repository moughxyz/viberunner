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
    readDirectory: (dirPath: string) => ipcRenderer.invoke('read-directory', dirPath)
  }
);