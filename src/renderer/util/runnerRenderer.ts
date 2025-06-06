import { FileInput, RunnerConfig, RunnerProps } from "../types"
import { getRunnerUserDataDirectory } from "../util"
const fs = require("fs")

export async function renderRunner(
  container: HTMLElement,
  params: {
    runner: RunnerConfig
    tabId: string
    fileInput?: FileInput
  }
) {
  const { runner, tabId, fileInput } = params

  // Create DOM container
  const rootElement = document.createElement("div")
  rootElement.className = "tab-app-container"
  rootElement.style.position = "absolute"
  rootElement.style.top = "0"
  rootElement.style.left = "0"
  rootElement.style.right = "0"
  rootElement.style.bottom = "0"
  rootElement.style.width = "100%"
  rootElement.style.height = "100%"
  rootElement.style.display = "none" // Start hidden
  rootElement.style.visibility = "hidden"
  rootElement.style.zIndex = "-1"
  rootElement.style.opacity = "0"
  rootElement.style.background = "var(--background)"
  container.appendChild(rootElement)

  // Create data directory for the runner
  const dataDirectory = getRunnerUserDataDirectory(runner.id)

  // Ensure data directory exists
  try {
    if (!fs.existsSync(dataDirectory)) {
      fs.mkdirSync(dataDirectory, { recursive: true })
      console.log(`Created data directory: ${dataDirectory}`)
    }
  } catch (error) {
    console.error(`Failed to create data directory for ${runner.id}:`, error)
  }

  // Prepare props with cleanup support
  const props: RunnerProps = {
    dataDirectory: dataDirectory,
    fileInput: fileInput, // This will be undefined for standalone runners
    tabId: tabId,
  }

  return new Promise<boolean>((resolve) => {
    // Create script and load runner
    const script = document.createElement("script")
    script.type = "text/javascript"

    let processedBundleContent = tab.runnerData.bundleContent

    // Safe CSS scoping - only process strings that are clearly CSS
    // Use conservative patterns to avoid corrupting JavaScript code
    const safeCssPatterns = [
      // Match .css file imports/requires
      /(['"`])([^'"`]*\.css[^'"`]*)\1/g,

      // Match strings that clearly look like CSS (contain CSS selectors + rules)
      // Only match if it contains CSS selector patterns AND CSS properties
      /(['"`])([^'"`]*(?:\.[\w-]+|#[\w-]+|[a-zA-Z][\w-]*)\s*\{[^}]*(?:color|background|margin|padding|font|border|width|height|display|position)[^}]*\}[^'"`]*)\1/g,

      // Match template literals that contain CSS (tagged templates like css`...`)
      /css\s*`([^`]*(?:\.[\w-]+|#[\w-]+|[a-zA-Z][\w-]*)\s*\{[^}]*\}[^`]*)`/g,

      // Match styled-components or similar CSS-in-JS patterns
      /styled\.[a-zA-Z]+\s*`([^`]*(?:\.[\w-]+|#[\w-]+|[a-zA-Z][\w-]*)\s*\{[^}]*\}[^`]*)`/g,
    ]

    safeCssPatterns.forEach((pattern, index) => {
      processedBundleContent = processedBundleContent.replace(
        pattern,
        (match: string, ...args: string[]) => {
          // Extract CSS content based on pattern type
          let cssContent: string
          let quote: string = ""

          if (index <= 1) {
            // Standard quoted strings
            quote = args[0]
            cssContent = args[1]
          } else {
            // Template literals (css`` or styled.div``)
            cssContent = args[0]
          }

          if (!cssContent) return match

          // Additional safety check - skip if this looks like JavaScript
          if (
            cssContent.includes("export") ||
            cssContent.includes("import") ||
            cssContent.includes("function") ||
            cssContent.includes("const ") ||
            cssContent.includes("let ") ||
            cssContent.includes("var ") ||
            cssContent.includes("=>") ||
            cssContent.includes("return")
          ) {
            return match // Don't process JavaScript code
          }

          // Don't process if already scoped
          if (
            cssContent.includes(".tab-app-container") ||
            cssContent.includes(`[data-app-id="${tab.id}"]`)
          ) {
            return match
          }

          // Auto-scope CSS selectors
          const scopedCSS = cssContent
            // Scope universal selector
            .replace(/^\s*\*\s*\{/gm, `[data-app-id="${tab.id}"] * {`)
            // Scope element selectors
            .replace(
              /^(\s*)([a-zA-Z][\w-]*)\s*\{/gm,
              `$1[data-app-id="${tab.id}"] $2 {`
            )
            // Scope class selectors
            .replace(
              /^(\s*)(\.[\w-]+)\s*\{/gm,
              `$1[data-app-id="${tab.id}"] $2 {`
            )
            // Scope ID selectors
            .replace(
              /^(\s*)(#[\w-]+)\s*\{/gm,
              `$1[data-app-id="${tab.id}"] $2 {`
            )
            // Scope complex selectors
            .replace(
              /^(\s*)([.#]?[\w-]+(?:\s*[>+~]\s*[.#]?[\w-]+)*)\s*\{/gm,
              `$1[data-app-id="${tab.id}"] $2 {`
            )
            // Handle @media queries
            .replace(
              /@media[^{]+\{([^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g,
              (mediaMatch: string, mediaContent: string) => {
                const scopedMediaContent = mediaContent
                  .replace(/^\s*\*\s*\{/gm, `[data-app-id="${tab.id}"] * {`)
                  .replace(
                    /^(\s*)([a-zA-Z][\w-]*)\s*\{/gm,
                    `$1[data-app-id="${tab.id}"] $2 {`
                  )
                  .replace(
                    /^(\s*)(\.[\w-]+)\s*\{/gm,
                    `$1[data-app-id="${tab.id}"] $2 {`
                  )
                  .replace(
                    /^(\s*)(#[\w-]+)\s*\{/gm,
                    `$1[data-app-id="${tab.id}"] $2 {`
                  )
                return mediaMatch.replace(mediaContent, scopedMediaContent)
              }
            )

          // Return with appropriate wrapper
          if (index <= 1) {
            return quote ? `${quote}${scopedCSS}${quote}` : scopedCSS
          } else {
            // Template literals
            return match.replace(cssContent, scopedCSS)
          }
        }
      )
    })

}
