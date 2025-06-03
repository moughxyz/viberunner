import { getRunnersDirectory } from "./util"
const path = require("path")
const fs = require("fs")

// User Preferences API for runners
export function getAppPreferences(runnerId: string) {
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

export function setAppPreferences(runnerId: string, preferences: any) {
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

export function updateAppPreference(runnerId: string, key: string, value: any) {
  try {
    const currentPreferences = getAppPreferences(runnerId)
    const updatedPreferences = { ...currentPreferences, [key]: value }
    return setAppPreferences(runnerId, updatedPreferences)
  } catch (error) {
    console.error(
      `Failed to update preference ${key} for app ${runnerId}:`,
      error
    )
    return false
  }
}

export function removeAppPreference(runnerId: string, key: string) {
  try {
    const currentPreferences = getAppPreferences(runnerId)
    const updatedPreferences = { ...currentPreferences }
    delete updatedPreferences[key]
    return setAppPreferences(runnerId, updatedPreferences)
  } catch (error) {
    console.error(
      `Failed to remove preference ${key} for app ${runnerId}:`,
      error
    )
    return false
  }
}

export function getAppPreference(
  runnerId: string,
  key: string,
  defaultValue: any = null
) {
  try {
    const preferences = getAppPreferences(runnerId)
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
      getAppPreference(runnerId, key, defaultValue),
    set: (key: string, value: any) => updateAppPreference(runnerId, key, value),
    remove: (key: string) => removeAppPreference(runnerId, key),
    getAll: () => getAppPreferences(runnerId),
    setAll: (preferences: Record<string, any>) =>
      setAppPreferences(runnerId, preferences),
    clear: () => setAppPreferences(runnerId, {}),

    // Convenience methods for common data types
    getString: (key: string, defaultValue: string = "") => {
      const value = getAppPreference(runnerId, key, defaultValue)
      return typeof value === "string" ? value : defaultValue
    },
    getNumber: (key: string, defaultValue: number = 0) => {
      const value = getAppPreference(runnerId, key, defaultValue)
      return typeof value === "number" ? value : defaultValue
    },
    getBoolean: (key: string, defaultValue: boolean = false) => {
      const value = getAppPreference(runnerId, key, defaultValue)
      return typeof value === "boolean" ? value : defaultValue
    },
    getObject: (key: string, defaultValue: any = {}) => {
      const value = getAppPreference(runnerId, key, defaultValue)
      return typeof value === "object" && value !== null ? value : defaultValue
    },

    // Array helpers
    getArray: (key: string, defaultValue: any[] = []) => {
      const value = getAppPreference(runnerId, key, defaultValue)
      return Array.isArray(value) ? value : defaultValue
    },
    pushToArray: (key: string, item: any) => {
      const currentArray = getAppPreference(runnerId, key, [])
      const newArray = Array.isArray(currentArray)
        ? [...currentArray, item]
        : [item]
      return updateAppPreference(runnerId, key, newArray)
    },
    removeFromArray: (key: string, item: any) => {
      const currentArray = getAppPreference(runnerId, key, [])
      if (Array.isArray(currentArray)) {
        const newArray = currentArray.filter((existing) => existing !== item)
        return updateAppPreference(runnerId, key, newArray)
      }
      return false
    },
  }
}
