"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld(
  "api",
  {
    getApps: () => electron.ipcRenderer.invoke("get-apps"),
    loadApp: (id) => electron.ipcRenderer.invoke("load-app", id),
    changeAppsDirectory: () => electron.ipcRenderer.invoke("change-apps-directory"),
    reloadApps: () => electron.ipcRenderer.invoke("reload-apps"),
    findMatchingApps: (filePath) => electron.ipcRenderer.invoke("find-matching-apps", filePath),
    backupFile: (filePath) => electron.ipcRenderer.invoke("backup-file", filePath),
    // Launch standalone apps
    launchStandaloneApp: (id) => electron.ipcRenderer.invoke("launch-standalone-app", id),
    // Startup app management
    getStartupApps: () => electron.ipcRenderer.invoke("get-startup-apps"),
    setStartupApp: (appId, config) => electron.ipcRenderer.invoke("set-startup-app", appId, config),
    removeStartupApp: (appId) => electron.ipcRenderer.invoke("remove-startup-app", appId),
    // Listen for startup app launch events from main process
    onLaunchStartupApp: (callback) => electron.ipcRenderer.on("launch-startup-app", callback),
    removeStartupAppListeners: () => electron.ipcRenderer.removeAllListeners("launch-startup-app")
  }
);
