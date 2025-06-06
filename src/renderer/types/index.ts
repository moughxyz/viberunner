export interface FileInput {
  path: string
  mimetype: string
}

export interface RunnerConfig {
  id: string
  name: string
  description: string
  version: string
  mimetypes: string[]
  author: string
  standalone?: boolean // Optional standalone property
  icon?: string // Custom icon path
  userPreferences?: Record<string, any> // User preferences storage
  matchers?: Array<{
    type: string
    mimetype?: string
    pattern?: string
    substring?: string
    extension?: string
  }>
}

export interface RunnerProps {
  dataDirectory: string
  fileInput?: FileInput // Optional file input for file-based runners
  tabId: string // Provided by Viberunner. Used to register cleanup functions.
}

export interface OpenTab {
  id: string
  runner?: RunnerConfig // Optional for new tab - represents the runner
  fileInput?: FileInput // undefined for standalone runners and new tab
  title: string
  type: "file" | "standalone" | "newtab" | "ai-agent"
  runnerData?: any // Store the loaded runner data for reloading
  reactRoot?: any // Store the React root for each tab
  domContainer?: HTMLDivElement // Store the DOM container for each tab
  prompt?: string // Optional prompt for AI agent tabs
  existingRunnerName?: string // Optional name of existing runner to edit
}