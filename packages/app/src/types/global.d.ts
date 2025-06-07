interface Window {
  api: {
    getApps: () => Promise<any[]>
    loadApp: (id: string) => Promise<any>
    getMimetype: (filePath: string) => Promise<string>
    handleFileDrop: (filePath: string) => Promise<any>
    changeAppsDirectory: () => Promise<{
      success: boolean
      directory: string | null
    }>
    reloadApps: () => Promise<{ success: boolean; apps: any[] }>
    findMatchingApps: (filePath: string) => Promise<{
      success: boolean
      matches: Array<{
        app: any
        priority: number
        matchReasons: string[]
      }>
      fileAnalysis: any
    }>
    launchStandaloneApp: (id: string) => Promise<any>
    // Icon loading for apps
    getAppIcon: (
      runnerId: string,
      iconPath: string
    ) => Promise<{
      success: boolean
      iconData?: string
      error?: string
    }>
    getAppVersion: () => Promise<{
      success: boolean
      version: string
    }>
    // Generic invoke method
    invoke: (channel: string, ...args: any[]) => Promise<any>
    // Node.js utilities
    nodeUtils: {
      fs: typeof import("fs")
      path: typeof import("path")
      os: typeof import("os")
    }
  }
}

// Vite raw imports
declare module "*?raw" {
  const content: string
  export default content
}
