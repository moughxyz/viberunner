"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld(
  "api",
  {
    getVisualizers: () => electron.ipcRenderer.invoke("get-visualizers"),
    loadVisualizer: (id) => electron.ipcRenderer.invoke("load-visualizer", id),
    getMimetype: (filePath) => electron.ipcRenderer.invoke("get-mimetype", filePath),
    readFile: (filePath) => electron.ipcRenderer.invoke("read-file", filePath),
    handleFileDrop: (filePath) => electron.ipcRenderer.invoke("handle-file-drop", filePath),
    getVisualizersDirectory: () => electron.ipcRenderer.invoke("get-visualizers-directory"),
    changeVisualizersDirectory: () => electron.ipcRenderer.invoke("change-visualizers-directory"),
    reloadVisualizers: () => electron.ipcRenderer.invoke("reload-visualizers"),
    readDirectory: (dirPath) => electron.ipcRenderer.invoke("read-directory", dirPath),
    findMatchingVisualizers: (filePath) => electron.ipcRenderer.invoke("find-matching-visualizers", filePath),
    // File writing and backup operations
    writeFile: (filePath, content, encoding) => electron.ipcRenderer.invoke("write-file", filePath, content, encoding),
    backupFile: (filePath) => electron.ipcRenderer.invoke("backup-file", filePath),
    saveFileDialog: (options) => electron.ipcRenderer.invoke("save-file-dialog", options)
  }
);
