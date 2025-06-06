import { getRunnersDirectory } from "./util"
const path = require("path")
const fs = require("fs")

// User Preferences API for runners
export function getRunnerPreferences(runnerId: string) {
  try {
    const RUNNERS_DIR = getRunnersDirectory()
    const runnerPath = path.join(RUNNERS_DIR, runnerId)
    const packageJsonPath = path.join(runnerPath, "package.json")

    if (!fs.existsSync(packageJsonPath)) {
      console.warn(`No package.json found for app ${runnerId}`)
      return {}
    }

    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8")
    const packageJson = JSON.parse(packageJsonContent)

    return packageJson.viberunner.userPreferences || {}
  } catch (error) {
    console.error(`Failed to read preferences for app ${runnerId}:`, error)
    return {}
  }
}

export function setRunnerPreferences(runnerId: string, preferences: any) {
  try {
    const RUNNERS_DIR = getRunnersDirectory()
    const runnerPath = path.join(RUNNERS_DIR, runnerId)
    const packageJsonPath = path.join(runnerPath, "package.json")

    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`No package.json found for app ${runnerId}`)
    }

    // Read current metadata
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8")
    const packageJson = JSON.parse(packageJsonContent)

    // Update preferences
    packageJson.viberunner.userPreferences = preferences

    // Write back to file with pretty formatting
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      "utf8"
    )

    console.log(`Updated preferences for app ${runnerId}`)
    return true
  } catch (error) {
    console.error(`Failed to write preferences for app ${runnerId}:`, error)
    return false
  }
}

export function updateRunnerPreference(runnerId: string, key: string, value: any) {
  try {
    const currentPreferences = getRunnerPreferences(runnerId)
    const updatedPreferences = { ...currentPreferences, [key]: value }
    return setRunnerPreferences(runnerId, updatedPreferences)
  } catch (error) {
    console.error(
      `Failed to update preference ${key} for app ${runnerId}:`,
      error
    )
    return false
  }
}

export function removeRunnerPreference(runnerId: string, key: string) {
  try {
    const currentPreferences = getRunnerPreferences(runnerId)
    const updatedPreferences = { ...currentPreferences }
    delete updatedPreferences[key]
    return setRunnerPreferences(runnerId, updatedPreferences)
  } catch (error) {
    console.error(
      `Failed to remove preference ${key} for app ${runnerId}:`,
      error
    )
    return false
  }
}

export function getRunnerPreference(
  runnerId: string,
  key: string,
  defaultValue: any = null
) {
  try {
    const preferences = getRunnerPreferences(runnerId)
    return Object.prototype.hasOwnProperty.call(preferences, key)
      ? preferences[key]
      : defaultValue
  } catch (error) {
    console.error(`Failed to get preference ${key} for app ${runnerId}:`, error)
    return defaultValue
  }
}

// Enhanced preferences helper for easier app usage
// eslint-disable-next-line no-extra-semi
;(window as any).createPreferencesHelper = (runnerId: string) => {
  return {
    get: (key: string, defaultValue: any = null) =>
      getRunnerPreference(runnerId, key, defaultValue),
    set: (key: string, value: any) => updateRunnerPreference(runnerId, key, value),
    remove: (key: string) => removeRunnerPreference(runnerId, key),
    getAll: () => getRunnerPreferences(runnerId),
    setAll: (preferences: Record<string, any>) =>
      setRunnerPreferences(runnerId, preferences),
    clear: () => setRunnerPreferences(runnerId, {}),

    // Convenience methods for common data types
    getString: (key: string, defaultValue: string = "") => {
      const value = getRunnerPreference(runnerId, key, defaultValue)
      return typeof value === "string" ? value : defaultValue
    },
    getNumber: (key: string, defaultValue: number = 0) => {
      const value = getRunnerPreference(runnerId, key, defaultValue)
      return typeof value === "number" ? value : defaultValue
    },
    getBoolean: (key: string, defaultValue: boolean = false) => {
      const value = getRunnerPreference(runnerId, key, defaultValue)
      return typeof value === "boolean" ? value : defaultValue
    },
    getObject: (key: string, defaultValue: any = {}) => {
      const value = getRunnerPreference(runnerId, key, defaultValue)
      return typeof value === "object" && value !== null ? value : defaultValue
    },

    // Array helpers
    getArray: (key: string, defaultValue: any[] = []) => {
      const value = getRunnerPreference(runnerId, key, defaultValue)
      return Array.isArray(value) ? value : defaultValue
    },
    pushToArray: (key: string, item: any) => {
      const currentArray = getRunnerPreference(runnerId, key, [])
      const newArray = Array.isArray(currentArray)
        ? [...currentArray, item]
        : [item]
      return updateRunnerPreference(runnerId, key, newArray)
    },
    removeFromArray: (key: string, item: any) => {
      const currentArray = getRunnerPreference(runnerId, key, [])
      if (Array.isArray(currentArray)) {
        const newArray = currentArray.filter((existing) => existing !== item)
        return updateRunnerPreference(runnerId, key, newArray)
      }
      return false
    },
  }
}
