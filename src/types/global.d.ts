interface Window {
  api: {
    getVisualizers: () => Promise<any[]>;
    loadVisualizer: (id: string) => Promise<any>;
    getMimetype: (filePath: string) => Promise<string>;
    readFile: (filePath: string) => Promise<string>;
    handleFileDrop: (filePath: string) => Promise<any>;
    getVisualizersDirectory: () => Promise<string | null>;
    changeVisualizersDirectory: () => Promise<{ success: boolean; directory: string | null }>;
    reloadVisualizers: () => Promise<{ success: boolean; visualizers: any[] }>;
    readDirectory: (dirPath: string) => Promise<{ success: boolean; files: any[]; error?: string }>;
    findMatchingVisualizers: (filePath: string) => Promise<{
      success: boolean;
      matches: Array<{
        visualizer: any;
        priority: number;
        matchReasons: string[];
      }>;
      fileAnalysis: any;
      error?: string;
    }>;
    // File writing and backup operations
    writeFile: (filePath: string, content: string, encoding?: 'utf8' | 'base64') => Promise<{
      success: boolean;
      error?: string
    }>;
    backupFile: (filePath: string) => Promise<{
      success: boolean;
      backupPath?: string;
      error?: string
    }>;
    saveFileDialog: (options?: {
      title?: string;
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>
    }) => Promise<{
      success: boolean;
      filePath?: string | null;
      canceled: boolean;
      error?: string
    }>;
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