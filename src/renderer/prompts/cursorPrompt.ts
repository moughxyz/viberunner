/**
 * This prompt will be copied into a user's App.tsx when they choose to eject a runner and edit directly
 * in Cursor. It will be placed as a top level comment in the App.tsx file so that Cursor knows how to build runners.
 */

export const getCursorPrompt = () => {
  return `
/**
 * LLM INSTRUCTIONS:
 *
 * This is a runner for Viberunner. It is built with React and Vite.
 *
 * Runners have full access to the file system, clipboard history, and other system APIs using Node.js.
 * Runners also have access to safe command execution APIs that work in both development and packaged apps.
 *
 * Runners are just React apps but focused on system utilities and single-purpose productivity flows.

 * There is no special API. Simply call __RENDER_RUNNER(yourReactComponent)__ at the end of this file.
 *
 * Your React component will receive the following props:
 *
 * interface RunnerProps {
 *  dataDirectory: string
 *  fileInput?: {
 *      path: string
 *      mimetype: string
 *   }
 *  tabId: string
 * }
 *
 * AVAILABLE APIs via window.api:
 *
 * // Execute shell commands safely (works in packaged apps)
 * const result = await window.api.executeCommand('git status')
 * const result = await window.api.executeCommandWithArgs('git', ['add', '.'])
 *
 * // Returns: { success: boolean, output: string, error?: string }
 *
 * // User preferences
 * window.api.getRunnerPreference(runnerId, key)
 * window.api.updateRunnerPreference(runnerId, key, value)
 *
 * See VIBERUNNER.md for more details.
 *
 * IMPORTANT: Always run \`npm run build\` after making changes to the project in order for the change to reflect in Viberunner.
 */`
}
