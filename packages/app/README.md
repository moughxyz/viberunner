# Viberunner - Build personal desktop apps in seconds

Viberunner is a new and unique way to experience your desktop. Instead of searching, sifting, and purchasing single-purpose desktop apps for every use case, you can now dream up your own collection of personal desktop apps in seconds!

You can make anything from your own personal note-taking app, to system utilities that let you manage your desktop and resources.

With Viberunner, you can dream and run apps like this in seconds:

- A personal note-taking app which saves every note to a file
- A todo tracker organized by day
- A realtime clipboard manager
- A mouse jiggler that moves your mouse every X seconds
- An image redactor that allows you to draw over an image to redact sensitive information
- ...and anything else you can dream up!

Viberunner is a powerful runtime container for your vibe-coded apps. It allows you to manage and run several React-based utilities and apps on your desktop, with powerful matchers to select the right app based on the context.

Viberunner is a single-player playground meant to be used by one person on their own computer. It's not a way to ship your product to your users.

## How it works

1. When you launch Viberunner, you'll see a prompt asking you what you want to build. Say as little or as much as possible. You can just say "stopwatch" and Viberunner will run with it.
2. Viberunner apps ("runners") are just regular React apps which have deep system access (Node, Python; anything a terminal can do, your runner can do).
3. You can choose to launch a runner in one of three ways:
   1. As a new tab in the main Viberunner app
   2. As a separate app with its own dock icon
   3. As a menu bar application (system menu bar/tray where your clock and wifi icon are)
4. Just click Launch!

**Important:** Viberunner gives unrestricted system access to your apps. You should be comfortable with AI/LLM input before using Viberunner.

## Pricing

Viberunner is free during public alpha, but may be monetized in the future to support its development.

## 🎨 Key Features

- **📱 Chrome-style Tabbed Interface**: Open multiple files and apps simultaneously with smooth tab switching
- **🎨 Enhanced File Matching**: Go beyond MIME types with filename patterns, content analysis, and priority-based selection
- **⚙️ User Preferences System**: Runners can store and retrieve user preferences with a powerful API
- **🔧 Direct Node.js Access**: Runners have full access to Node.js APIs for maximum flexibility and performance
- **🌙 Modern Dark UI**: Beautiful glassmorphism interface with smooth animations and native tab styling
- **⚛️ React-Based Runners**: Build components using React 18+ with TypeScript support
- **🔄 Hot Reloading**: Instant runner updates during development
- **📂 File Interaction**: Read, analyze, and even modify files with user permission
- **🎯 Priority System**: Ensure the most specific runner wins for each file
- **🚀 Standalone Runners**: Create utility apps that don't require file input
- **🔒 Runner Isolation**: Perfect CSS and JavaScript isolation between tabs
- **🎭 Custom Runner Icons**: Personalize your apps with custom icons
- **🚀 Flexible Launch Modes**: Run apps as tabs, dock windows, or menu bar items

## 📚 Table of Contents

