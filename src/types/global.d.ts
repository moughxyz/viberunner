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
  };
}