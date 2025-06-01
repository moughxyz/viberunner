interface Window {
  api: {
    getApps: () => Promise<any[]>;
    loadApp: (id: string) => Promise<any>;
    getMimetype: (filePath: string) => Promise<string>;
    readFile: (filePath: string) => Promise<string>;
    handleFileDrop: (filePath: string) => Promise<any>;
    changeAppsDirectory: () => Promise<{ success: boolean; directory: string | null }>;
    reloadApps: () => Promise<{ success: boolean; apps: any[] }>;
    readDirectory: (dirPath: string) => Promise<{ success: boolean; files: any[]; error?: string }>;
    findMatchingApps: (filePath: string) => Promise<{
      success: boolean;
      matches: Array<{
        app: any;
        priority: number;
        matchReasons: string[];
      }>;
      fileAnalysis: any;
    }>;
    // File writing and backup operations
    writeFile: (filePath: string, content: string, encoding?: 'utf8' | 'base64') => Promise<{
      success: boolean;
      error?: string
    }>;
    saveFileDialog: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>
    }) => Promise<{
      success: boolean;
      filePath: string | null;
      canceled: boolean;
      error?: string
    }>;
    launchStandaloneApp: (id: string) => Promise<any>;
    // Icon loading for apps
    getAppIcon: (appId: string, iconPath: string) => Promise<{
      success: boolean;
      iconData?: string;
      error?: string;
    }>;
    // Node.js utilities
    nodeUtils: {
      fs: typeof import('fs');
      path: typeof import('path');
      os: typeof import('os');
    };
  };

  // Node.js globals available with nodeIntegration: true
  require: NodeRequire;
  module: NodeModule;
  exports: any;
  __dirname: string;
  __filename: string;
  global: NodeJS.Global;
  process: NodeJS.Process;
}