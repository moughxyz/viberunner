import { contextBridge, ipcRenderer } from 'electron';

// Import Node.js modules using require
const path = require('path');
const fs = require('fs');
const os = require('os');

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
    reloadVisualizers: () => ipcRenderer.invoke('reload-visualizers')
  }
);

// Expose Node.js utilities for visualizers
contextBridge.exposeInMainWorld('nodeUtils', {
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
  Buffer: Buffer,

  // Safe file operations for visualizers
  saveFile: async (defaultName: string, content: string | Buffer) => {
    return ipcRenderer.invoke('save-file-dialog', { defaultName, content });
  },

  openFile: async (filters?: any[]) => {
    return ipcRenderer.invoke('open-file-dialog', { filters });
  }
});