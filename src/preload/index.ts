import { contextBridge, ipcRenderer } from 'electron';

Expose protected methods that allow the renderer process to use
the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getApps: () => ipcRenderer.invoke('get-apps'),
    loadApp: (id: string) => ipcRenderer.invoke('load-app', id),
    getMimetype: (filePath: string) => ipcRenderer.invoke('get-mimetype', filePath),
    handleFileDrop: (filePath: string) => ipcRenderer.invoke('handle-file-drop', filePath),
    changeAppsDirectory: () => ipcRenderer.invoke('change-apps-directory'),
    reloadApps: () => ipcRenderer.invoke('reload-apps'),
    findMatchingApps: (filePath: string) => ipcRenderer.invoke('find-matching-apps', filePath),
    // Launch standalone apps
    launchStandaloneApp: (id: string) => ipcRenderer.invoke('launch-standalone-app', id),
    // Startup app management
    getStartupApps: () => ipcRenderer.invoke('get-startup-apps'),
    setStartupApp: (runnerId: string, config: { enabled: boolean; tabOrder: number }) =>
      ipcRenderer.invoke('set-startup-app', runnerId, config),
    removeStartupApp: (runnerId: string) => ipcRenderer.invoke('remove-startup-app', runnerId),
    // Listen for startup app launch events from main process
    onLaunchStartupApp: (callback: (event: any, data: { runnerId: string; config: any }) => void) =>
      ipcRenderer.on('launch-startup-app', callback),
    removeStartupAppListeners: () => ipcRenderer.removeAllListeners('launch-startup-app'),
    // Autoupdate methods
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    // Generic invoke method for future extensions
    invoke: (channel: string, ...args: any[]) => ipcRenderer.invoke(channel, ...args)
  }
);