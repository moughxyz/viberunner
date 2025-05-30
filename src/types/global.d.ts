interface Window {
  api: {
    getVisualizers: () => Promise<any[]>;
    loadVisualizer: (id: string) => Promise<any>;
    getMimetype: (filePath: string) => Promise<string>;
    readFile: (filePath: string) => Promise<string>;
    handleFileDrop: (filePath: string) => Promise<any>;
    getVisualizersDirectory: () => Promise<string | null>;
    changeVisualizersDirectory: () => Promise<any>;
    reloadVisualizers: () => Promise<any[]>;
  };

  nodeUtils: {
    fs: {
      readFileSync: (path: string, encoding?: string) => any;
      writeFileSync: (path: string, data: any, encoding?: string) => void;
      existsSync: (path: string) => boolean;
      mkdirSync: (path: string, options?: any) => void;
      readdirSync: (path: string) => string[];
      statSync: (path: string) => any;
    };
    path: {
      join: (...paths: string[]) => string;
      dirname: (path: string) => string;
      basename: (path: string, ext?: string) => string;
      extname: (path: string) => string;
      resolve: (...paths: string[]) => string;
    };
    os: {
      homedir: () => string;
      tmpdir: () => string;
      platform: () => string;
      arch: () => string;
    };
    Buffer: typeof Buffer;
    saveFile: (defaultName: string, content: string | Buffer) => Promise<any>;
    openFile: (filters?: any[]) => Promise<any>;
  };
}