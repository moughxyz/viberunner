import React from "react"
import { FileInput, RunnerConfig, RunnerProps } from "../types"
import { createRunnerLoader, getRunnerUserDataDirectory } from "../util"
const fs = require("fs")

export async function renderRunner(params: {
  documentElement: Document
  container: HTMLElement
  runner: RunnerConfig
  tabId: string
  fileInput?: FileInput
  runnerData: { bundleContent: string }
  onSuccess: (
    reactRoot: React.ReactElement,
    wrapperElement: HTMLDivElement
  ) => void
  onError: (error: Error) => void
}) {
  const { runner, tabId, fileInput, runnerData } = params

  // Create DOM container
  const wrapper = document.createElement("div")
  wrapper.className = "tab-app-container"
  wrapper.style.position = "absolute"
  wrapper.style.top = "0"
  wrapper.style.left = "0"
  wrapper.style.right = "0"
  wrapper.style.bottom = "0"
  wrapper.style.width = "100%"
  wrapper.style.height = "100%"
  wrapper.style.display = "none" // Start hidden
  wrapper.style.visibility = "hidden"
  wrapper.style.zIndex = "-1"
  wrapper.style.opacity = "0"
  wrapper.style.background = "var(--background)"
  params.container.appendChild(wrapper)

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

    let processedBundleContent = runnerData.bundleContent

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
            cssContent.includes(`[data-app-id="${tabId}"]`)
          ) {
            return match
          }

          // Auto-scope CSS selectors
          const scopedCSS = cssContent
            // Scope universal selector
            .replace(/^\s*\*\s*\{/gm, `[data-app-id="${tabId}"] * {`)
            // Scope element selectors
            .replace(
              /^(\s*)([a-zA-Z][\w-]*)\s*\{/gm,
              `$1[data-app-id="${tabId}"] $2 {`
            )
            // Scope class selectors
            .replace(
              /^(\s*)(\.[\w-]+)\s*\{/gm,
              `$1[data-app-id="${tabId}"] $2 {`
            )
            // Scope ID selectors
            .replace(
              /^(\s*)(#[\w-]+)\s*\{/gm,
              `$1[data-app-id="${tabId}"] $2 {`
            )
            // Scope complex selectors
            .replace(
              /^(\s*)([.#]?[\w-]+(?:\s*[>+~]\s*[.#]?[\w-]+)*)\s*\{/gm,
              `$1[data-app-id="${tabId}"] $2 {`
            )
            // Handle @media queries
            .replace(
              /@media[^{]+\{([^{}]*(?:\{[^}]*\}[^{}]*)*)\}/g,
              (mediaMatch: string, mediaContent: string) => {
                const scopedMediaContent = mediaContent
                  .replace(/^\s*\*\s*\{/gm, `[data-app-id="${tabId}"] * {`)
                  .replace(
                    /^(\s*)([a-zA-Z][\w-]*)\s*\{/gm,
                    `$1[data-app-id="${tabId}"] $2 {`
                  )
                  .replace(
                    /^(\s*)(\.[\w-]+)\s*\{/gm,
                    `$1[data-app-id="${tabId}"] $2 {`
                  )
                  .replace(
                    /^(\s*)(#[\w-]+)\s*\{/gm,
                    `$1[data-app-id="${tabId}"] $2 {`
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

    // Also intercept any dynamic style injection
    const runnerStyleInterceptor = `
          // Intercept style injection for app isolation
          (function() {
            const originalCreateElement = document.createElement;
            const runnerId = "${tabId}";

            document.createElement = function(tagName) {
              const element = originalCreateElement.call(this, tagName);

              if (tagName.toLowerCase() === 'style') {
                // Mark style elements created by this app
                element.setAttribute('data-app-style', runnerId);

                // Override textContent to auto-scope CSS - with safety checks
                try {
                  const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'textContent') ||
                                   Object.getOwnPropertyDescriptor(Node.prototype, 'textContent') ||
                                   Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'textContent');

                  if (descriptor && descriptor.set) {
                    const originalTextContentSetter = descriptor.set;
                    Object.defineProperty(element, 'textContent', {
                      set: function(value) {
                        if (value && typeof value === 'string') {
                          // Auto-scope the CSS
                          const scopedCSS = value
                            .replace(/^\\s*\\*\\s*\\{/gm, \`[data-app-id="\${runnerId}"] * {\`)
                            .replace(/^(\\s*)([a-zA-Z][a-zA-Z0-9]*)\\s*\\{/gm, \`$1[data-app-id="\${runnerId}"] $2 {\`)
                            .replace(/^(\\s*)(\\.[\\w-]+)\\s*\\{/gm, \`$1[data-app-id="\${runnerId}"] $2 {\`)
                            .replace(/^(\\s*)(#[\\w-]+)\\s*\\{/gm, \`$1[data-app-id="\${runnerId}"] $2 {\`);
                          originalTextContentSetter.call(this, scopedCSS);
                        } else {
                          originalTextContentSetter.call(this, value);
                        }
                      },
                      get: descriptor.get,
                      enumerable: descriptor.enumerable,
                      configurable: descriptor.configurable
                    });
                  }
                } catch (err) {
                  console.warn('Failed to intercept textContent for app CSS scoping:', err);
                }
              }

              return element;
            };
          })();
        `

    script.textContent = runnerStyleInterceptor + "\n" + processedBundleContent

    const runnerLoader = createRunnerLoader({
      container: wrapper,
      appId: tabId,
      props: props,
      useGlobalReact: true,
      onSuccess: (reactRoot) => {
        params.onSuccess(reactRoot, wrapper)

        // Show the container with proper stacking
        wrapper.style.display = "block"
        wrapper.style.visibility = "visible"
        wrapper.style.zIndex = "10"
        wrapper.style.opacity = "1"

        resolve(true)
      },
      onError: (error) => {
        console.error("Error rendering app:", error)
        resolve(false)
      },
    })

    // Make the app loader available globally with backward compatibility
    ;(window as any).__RENDER_RUNNER__ = runnerLoader

    script.onload = () => {
      // Clean up after script loads
      setTimeout(() => {
        if (script.parentNode) {
          script.parentNode.removeChild(script)
        }
        delete (window as any).__RENDER_RUNNER__
      }, 1000)
    }

    script.onerror = (error) => {
      console.error("Script loading error:", error)
      resolve(false)
    }

    params.documentElement.head.appendChild(script)
  })
}
