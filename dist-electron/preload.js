"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld(
  "api",
  {
    getApps: () => electron.ipcRenderer.invoke("get-apps"),
    loadApp: (id) => electron.ipcRenderer.invoke("load-app", id),
    getMimetype: (filePath) => electron.ipcRenderer.invoke("get-mimetype", filePath),
    handleFileDrop: (filePath) => electron.ipcRenderer.invoke("handle-file-drop", filePath),
    changeAppsDirectory: () => electron.ipcRenderer.invoke("change-apps-directory"),
    reloadApps: () => electron.ipcRenderer.invoke("reload-apps"),
    findMatchingApps: (filePath) => electron.ipcRenderer.invoke("find-matching-apps", filePath),
    // Launch standalone apps
    launchStandaloneApp: (id) => electron.ipcRenderer.invoke("launch-standalone-app", id),
    // Startup app management
    getStartupApps: () => electron.ipcRenderer.invoke("get-startup-apps"),
    setStartupApp: (appId, config) => electron.ipcRenderer.invoke("set-startup-app", appId, config),
    removeStartupApp: (appId) => electron.ipcRenderer.invoke("remove-startup-app", appId),
    // Listen for startup app launch events from main process
    onLaunchStartupApp: (callback) => electron.ipcRenderer.on("launch-startup-app", callback),
    removeStartupAppListeners: () => electron.ipcRenderer.removeAllListeners("launch-startup-app"),
    // Autoupdate methods
    checkForUpdates: () => electron.ipcRenderer.invoke("check-for-updates"),
    downloadUpdate: () => electron.ipcRenderer.invoke("download-update"),
    quitAndInstall: () => electron.ipcRenderer.invoke("quit-and-install"),
    getAppVersion: () => electron.ipcRenderer.invoke("get-app-version"),
    // Generic invoke method for future extensions
    invoke: (channel, ...args) => electron.ipcRenderer.invoke(channel, ...args)
  }
);
