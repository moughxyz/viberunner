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
 *    }
 *  }
 *
 * See VIBERUNNER.md for more details.
 */
  `
}
