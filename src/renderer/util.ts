const path = require("path")

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
