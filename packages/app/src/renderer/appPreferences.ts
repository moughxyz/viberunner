const path = require("path")
const fs = require("fs")

/**
 * localStorage doesn't work well with multiple Electron processes: https://github.com/electron/electron/issues/24441
 *
 * This file provides a global appPreferences object that can be used to store and retrieve preferences.
 * It is similar to localStorage but is designed to work with multiple Electron processes.
 * Uses in-memory caching with debounced disk writes for optimal performance.
 */

// In-memory cache and state management
let preferencesCache: Record<string, any> | null = null
let isDirty = false
let writeTimeoutId: NodeJS.Timeout | null = null
const WRITE_DEBOUNCE_MS = 5000 // 5 seconds

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

function readPreferencesFromDisk(): Record<string, any> {
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

function writePreferencesToDisk(preferences: Record<string, any>): boolean {
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

// Initialize cache if not already loaded
function ensureCacheLoaded(): Record<string, any> {
  if (preferencesCache === null) {
    preferencesCache = readPreferencesFromDisk()
    console.log("Loaded preferences cache from disk")
  }
  return preferencesCache
}

// Schedule a debounced write to disk
function scheduleDebouncedWrite(): void {
  if (!isDirty) return

  // Clear existing timeout
  if (writeTimeoutId) {
    clearTimeout(writeTimeoutId)
  }

  // Schedule new write
  writeTimeoutId = setTimeout(() => {
    if (isDirty && preferencesCache) {
      const success = writePreferencesToDisk(preferencesCache)
      if (success) {
        isDirty = false
        console.log("Preferences written to disk")
      }
    }
    writeTimeoutId = null
  }, WRITE_DEBOUNCE_MS)
}

// Mark cache as dirty and schedule write
function markDirtyAndScheduleWrite(): void {
  isDirty = true
  scheduleDebouncedWrite()
}

// Force immediate write (useful for app shutdown)
function flushToDisk(): boolean {
  if (writeTimeoutId) {
    clearTimeout(writeTimeoutId)
    writeTimeoutId = null
  }

  if (isDirty && preferencesCache) {
    const success = writePreferencesToDisk(preferencesCache)
    if (success) {
      isDirty = false
    }
    return success
  }
  return true // No changes to write
}

// Core preference functions
export function getAppPreferences(): Record<string, any> {
  return { ...ensureCacheLoaded() } // Return a copy to prevent external mutation
}

export function setAppPreferences(preferences: Record<string, any>): boolean {
  try {
    preferencesCache = { ...preferences }
    markDirtyAndScheduleWrite()
    return true
  } catch (error) {
    console.error("Failed to set app preferences:", error)
    return false
  }
}

export function getAppPreference(key: string, defaultValue: any = null): any {
  try {
    const cache = ensureCacheLoaded()
    return Object.prototype.hasOwnProperty.call(cache, key)
      ? cache[key]
      : defaultValue
  } catch (error) {
    console.error(`Failed to get app preference ${key}:`, error)
    return defaultValue
  }
}

export function setAppPreference(key: string, value: any): boolean {
  try {
    const cache = ensureCacheLoaded()
    cache[key] = value
    markDirtyAndScheduleWrite()
    return true
  } catch (error) {
    console.error(`Failed to set app preference ${key}:`, error)
    return false
  }
}

export function removeAppPreference(key: string): boolean {
  try {
    const cache = ensureCacheLoaded()
    delete cache[key]
    markDirtyAndScheduleWrite()
    return true
  } catch (error) {
    console.error(`Failed to remove app preference ${key}:`, error)
    return false
  }
}

export function clearAppPreferences(): boolean {
  try {
    preferencesCache = {}
    markDirtyAndScheduleWrite()
    return true
  } catch (error) {
    console.error("Failed to clear app preferences:", error)
    return false
  }
}

// Export flush function for manual control (e.g., before app shutdown)
export function flushPreferencesToDisk(): boolean {
  return flushToDisk()
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
    const cache = ensureCacheLoaded()
    const keys = Object.keys(cache)
    return index >= 0 && index < keys.length ? keys[index] : null
  },

  get length(): number {
    return Object.keys(ensureCacheLoaded()).length
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
    const cache = ensureCacheLoaded()
    return Object.prototype.hasOwnProperty.call(cache, key)
  },

  keys: (): string[] => {
    return Object.keys(ensureCacheLoaded())
  },

  values: (): any[] => {
    return Object.values(ensureCacheLoaded())
  },

  entries: (): [string, any][] => {
    return Object.entries(ensureCacheLoaded())
  },

  // Bulk operations
  setMultiple: (items: Record<string, any>): boolean => {
    try {
      const cache = ensureCacheLoaded()
      Object.assign(cache, items)
      markDirtyAndScheduleWrite()
      return true
    } catch (error) {
      console.error("Failed to set multiple preferences:", error)
      return false
    }
  },

  removeMultiple: (keys: string[]): boolean => {
    try {
      const cache = ensureCacheLoaded()
      keys.forEach((key) => delete cache[key])
      markDirtyAndScheduleWrite()
      return true
    } catch (error) {
      console.error("Failed to remove multiple preferences:", error)
      return false
    }
  },

  // Performance and control methods
  flush: (): boolean => {
    return flushToDisk()
  },

  isDirty: (): boolean => {
    return isDirty
  },

  getCacheSize: (): number => {
    return preferencesCache ? Object.keys(preferencesCache).length : 0
  },
}

// Handle app shutdown - flush any pending changes
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    flushToDisk()
  })
}

(window as any).appPreferences = appPreferencesAPI

export default appPreferencesAPI
