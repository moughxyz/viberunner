"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld(
  "api",
  {
    getApps: () => electron.ipcRenderer.invoke("get-apps"),
    loadApp: (id) => electron.ipcRenderer.invoke("load-app", id),
    getMimetype: (filePath) => electron.ipcRenderer.invoke("get-mimetype", filePath),
    readFile: (filePath) => electron.ipcRenderer.invoke("read-file", filePath),
    handleFileDrop: (filePath) => electron.ipcRenderer.invoke("handle-file-drop", filePath),
    getAppsDirectory: () => electron.ipcRenderer.invoke("get-apps-directory"),
    changeAppsDirectory: () => electron.ipcRenderer.invoke("change-frames-directory"),
    reloadApps: () => electron.ipcRenderer.invoke("reload-apps"),
    readDirectory: (dirPath) => electron.ipcRenderer.invoke("read-directory", dirPath),
    findMatchingApps: (filePath) => electron.ipcRenderer.invoke("find-matching-apps", filePath),
    // File writing and backup operations
    writeFile: (filePath, content, encoding) => electron.ipcRenderer.invoke("write-file", filePath, content, encoding),
    backupFile: (filePath) => electron.ipcRenderer.invoke("backup-file", filePath),
    saveFileDialog: (options) => electron.ipcRenderer.invoke("save-file-dialog", options),
    // Launch standalone apps
    launchStandaloneApp: (id) => electron.ipcRenderer.invoke("launch-standalone-app", id)
  }
);