1. [Quick Start](#-quick-start)
2. [Runner Architecture](#-runner-architecture)
3. [Tabbed Interface](#-tabbed-interface)
4. [User Preferences System](#-user-preferences-system)
5. [Runner API - Direct Node.js Access](#-app -api---direct-nodejs-access)
6. [Enhanced Matching System](#-enhanced-matching-system)
7. [Creating Your First Runner](#-creating-your-first-runner)
8. [Configuration Reference](#-configuration-reference)
9. [Custom Runner Icons](#-custom-app-icons)
10. [Launch Modes](#-launch-modes)
11. [Component Development](#-component-development)
12. [File Analysis & APIs](#-file-analysis--apis)
13. [Advanced Examples](#-advanced-examples)
14. [Build & Distribution](#-build--distribution)
15. [Best Practices](#-best-practices)
16. [Troubleshooting](#-troubleshooting)
17. [Runner Cleanup API](#app-cleanup-api)

## 🎨 Custom Runner Icons

Viberunner supports custom icons for your runners, making them easily recognizable in the launcher and tabs.

### Adding Icons to Your Runner

1. **Add an icon file** to your runner directory (PNG, SVG, JPG, etc.)
2. **Reference it in package.json** using the `icon` field with a relative path

### Example Configuration

```json
{
  "name": "JSON Formatter",
  "description": "Pretty print and validate JSON files",
  "icon": "icon.png",
  "matchers": [
    {
      "type": "mimetype",
      "mimetype": "application/json",
      "priority": 60
    }
  ]
}
```

### Icon Guidelines

- **Recommended size**: 32x32 pixels (will be scaled automatically)
- **Supported formats**: PNG, SVG, JPG, GIF, WebP
- **File location**: Must be within your runner directory
- **Path**: Relative to your runner root (e.g., `"icon.png"`, `"assets/icon.svg"`)

### Where Icons Appear

Custom icons are displayed in:

- **Launcher**: Standalone app cards and file app listings
- **Tabs**: Tab icons for opened runners
- **Runner Selection**: When multiple apps match a file

### Fallback Behavior

If no custom icon is provided, Viberunner uses the Viberunner logo as the default icon for all apps. This provides a consistent and professional appearance while maintaining visual distinction through custom icons when available.

## 🚀 Launch Modes

### Overview

Viberunner supports three different launch modes that control how and where your runners appear when launched. This gives you flexibility in creating different types of applications that integrate with macOS in various ways.

### Available Launch Modes

#### 1. **New Tab** (`"newTab"`) - Default

- **Behavior**: Runner launches as a new tab in the main Viberunner window
- **Use Case**: Most common mode for file processors, viewers, and general utilities
- **Integration**: Fully integrated with Viberunner's tabbed interface
- **Examples**: JSON formatter, image viewer, text editor

#### 2. **Mac Dock** (`"macDock"`)

- **Behavior**: Launches as a separate window with its own dock icon
- **Use Case**: Independent applications that need to run alongside other apps
- **Integration**: Separate from main Viberunner window, appears in dock
- **Examples**: System monitor, standalone utilities, productivity apps

#### 3. **Mac Menu Bar** (`"macMenuBar"`)

- **Behavior**: Launches as an icon in the macOS system menu bar
- **Use Case**: Background utilities, system monitors, quick-access tools
- **Integration**: Minimal footprint, always accessible from menu bar
- **Examples**: Clipboard manager, system stats, quick notes

### Configuration

Set the launch mode in your runner's `package.json`:

```json
{
  "name": "My Runner",
  "description": "Example runner",
  "viberunner": {
    "launchMode": "newTab",
    "matchers": [
      {
        "type": "mimetype",
        "mimetype": "application/json",
        "priority": 60
      }
    ]
  }
}
```

### Launch Mode Examples

#### Tab-Based JSON Formatter

```json
{
  "name": "JSON Formatter",
  "description": "Format and validate JSON files",
  "viberunner": {
    "launchMode": "newTab",
    "matchers": [
      {
        "type": "mimetype",
        "mimetype": "application/json",
        "priority": 60
      }
    ]
  }
}
```

#### Dock-Based System Monitor

```json
{
  "name": "System Monitor",
  "description": "Real-time system performance monitoring",
  "viberunner": {
    "launchMode": "macDock",
    "standalone": true
  }
}
```

#### Menu Bar Clipboard Manager

```json
{
  "name": "Clipboard Manager",
  "description": "Track and manage clipboard history",
  "viberunner": {
    "launchMode": "macMenuBar",
    "standalone": true
  }
}
```

### Best Practices

1. **New Tab**: Use for file-based runners and utilities that benefit from tabbed organization
2. **Mac Dock**: Use for standalone applications that need persistent access and window management
3. **Mac Menu Bar**: Use for lightweight utilities that run in the background and need quick access

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Viberunner app installed

### Create a New Runner

```bash
# 1. Create runner directory
mkdir my-awesome-runner
cd my-awesome-runner

# 2. Initialize npm project
npm init -y

# 3. Install dependencies
npm install react react-dom
npm install -D @types/react @types/react-dom @vitejs/plugin-react typescript vite

# 4. Create required files
touch package.json tsconfig.json vite.config.ts src/App.tsx
```

### Basic File Structure

```
my-awesome-runner/
├── package.json          # NPM dependencies
├── tsconfig.json         # TypeScript config
├── icon.png              # Custom icon (32x32 recommended)
├── vite.config.ts        # Build configuration
├── src/
│   └── App.tsx           # Main React component
└── dist/
    └── bundle.iife.js    # Built output (generated)
```

## 🏗️ Runner Architecture

### How Runners Work

1. **File Drop**: User drops a file into Viberunner
2. **Analysis**: Viberunner analyzes the file (path, content, metadata)
3. **Matching**: Enhanced matcher system finds compatible runners
4. **Selection**: Best match or user selection if multiple options
5. **Loading**: Runner component is dynamically loaded
6. **Rendering**: React component renders with file data

### Data Flow

```
File Drop → File Analysis → Matcher Evaluation → Runner Selection → Component Loading → Rendering
```

## 📱 Tabbed Interface

### Overview

Viberunner features a Chrome-style tabbed interface that allows users to work with multiple files and applications simultaneously. Each tab maintains its own state and can switch between different apps seamlessly.

### Tab Management

#### **Opening New Tabs**

- **File Drop**: Dropping a file opens it in a new tab (or transforms the current "New Tab")
- **Standalone Runners**: Launching standalone apps creates dedicated tabs
- **New Tab Button**: Click the "+" button to create a new empty tab

#### **Tab Switching**

- **Click to Switch**: Click any tab to switch to it instantly
- **Visual Feedback**: Active tab is highlighted with proper visual hierarchy
- **Content Isolation**: Each tab maintains completely isolated content and state

#### **Tab Closing**

- **Close Button**: Hover over tabs to reveal the close button (✕)
- **Auto-cleanup**: Closing tabs automatically cleans up resources and React components
- **Last Tab Protection**: New tab is automatically created if you close the last tab

### Tab Types

1. **New Tab** 🌟

   - Clean interface for launching apps or dropping files
   - Shows directory controls and available apps
   - Transforms into a file/app tab when content is loaded

2. **File Tabs** 📄

   - Display file-based runners
   - Show filename and app name in tab title
   - Include close button for easy management

3. **Standalone Runner Tabs** ⚡
   - Run utility applications that don't require file input
   - Show app name and icon in tab title
   - Independent of file operations

### Visual Features

- **Chrome-style Design**: Native-looking tabs with proper shadows and gradients
- **Custom Icons**: Each tab displays the app's custom icon or Viberunner logo
- **Smooth Animations**: Fluid transitions when switching between tabs
- **Hover Effects**: Interactive feedback for better user experience
- **Active State**: Clear visual distinction for the currently active tab

### Developer Considerations

Cleanup:

```javascript
function MyRunner({ tabId, runnerId, fileInput }) {
  // Each tab has a unique tabId for cleanup registration
  React.useEffect(() => {
    const cleanup = () => {
      // Cleanup timers, listeners, etc.
    }

    // Register cleanup function for this tab
    window.registerCleanup(tabId, cleanup)

    return cleanup
  }, [tabId])

  return <div>Your app content</div>
}
```

## ⚙️ User Preferences System

### Overview

Viberunner provides a comprehensive user preferences system that allows apps to store and retrieve user settings persistently. Preferences are stored in each app's `package.json` file and survive between sessions.

### Storage Location

Preferences are automatically stored in your runner's configuration entry in package.json:

```json
{
  "viberunner": {
    "name": "My Awesome Runner",
    "description": "A great runner",
    "mimetypes": ["application/json"],
    "userPreferences": {
      "theme": "dark",
      "fontSize": 14,
      "autoSave": true,
      "recentFiles": ["file1.json", "file2.json"],
      "customSettings": {
        "nested": "values"
      }
    }
  }
}
```

### Basic API

Access preferences through the global `api` object:

```javascript
// Get all preferences for your app
const prefs = api.getRunnerPreferences(runnerId)

// Get a specific preference with default fallback
const theme = api.getRunnerPreference(runnerId, "theme", "light")

// Set a single preference
api.updateRunnerPreference(runnerId, "theme", "dark")

// Replace all preferences
api.setRunnerPreferences(runnerId, { theme: "dark", fontSize: 16 })

// Remove a preference
api.removeRunnerPreference(runnerId, "oldSetting")
```

### Enhanced Preferences Helper

For easier usage, create a preferences helper with your app ID:

```javascript
function MyRunner({ runnerId }) {
  // Create preferences helper
  const prefs = window.createPreferencesHelper(runnerId)

  // Type-safe getters with defaults
  const theme = prefs.getString("theme", "light")
  const fontSize = prefs.getNumber("fontSize", 12)
  const autoSave = prefs.getBoolean("autoSave", false)
  const settings = prefs.getObject("settings", {})

  // Simple setters
  const handleThemeChange = (newTheme) => {
    prefs.set("theme", newTheme)
  }

  return (
    <div className={`app-${theme}`}>
      <button onClick={() => handleThemeChange("dark")}>Dark Theme</button>
    </div>
  )
}
```

### Helper Methods

#### **Type-Safe Getters**

```javascript
const prefs = window.createPreferencesHelper(runnerId)

// String with default
const theme = prefs.getString("theme", "light")

// Number with default
const fontSize = prefs.getNumber("fontSize", 12)

// Boolean with default
const autoSave = prefs.getBoolean("autoSave", false)

// Object with default
const config = prefs.getObject("config", {})

// Array with default
const recentFiles = prefs.getArray("recentFiles", [])
```

#### **Array Operations**

```javascript
// Add item to array
prefs.pushToArray("recentFiles", "/path/to/new/file.json")

// Remove item from array
prefs.removeFromArray("recentFiles", "/path/to/old/file.json")

// Get array safely
const files = prefs.getArray("recentFiles", [])
```

#### **Bulk Operations**

```javascript
// Get all preferences
const allPrefs = prefs.getAll()

// Replace all preferences
prefs.setAll({
  theme: "dark",
  fontSize: 14,
  autoSave: true,
})

// Clear all preferences
prefs.clear()
```

### React Integration Examples

#### **Theme Persistence**

```javascript
function ThemedRunner({ runnerId }) {
  const prefs = window.createPreferencesHelper(runnerId)
  const [theme, setTheme] = React.useState(prefs.getString("theme", "light"))

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    prefs.set("theme", newTheme)
  }

  return (
    <div className={`app-${theme}`}>
      <button onClick={toggleTheme}>
        Switch to {theme === "light" ? "dark" : "light"} theme
      </button>
    </div>
  )
}
```

### Best Practices

1. **Use Type-Safe Getters**: Always use the appropriate getter method (`getString`, `getNumber`, etc.)
2. **Provide Defaults**: Always specify sensible default values
3. **Group Related Settings**: Use objects for complex configuration
4. **Validate Input**: Ensure preference values are valid before storing
5. **Performance**: Cache frequently accessed preferences in component state
6. **Error Handling**: The API includes built-in error handling and graceful fallbacks

### Error Handling

The preferences system includes robust error handling:

- **File Access Errors**: Returns empty object/default values if file can't be read
- **JSON Parse Errors**: Gracefully handles corrupted preference data
- **Write Errors**: Returns `false` for failed operations, `true` for success
- **Type Safety**: Helper methods ensure correct data types are returned

## 🚀 Runner API - Direct Node.js Access

### Overview

Runners have direct access to Node.js APIs instead of receiving pre-processed file content. This provides better performance, flexibility, and avoids data corruption issues.

### Runner Props

Your React component receives RunnerProps for component props:

````typescript
export interface FileInput {
  path: string
  mimetype: string
}

export interface RunnerProps {
  dataDirectory: string
  fileInput?: FileInput
}

### Available APIs

Runners have access to direct Node.js modules:

```javascript
// Path utilities
const dirname = path.dirname(filePath)
const basename = path.basename(filePath)
const extname = path.extname(filePath)

// MIME type detection
const mimeType = mime.lookup(filePath)

// Direct Node.js access
const fs = fs
const path = path
const customModule = require("some-module")
````

### Benefits

1. **No data corruption** - Direct file access eliminates base64 encoding issues
2. **Better performance** - Only read what you need, when you need it
3. **More flexibility** - Access entire filesystem, not just the dropped file
4. **Simpler code** - No need to handle multiple encoding formats
5. **Enhanced capabilities** - Can read config files, create temp files, etc.

### Example: Reading an Image

```javascript
// Read image directly when needed, no corruption risk
const imageBuffer = fs.readFileSync(fileInput.path)
const imageData = `data:${fileInput.mimetype};base64,${imageBuffer.toString(
  "base64"
)}`
```

## 🎯 Enhanced Matching System

### Matcher Types

The new matching system supports multiple criteria types with priority-based selection:

#### 1. **Filename Matching**

```json
{
  "type": "filename",
  "pattern": "package.json",
  "priority": 100
}
```

- **Exact match**: `"package.json"`
- **Glob patterns**: `"*.config.js"`, `"test-*.json"`
- **Wildcards**: `*` (any characters), `?` (single character)

#### 2. **Filename Substring Matching**

```json
{
  "type": "filename-contains",
  "substring": "kanban",
  "priority": 80
}
```

- **Substring matching**: Matches if filename contains the specified text
- **Case insensitive**: `"kanban"` matches `"Kanban"`, `"KANBAN"`, etc.
- **Optional extension filter**: Add `"extension"` to also check file extension
- **Examples**:
  - `"kanban"` matches: `foo-kanban.txt`, `my-kanban-board.json`, `kanban-data.csv`
  - `"config"` matches: `app.config.js`, `webpack-config.dev.js`, `my-config.yaml`

```json
{
  "type": "filename-contains",
  "substring": "kanban",
  "extension": "txt",
  "priority": 85
}
```

- **With extension**: Only matches files containing "kanban" AND having `.txt` extension
- **Extension formats**: Use `"txt"` or `".txt"` (both work the same)
- **Examples**:
  - ✅ Matches: `team-kanban.txt`, `my-kanban-board.txt`
  - ❌ Doesn't match: `team-kanban.json`, `kanban-data.csv`

#### 3. **Path Pattern Matching**

```json
{
  "type": "path-pattern",
  "pattern": "**/src/**/*.tsx",
  "priority": 80
}
```

- **Deep matching**: `**/package.json` (any depth)
- **Directory patterns**: `src/**/*.js`
- **Absolute paths**: `/Users/*/Desktop/*.md`

#### 4. **Content Analysis - JSON**

```json
{
  "type": "content-json",
  "requiredProperties": ["dependencies", "scripts"],
  "priority": 90
}
```

- **Property detection**: Must contain specific JSON properties
- **Nested properties**: `"dependencies.react"`
- **Array elements**: `"scripts[0]"`

#### 5. **Content Analysis - Regex**

```json
{
  "type": "content-regex",
  "regex": "^#!/usr/bin/env node",
  "priority": 70
}
```

- **Shebang detection**: Find Node.js scripts
- **Content patterns**: API keys, specific formats
- **Multi-line matching**: Use appropriate regex flags

#### 6. **File Size Filtering**

```json
{
  "type": "file-size",
  "minSize": 1048576,
  "maxSize": 104857600,
  "priority": 60
}
```

- **Size in bytes**: `minSize`, `maxSize`
- **Large file handling**: Different runners for different sizes
- **Memory optimization**: Skip content reading for huge files

#### 7. **Combined Matchers**

```json
{
  "type": "combined",
  "operator": "AND",
  "priority": 95,
  "conditions": [
    {
      "type": "mimetype",
      "mimetype": "application/json",
      "priority": 50
    },
    {
      "type": "filename",
      "pattern": "*.config.*",
      "priority": 50
    }
  ]
}
```

- **Logical operators**: `"AND"`, `"OR"`
- **Complex conditions**: Combine any matcher types
- **Nested logic**: Conditions can contain other combined matchers

#### 8. **Legacy MIME Type Support**

```json
{
  "type": "mimetype",
  "mimetype": "image/png",
  "priority": 50
}
```

- **Backward compatibility**: Still works with existing runners
- **Standard MIME types**: `image/*`, `text/*`, `application/*`
- **Lower priority**: Enhanced matchers take precedence

### Priority System

- **Higher numbers** = **higher priority**
- **Most specific match wins**
- **Suggested ranges**:
  - 90-100: Exact filename matches (`package.json`)
  - 70-89: Content-based matching with filename patterns
  - 50-69: MIME type or general content patterns
  - 30-49: Broad file size or extension patterns
  - 10-29: Fallback or experimental matchers

## 🛠️ Creating Your First Runner

Let's create a **JSON Formatter** runner step by step:

### 1. Create Configuration (`package.json`)

```json
{
  "name": "JSON Formatter",
  "description": "Pretty print and validate JSON files with syntax highlighting",
  "version": "1.0.0",
  "author": "Your Name",
  "viberunner": {
    "launchMode": "newTab",
    "icon": "icon.png",
    "matchers": [
      {
        "type": "mimetype",
        "mimetype": "application/json",
        "priority": 60
      },
      {
        "type": "filename",
        "pattern": "*.json",
        "priority": 70
      },
      {
        "type": "content-json",
        "requiredProperties": [],
        "priority": 50
      }
    ]
  }
}
```

### 2. Setup Build Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "classic", // Important: Use classic JSX runtime
    }),
  ],
  build: {
    lib: {
      entry: "src/App.tsx",
      name: "JsonFormatter",
      fileName: "bundle",
      formats: ["iife"],
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
})
```

### 3. TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react", // Important: Use classic JSX
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### 4. Create React Component (`src/App.tsx`)

```tsx
import React from "react"

const fs = require("fs")

interface FileData {
  path: string
  mimetype: string
}

interface JsonFormatterProps {
  fileData: FileData
}

const JsonFormatter: React.FC<JsonFormatterProps> = ({ fileData }) => {
  const [jsonData, setJsonData] = React.useState<any>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [formatted, setFormatted] = React.useState<string>("")

  React.useEffect(() => {
    try {
      // Try to parse the JSON content
      let content = fs.readFileSync(filePath)

      // Handle base64 encoded content
      if (
        fileData.mimetype === "application/json" &&
        !content.startsWith("{")
      ) {
        content = atob(content)
      }

      const parsed = JSON.parse(content)
      setJsonData(parsed)
      setFormatted(JSON.stringify(parsed, null, 2))
      setError(null)
    } catch (err) {
      setError(
        `Invalid JSON: ${err instanceof Error ? err.message : "Unknown error"}`
      )
    }
  }, [fileData])

  const handleSave = async () => {
    if (!formatted || error) return

    try {
      // Save the formatted JSON back to the original file
      fs.writeFileSync(fileData.path, formatted, "utf8")
      alert(`JSON saved successfully!`)
    } catch (err) {
      alert(`Error saving file: ${err}`)
    }
  }

  if (error) {
    return (
      <div style={{ padding: "20px", color: "#ef4444" }}>
        <h3>❌ JSON Parse Error</h3>
        <p>{error}</p>
        <pre
          style={{
            background: "#1e1e1e",
            padding: "10px",
            borderRadius: "4px",
            fontSize: "12px",
            overflow: "auto",
            maxHeight: "200px",
          }}
        >
          {fileData.content.slice(0, 1000)}...
        </pre>
      </div>
    )
  }

  return (
    <div style={{ padding: "20px", background: "#0a0a0a", color: "#fff" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h3>📄 JSON Formatter</h3>
        <button
          onClick={handleSave}
          style={{
            background: "#10b981",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "8px 16px",
            cursor: "pointer",
          }}
        >
          💾 Save Formatted
        </button>
      </div>

      <div
        style={{
          background: "#1e1e1e",
          borderRadius: "8px",
          padding: "15px",
          border: "1px solid #333",
        }}
      >
        <pre
          style={{
            margin: 0,
            fontSize: "14px",
            lineHeight: "1.5",
            overflow: "auto",
            maxHeight: "600px",
          }}
        >
          {formatted}
        </pre>
      </div>

      <div
        style={{
          marginTop: "15px",
          fontSize: "12px",
          color: "#888",
          display: "flex",
          gap: "20px",
        }}
      >
        <span>📁 {fileData.analysis?.filename || "Unknown"}</span>
        <span>
          📊{" "}
          {fileData.analysis?.size
            ? `${(fileData.analysis.size / 1024).toFixed(1)} KB`
            : "Unknown size"}
        </span>
        <span>🔍 {Object.keys(jsonData || {}).length} properties</span>
      </div>
    </div>
  )
}

// Export the component for Viberunner to load
export default JsonFormatter

// Global registration for IIFE bundle
if (typeof window !== "undefined" && (window as any).__RENDER_RUNNER__) {
  ;(window as any).__RENDER_RUNNER__(JsonFormatter)
}
```

### 5. Build the Runner

```bash
npm run build
```

This creates `dist/bundle.iife.js` that Viberunner can load.

## 📋 Configuration Reference

### Complete `package.json` `viberunner` entry Schema

```json
{
  // Launch mode - controls how the runner appears (required)
  "launchMode": "newTab | macDock | macMenuBar",

  "matchers": [
    {
      "type": "mimetype | filename | filename-contains | path-pattern | content-json | content-regex | file-size | combined",
      "priority": "number (required, 1-100)",

      // Type-specific properties
      "mimetype": "string (for mimetype)",
      "pattern": "string (for filename/path-pattern)",
      "substring": "string (for filename-contains)",
      "extension": "string (optional, for filename-contains)",
      "requiredProperties": ["string"] // (for content-json)
      "regex": "string (for content-regex)",
      "minSize": "number (for file-size)",
      "maxSize": "number (for file-size)",

      // Combined matcher properties
      "operator": "AND | OR (for combined)",
      "conditions": [
        // Array of other matchers
      ]
    }
  ],

  // Legacy support (optional)
  "mimetypes": ["string"],

  // Standalone runners (no file input required)
  "standalone": "boolean (optional)",

  // Custom icon (relative path to icon file in app directory)
  "icon": "string (optional)",
}
```

## 🚀 Standalone Runners

Viberunner supports standalone runners that don't require file input. These can be utilities, dashboards, or any application that operates independently.

### Configuration

To create a standalone runner, set `"standalone": true` in your `package.json` `viberunner` entry:

```json
{
  "standalone": true
}
```

### Component Interface

```typescript
const WeatherDashboard: React.FC<RunnerProps> = ({ fileData }) => {
  // fileData will be null - this is a standalone utility
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    // Fetch weather data using Node.js APIs
    const https = require("https")
    // ... make API calls, read config files, etc.
  }, [])

  return (
    <div style={{ padding: "20px" }}>
      <h2>🌤️ Weather Dashboard</h2>
      {/* Your utility UI here */}
    </div>
  )
}

export default WeatherDashboard
```

### Launching Standalone Runners

Standalone runners appear in the "Utilities" section of the sidebar with **Launch** buttons. They can:

- Access full Node.js APIs via `require()`
- Make HTTP requests to external services
- Read/write files and configurations
- Execute shell commands
- Create persistent data stores
- Build complex UI applications

This enables Viberunner to serve as a platform for any kind of utility or application, not just file runners!

## ⚛️ Component Development

### Available APIs

### Full Node.js Access

Runners have complete access to Node.js modules via `require()`:

```typescript
// File system operations
const fs = require("fs")
const content = fs.readFileSync("/path/to/file", "utf8")
fs.writeFileSync("/path/to/output.txt", "Hello World")

// Path utilities
const path = require("path")
const filename = path.basename("/foo/bar/baz.txt") // 'baz.txt'
const dir = path.dirname("/foo/bar/baz.txt") // '/foo/bar'

// Operating system info
const os = require("os")
const homeDir = os.homedir()
const platform = os.platform()

// Child processes
const { spawn, exec } = require("child_process")
const result = exec("ls -la", (error, stdout, stderr) => {
  console.log(stdout)
})

// Crypto operations
const crypto = require("crypto")
const hash = crypto.createHash("sha256").update("data").digest("hex")

// HTTP requests
const https = require("https")
// ... make API calls

// Any other Node.js module
const util = require("util")
const events = require("events")
// ... etc
```

### Dark Theme Integration

Use these CSS variables for consistent theming:

```css
:root {
  --bg-primary: #0a0a0a;
  --bg-secondary: #1a1a1a;
  --bg-card: #1e1e1e;
  --text-primary: #ffffff;
  --text-secondary: #b3b3b3;
  --text-muted: #808080;
  --accent-primary: #3b82f6;
  --border-color: #333333;
}
```

### Component Best Practices

```tsx
const MyRunner: React.FC<RunnerProps> = ({ fileData }) => {
  // 1. Use React hooks for state management
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // 2. Handle file analysis in useEffect
  useEffect(() => {
    const analyzeFile = async () => {
      try {
        setLoading(true)
        // Process fileData
        const processed = await processFile(fileData)
        setData(processed)
      } catch (error) {
        console.error("Error processing file:", error)
      } finally {
        setLoading(false)
      }
    }
    analyzeFile()
  }, [fileData])

  // 3. Handle loading states
  if (loading) {
    return <div className="loading">Processing file...</div>
  }

  // 4. Handle error states
  if (!data) {
    return <div className="error">Failed to process file</div>
  }

  // 5. Return your visualization
  return <div className="runner-container">{/* Your visualization here */}</div>
}
```

## 📊 Advanced Examples

### Example 1: Package.json Upgrader

```json
{
  "name": "Package Upgrader",
  "description": "Check and upgrade npm dependencies",
  "viberunner": {
    "matchers": [
      {
        "type": "filename",
        "pattern": "package.json",
        "priority": 100
      },
      {
        "type": "content-json",
        "requiredProperties": ["dependencies"],
        "priority": 80
      }
    ]
  }
}
```

### Example 2: Configuration File Analyzer

```json
{
  "name": "Config Analyzer",
  "description": "Analyze configuration files across different formats",
  "viberunner": {
    "matchers": [
      {
        "type": "combined",
        "operator": "OR",
        "priority": 85,
        "conditions": [
          {
            "type": "filename",
            "pattern": "*.config.js",
            "priority": 90
          },
          {
            "type": "filename",
            "pattern": "*.config.json",
            "priority": 90
          },
          {
            "type": "filename",
            "pattern": ".env*",
            "priority": 85
          }
        ]
      }
    ]
  }
}
```

### Example 3: Large File Handler

```json
{
  "name": "Large File Analyzer",
  "description": "Special handling for files larger than 100MB",
  "viberunner": {
    "matchers": [
      {
        "type": "file-size",
        "minSize": 104857600,
        "priority": 70
      }
    ]
  }
}
```

### Example 4: Node.js Script Detector

```json
{
  "name": "Node.js Script Runner",
  "description": "Detect and analyze Node.js scripts",
  "viberunner": {
    "matchers": [
      {
        "type": "content-regex",
        "regex": "^#!/usr/bin/env node",
        "priority": 95
      },
      {
        "type": "combined",
        "operator": "AND",
        "priority": 80,
        "conditions": [
          {
            "type": "filename",
            "pattern": "*.js",
            "priority": 50
          },
          {
            "type": "content-regex",
            "regex": "require\\(|import .* from",
            "priority": 50
          }
        ]
      }
    ]
  }
}
```

### Example 5: Kanban Board Runner

```json
{
  "name": "Kanban Board Runner",
  "description": "Visualize kanban boards from various file formats",
  "viberunner": {
    "matchers": [
      {
        "type": "filename-contains",
        "substring": "kanban",
        "extension": "txt",
        "priority": 90
      },
      {
        "type": "filename-contains",
        "substring": "kanban",
        "extension": "json",
        "priority": 85
      },
      {
        "type": "filename-contains",
        "substring": "board",
        "priority": 75
      },
      {
        "type": "combined",
        "operator": "AND",
        "priority": 80,
        "conditions": [
          {
            "type": "filename-contains",
            "substring": "project",
            "priority": 50
          },
          {
            "type": "mimetype",
            "mimetype": "application/json",
            "priority": 50
          }
        ]
      }
    ]
  }
}
```

This will match files like:

- `team-kanban.txt` ✅ (substring: "kanban", extension: ".txt", priority: 90)
- `my-kanban-data.json` ✅ (substring: "kanban", extension: ".json", priority: 85)
- `project-board.csv` ✅ (substring: "board", priority: 75)
- `team-kanban.csv` ❌ (contains "kanban" but wrong extension, doesn't contain "board")
- `my-project-data.json` ✅ (combined: contains "project" AND is JSON, priority: 80)
- `random-file.txt` ❌ (no matching substring)

## 🔧 Build & Distribution

### Development Workflow

```bash
# 1. Install dependencies
npm install

# 2. Development with hot reload
npm run dev

# 3. Build for production
npm run build

# 4. Test the built runner
# Copy to your runners directory and reload in Viberunner
```

### Required Build Output

Your build process **must** generate:

- `dist/bundle.iife.js` - IIFE format bundle
- The bundle must be self-contained
- External deps: `react` and `react-dom` (provided by Viberunner)

## ✅ Best Practices

### 1. Matcher Design

- **Be specific**: Higher priority for more specific matches
- **Use combinations**: Combine filename + content for precision
- **Fallback gracefully**: Include broader matchers with lower priority
- **Test edge cases**: Empty files, binary files, huge files

### 2. Performance

- **Lazy loading**: Don't process everything upfront
- **Memory conscious**: Handle large files appropriately
- **Async operations**: Use async/await for file operations
- **Error boundaries**: Wrap components in error handling

### 3. User Experience

- **Loading states**: Show progress for slow operations
- **Error handling**: Graceful degradation for corrupted files
- **Consistent styling**: Use the dark theme variables
- **Responsive design**: Work on different screen sizes

### 4. File Safety

- **Read-only by default**: Don't modify files without permission
- **Backup before save**: Consider file backup strategies
- **Validate input**: Check file integrity before processing
- **Limit scope**: Only access files explicitly dropped

### 5. Development

- **TypeScript**: Use strong typing for better development
- **Modular code**: Break complex runners into components
- **Testing**: Test with various file types and sizes
- **Documentation**: Comment complex logic

## 🐛 Troubleshooting

### Common Issues

#### "Module not found" Errors

```bash
# Ensure React is available globally
npm install react react-dom

# Check vite.config.ts external configuration
external: ['react', 'react-dom']
```

#### "Bundle not loading"

- Verify `dist/bundle.iife.js` exists
- Check console for JavaScript errors
- Ensure JSX runtime is set to 'classic'
- Verify global export is working

#### "Matcher not working"

- Check priority values (higher = more specific)
- Verify JSON syntax in package.json
- Test patterns with simple cases first
- Use console.log to debug file analysis

#### "Content not accessible"

- File might be binary (check mimetype)
- File might be too large (>10MB limit)
- Check file permissions
- Verify encoding (UTF-8 expected)

### Debug Tools

```tsx
// Add this to your component for debugging
const DebugInfo: React.FC<{ fileData: FileData }> = ({ fileData }) => (
  <details style={{ marginTop: "20px", fontSize: "12px" }}>
    <summary>🐛 Debug Info</summary>
    <pre style={{ background: "#1e1e1e", padding: "10px" }}>
      {JSON.stringify(fileData, null, 2)}
    </pre>
  </details>
)
```

### Getting Help

1. **Check console logs**: Both main process and renderer
2. **Verify file structure**: Ensure all required files exist
3. **Test incrementally**: Start simple, add complexity gradually
4. **Use debug runner**: Create a simple debug runner first

### Runner Cleanup API

**⚠️ Important:** Runners should register cleanup callbacks to prevent memory leaks and ensure proper resource management when tabs are closed.

#### Available Functions

```javascript
// Register a cleanup callback for the current tab
registerCleanup(tabId, cleanupFunction)
```

#### Basic Usage

```javascript
function MyRunner({ tabId }) {
  const [interval, setInterval] = useState(null)

  useEffect(() => {
    // Start some process
    const intervalId = setInterval(() => {
      console.log("Processing...")
    }, 1000)
    setInterval(intervalId)

    // Register cleanup callback
    registerCleanup(tabId, () => {
      console.log("Cleaning up interval")
      clearInterval(intervalId)
    })

    // Component cleanup (React unmount)
    return () => {
      clearInterval(intervalId)
    }
  }, [tabId])

  return <div>My Runner Content</div>
}
```

#### When Cleanup is Called

Cleanup callbacks are automatically executed when:

- A tab is closed by the user
- The application is shutting down
- A tab is being replaced (rare edge cases)

#### Best Practices

1. **Always register cleanup**: Even if you think your app doesn't need it
2. **Multiple callbacks**: Register separate callbacks for different types of cleanup
3. **Error handling**: Cleanup callbacks are wrapped in try-catch, but handle your own errors when possible
4. **Immediate cleanup**: Also implement React's `useEffect` cleanup for immediate component unmounting

---

## 🔧 System Command Execution & External Tool Detection

### Overview

Viberunner apps have full access to Node.js APIs, including the ability to execute system commands and detect external tools. However, robust execution requires careful error handling and proper command structure.

### Robust Command Execution

#### Use `spawn` for Better Reliability

When checking for external tools or executing commands, prefer `spawn` over `exec` for better error handling and output control:

```javascript
// ❌ Less reliable approach
const { exec } = require("child_process")
exec("python3 --version", (error, stdout, stderr) => {
  // Can fail due to shell quirks, output buffering, etc.
})

// ✅ More reliable approach
const { spawn } = require("child_process")
const pythonCheck = spawn("python3", ["--version"], { shell: true })

let output = ""
let error = ""

pythonCheck.stdout?.on("data", (data) => {
  output += data.toString()
})

pythonCheck.stderr?.on("data", (data) => {
  error += data.toString()
})

pythonCheck.on("close", (code) => {
  const isAvailable =
    code === 0 && (output.includes("Python 3") || error.includes("Python 3"))
  console.log("Python3 available:", isAvailable)
})

pythonCheck.on("error", (err) => {
  console.log("Python3 check failed:", err)
  // Handle gracefully
})
```

#### Multi-Stage Tool Detection

For complex tool detection (e.g., checking both the tool and its dependencies), use a multi-stage approach:

```javascript
const checkToolAvailability = (childProcess) => {
  const { spawn } = childProcess

  // Stage 1: Check if base tool exists
  const toolCheck = spawn("python3", ["--version"], { shell: true })

  toolCheck.on("close", (code) => {
    if (code === 0) {
      console.log("Python3 is available, checking dependencies...")
      checkToolDependencies(childProcess)
    } else {
      console.log("Python3 not available, using fallback approach")
      useFallbackApproach()
    }
  })

  toolCheck.on("error", (err) => {
    console.log("Tool check failed:", err)
    useFallbackApproach()
  })
}

const checkToolDependencies = (childProcess) => {
  const { spawn } = childProcess

  // Stage 2: Check if required modules/dependencies exist
  const depCheck = spawn(
    "python3",
    ["-c", 'import some_required_module; print("available")'],
    { shell: true }
  )

  let output = ""

  depCheck.stdout?.on("data", (data) => {
    output += data.toString()
  })

  depCheck.on("close", (code) => {
    if (code === 0 && output.includes("available")) {
      console.log("All dependencies available")
      enableFullFunctionality()
    } else {
      console.log("Dependencies missing, using limited functionality")
      useLimitedFunctionality()
    }
  })
}
```

### Platform-Specific Considerations

Handle platform differences gracefully:

```javascript
const getPlatformSpecificCommand = () => {
  const os = require("os")
  const platform = os.platform()

  switch (platform) {
    case "darwin": // macOS
      return ["python3", "--version"]
    case "win32": // Windows
      return ["python", "--version"] // Often just 'python' on Windows
    case "linux": // Linux
      return ["python3", "--version"]
    default:
      throw new Error(`Unsupported platform: ${platform}`)
  }
}

const checkCrossPlatform = () => {
  try {
    const [command, ...args] = getPlatformSpecificCommand()
    const check = spawn(command, args, { shell: true })
    // ... handle as above
  } catch (error) {
    console.error("Platform not supported:", error)
    // Use most basic fallback
  }
}
```

### Error Handling Best Practices

1. **Always handle both `error` and `close` events** for spawned processes
2. **Provide clear console logging** for debugging
3. **Implement progressive fallbacks** rather than hard failures
4. **Cache detection results** to avoid repeated expensive checks
5. **Handle edge cases** like command not found, permission denied, etc.

```javascript
const robustToolCheck = (toolName, args = ["--version"]) => {
  return new Promise((resolve) => {
    const { spawn } = require("child_process")

    const process = spawn(toolName, args, { shell: true })
    let output = ""
    let errorOutput = ""

    process.stdout?.on("data", (data) => {
      output += data.toString()
    })

    process.stderr?.on("data", (data) => {
      errorOutput += data.toString()
    })

    process.on("close", (code) => {
      resolve({
        available: code === 0,
        output,
        error: errorOutput,
        exitCode: code,
      })
    })

    process.on("error", (err) => {
      resolve({
        available: false,
        output: "",
        error: err.message,
        exitCode: -1,
      })
    })

    // Timeout protection
    setTimeout(() => {
      process.kill()
      resolve({
        available: false,
        output: "",
        error: "Command timeout",
        exitCode: -1,
      })
    }, 5000) // 5 second timeout
  })
}

// Usage
const checkTool = async () => {
  const result = await robustToolCheck("python3")

  if (result.available) {
    console.log("Tool available:", result.output)
  } else {
    console.log("Tool not available:", result.error)
  }
}
```

This approach ensures your Viberunner apps can reliably detect and work with external tools while providing graceful fallbacks when tools aren't available.

## 🎉 Conclusion

You now have everything needed to create powerful, sophisticated runners for Viberunner! The enhanced matching system allows for precise file targeting, while the React-based architecture provides a familiar development experience.

Start with simple runners and gradually add complexity. The priority-based matching ensures your runners activate exactly when they should, creating a seamless user experience.

Happy visualizing! 🚀
