import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    getApps: () => ipcRenderer.invoke('get-apps'),
    loadApp: (id: string) => ipcRenderer.invoke('load-app', id),
    changeAppsDirectory: () => ipcRenderer.invoke('change-apps-directory'),
    reloadApps: () => ipcRenderer.invoke('reload-apps'),
    findMatchingApps: (filePath: string) => ipcRenderer.invoke('find-matching-apps', filePath),
    backupFile: (filePath: string) => ipcRenderer.invoke('backup-file', filePath),
    // Launch standalone apps
    launchStandaloneApp: (id: string) => ipcRenderer.invoke('launch-standalone-app', id),
    // Startup app management
    getStartupApps: () => ipcRenderer.invoke('get-startup-apps'),
    setStartupApp: (appId: string, config: { enabled: boolean; tabOrder: number }) =>
      ipcRenderer.invoke('set-startup-app', appId, config),
    removeStartupApp: (appId: string) => ipcRenderer.invoke('remove-startup-app', appId),
    // Listen for startup app launch events from main process
    onLaunchStartupApp: (callback: (event: any, data: { appId: string; config: any }) => void) =>
      ipcRenderer.on('launch-startup-app', callback),
    removeStartupAppListeners: () => ipcRenderer.removeAllListeners('launch-startup-app')
  }
);