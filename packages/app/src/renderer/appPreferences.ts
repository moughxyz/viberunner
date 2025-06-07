const path = require("path")
const fs = require("fs")

/**
 * localStorage doesn't work well with multiple Electron processes: https://github.com/electron/electron/issues/24441
 *
 * This file provides a global appPreferences object that can be used to store and retrieve preferences.
 * It is similar to localStorage but is designed to work with multiple Electron processes.
 *
 */

// App-level preferences for the parent viberunner application
function getAppDataDirectory() {
  try {
    const { app } = require("@electron/remote")
    const appDataDir = app.getPath("userData")
    console.log("Using app data directory:", appDataDir)
    return appDataDir
  } catch (error) {
    console.warn("Could not access app.getPath:", error)
    // Fallback for development or if remote is not available
    const userDataPath = require("os").homedir()
    const fallback = path.join(userDataPath, ".viberunner")
    console.log("Using fallback app data directory:", fallback)
    return fallback
  }
}

function getPreferencesFilePath() {
  const appDataDir = getAppDataDirectory()

  // Ensure directory exists
  if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true })
  }

  return path.join(appDataDir, "preferences.json")
}

function readPreferencesFile(): Record<string, any> {
  try {
    const preferencesPath = getPreferencesFilePath()

    if (!fs.existsSync(preferencesPath)) {
      return {}
    }

    const content = fs.readFileSync(preferencesPath, "utf8")
    return JSON.parse(content)
  } catch (error) {
    console.error("Failed to read app preferences:", error)
    return {}
  }
}

function writePreferencesFile(preferences: Record<string, any>): boolean {
  try {
    const preferencesPath = getPreferencesFilePath()
    fs.writeFileSync(
      preferencesPath,
      JSON.stringify(preferences, null, 2),
      "utf8"
    )
    return true
  } catch (error) {
    console.error("Failed to write app preferences:", error)
    return false
  }
}

// Core preference functions
export function getAppPreferences(): Record<string, any> {
  return readPreferencesFile()
}

export function setAppPreferences(preferences: Record<string, any>): boolean {
  return writePreferencesFile(preferences)
}

export function getAppPreference(key: string, defaultValue: any = null): any {
  try {
    const preferences = readPreferencesFile()
    return Object.prototype.hasOwnProperty.call(preferences, key)
      ? preferences[key]
      : defaultValue
  } catch (error) {
    console.error(`Failed to get app preference ${key}:`, error)
    return defaultValue
  }
}

export function setAppPreference(key: string, value: any): boolean {
  try {
    const currentPreferences = readPreferencesFile()
    const updatedPreferences = { ...currentPreferences, [key]: value }
    return writePreferencesFile(updatedPreferences)
  } catch (error) {
    console.error(`Failed to set app preference ${key}:`, error)
    return false
  }
}

export function removeAppPreference(key: string): boolean {
  try {
    const currentPreferences = readPreferencesFile()
    const updatedPreferences = { ...currentPreferences }
    delete updatedPreferences[key]
    return writePreferencesFile(updatedPreferences)
  } catch (error) {
    console.error(`Failed to remove app preference ${key}:`, error)
    return false
  }
}

export function clearAppPreferences(): boolean {
  return writePreferencesFile({})
}

const appPreferencesAPI = {
  getItem: (key: string): string | null => {
    const value = getAppPreference(key)
    return value !== null ? String(value) : null
  },

  setItem: (key: string, value: string): void => {
    setAppPreference(key, value)
  },

  removeItem: (key: string): void => {
    removeAppPreference(key)
  },

  clear: (): void => {
    clearAppPreferences()
  },

  key: (index: number): string | null => {
    const preferences = getAppPreferences()
    const keys = Object.keys(preferences)
    return index >= 0 && index < keys.length ? keys[index] : null
  },

  get length(): number {
    return Object.keys(getAppPreferences()).length
  },

  // Enhanced methods with type safety
  getString: (key: string, defaultValue: string = ""): string => {
    const value = getAppPreference(key, defaultValue)
    return typeof value === "string" ? value : defaultValue
  },

  getNumber: (key: string, defaultValue: number = 0): number => {
    const value = getAppPreference(key, defaultValue)
    return typeof value === "number" ? value : defaultValue
  },

  getBoolean: (key: string, defaultValue: boolean = false): boolean => {
    const value = getAppPreference(key, defaultValue)
    return typeof value === "boolean" ? value : defaultValue
  },

  getObject: <T = any>(key: string, defaultValue: T = {} as T): T => {
    const value = getAppPreference(key, defaultValue)
    return typeof value === "object" && value !== null ? value : defaultValue
  },

  getArray: <T = any>(key: string, defaultValue: T[] = []): T[] => {
    const value = getAppPreference(key, defaultValue)
    return Array.isArray(value) ? value : defaultValue
  },

  // Array helpers
  pushToArray: <T = any>(key: string, item: T): boolean => {
    const currentArray = getAppPreference(key, [])
    const newArray = Array.isArray(currentArray)
      ? [...currentArray, item]
      : [item]
    return setAppPreference(key, newArray)
  },

  removeFromArray: <T = any>(key: string, item: T): boolean => {
    const currentArray = getAppPreference(key, [])
    if (Array.isArray(currentArray)) {
      const newArray = currentArray.filter((existing) => existing !== item)
      return setAppPreference(key, newArray)
    }
    return false
  },

  // Object helpers
  setObjectProperty: (key: string, property: string, value: any): boolean => {
    const currentObject = getAppPreference(key, {})
    const updatedObject =
      typeof currentObject === "object" && currentObject !== null
        ? { ...currentObject, [property]: value }
        : { [property]: value }
    return setAppPreference(key, updatedObject)
  },

  removeObjectProperty: (key: string, property: string): boolean => {
    const currentObject = getAppPreference(key, {})
    if (typeof currentObject === "object" && currentObject !== null) {
      const updatedObject = { ...currentObject }
      delete updatedObject[property]
      return setAppPreference(key, updatedObject)
    }
    return false
  },

  // Utility methods
  has: (key: string): boolean => {
    const preferences = getAppPreferences()
    return Object.prototype.hasOwnProperty.call(preferences, key)
  },

  keys: (): string[] => {
    return Object.keys(getAppPreferences())
  },

  values: (): any[] => {
    return Object.values(getAppPreferences())
  },

  entries: (): [string, any][] => {
    return Object.entries(getAppPreferences())
  },

  // Bulk operations
  setMultiple: (items: Record<string, any>): boolean => {
    const currentPreferences = getAppPreferences()
    const updatedPreferences = { ...currentPreferences, ...items }
    return setAppPreferences(updatedPreferences)
  },

  removeMultiple: (keys: string[]): boolean => {
    const currentPreferences = getAppPreferences()
    const updatedPreferences = { ...currentPreferences }
    keys.forEach((key) => delete updatedPreferences[key])
    return setAppPreferences(updatedPreferences)
  },
}

;(window as any).appPreferences = appPreferencesAPI

export default appPreferencesAPI
