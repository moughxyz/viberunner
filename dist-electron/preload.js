"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
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
electron.contextBridge.exposeInMainWorld("nodeUtils", {
  // File system operations
  fs: {
    readFileSync: fs.readFileSync,
    writeFileSync: fs.writeFileSync,
    existsSync: fs.existsSync,
    mkdirSync: fs.mkdirSync,
    readdirSync: fs.readdirSync,
    statSync: fs.statSync
  },
  // Path utilities
  path: {
    join: path.join,
    dirname: path.dirname,
    basename: path.basename,
    extname: path.extname,
    resolve: path.resolve
  },
  // OS utilities
  os: {
    homedir: os.homedir,
    tmpdir: os.tmpdir,
    platform: os.platform,
    arch: os.arch
  },
  // Utility functions
  Buffer,
  // Safe file operations for visualizers
  saveFile: async (defaultName, content) => {
    return electron.ipcRenderer.invoke("save-file-dialog", { defaultName, content });
  },
  openFile: async (filters) => {
    return electron.ipcRenderer.invoke("open-file-dialog", { filters });
  }
});
