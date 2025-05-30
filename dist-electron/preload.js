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
    reloadVisualizers: () => electron.ipcRenderer.invoke("reload-visualizers")
  }
);
