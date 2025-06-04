const path = require("path")
const fs = require("fs")

// Constants
export const getRunnersDirectory = () => {
  // Use the hardcoded Runners directory
  try {
    const { app } = require("@electron/remote")
    const path = require("path")

    const runnersDir = path.join(app.getPath("userData"), "Runners")
    console.log("Using hardcoded Runners directory:", runnersDir)
    return runnersDir
  } catch (error) {
    console.warn("Could not access runner.getPath:", error)
    // Fallback for development or if remote is not available
    const userDataPath = require("os").homedir()
    const fallback = path.join(userDataPath, ".viberunner", "Runners")
    console.log("Using fallback Runners directory:", fallback)
    return fallback
  }
}

// Function to get Viberunner logo as data URL
export const getViberunnerLogoPath = (): string => {
  try {
    // Load SVG file and convert to data URL
    const svgPath = path.resolve(__dirname, "../assets/viberunner-logo.svg")
    if (fs.existsSync(svgPath)) {
      const svgContent = fs.readFileSync(svgPath, "utf8")
      return `data:image/svg+xml;base64,${btoa(svgContent)}`
    } else {
      // Try alternative path
      const altPath = path.resolve(
        process.cwd(),
        "src/assets/viberunner-logo.svg"
      )
      if (fs.existsSync(altPath)) {
        const svgContent = fs.readFileSync(altPath, "utf8")
        return `data:image/svg+xml;base64,${btoa(svgContent)}`
      }
      throw new Error("SVG file not found")
    }
  } catch (error) {
    console.warn("Failed to load Viberunner logo SVG, using fallback:", error)
    // Fallback to inline SVG if file loading fails
    const svg = `<svg width="24" height="24" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M5 50 H25 L35 20 L50 80 L65 20 L75 50 H95" stroke="white" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`
    return `data:image/svg+xml;base64,${btoa(svg)}`
  }
}

// Common runner loader interface
export interface RunnerLoaderOptions {
  container: HTMLElement
  appId: string
  props: any
  useGlobalReact?: boolean
  onSuccess?: (root: any) => void
  onError?: (error: Error) => void
}

// Common runner loader implementation
export const createRunnerLoader = (options: RunnerLoaderOptions) => {
  return (RunnerComponent: any) => {
    try {
      const { container, appId, props, useGlobalReact = false, onSuccess } = options

      // Create an isolation wrapper div
      const isolationWrapper = document.createElement("div")
      isolationWrapper.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        max-width: 100% !important;
        max-height: 100% !important;
        position: relative !important;
        overflow: auto !important;
        display: block !important;
        contain: layout style size !important;
        isolation: isolate !important;
        z-index: 1 !important;
      `

      container.appendChild(isolationWrapper)

      // Render directly into the isolation wrapper
      isolationWrapper.setAttribute("data-app-id", appId)

      // Choose React and createRoot based on useGlobalReact flag
      let React: any
      let createRoot: any

      if (useGlobalReact) {
        React = (window as any).React
        createRoot = (window as any).ReactDOM?.createRoot

        if (!React) {
          throw new Error("Global React not available")
        }
        if (!createRoot) {
          throw new Error("ReactDOM.createRoot not available globally")
        }
      } else {
        // Use imported React and createRoot
        React = require("react")
        createRoot = require("react-dom/client").createRoot
      }

      const root = createRoot(isolationWrapper)

      // Debug logging
      console.log("Rendering runner component:", {
        componentType: typeof RunnerComponent,
        componentName: RunnerComponent.name || "Anonymous",
        props: Object.keys(props),
        reactVersion: React.version,
        useGlobalReact
      })

      root.render(React.createElement(RunnerComponent, props))

      // Call success callback with the root
      if (onSuccess) {
        onSuccess(root)
      }

    } catch (error) {
      console.error("Error rendering runner:", error)
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)))
      }
    }
  }
}
