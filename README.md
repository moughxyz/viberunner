# ⚡ Viberunner - Advanced File Visualizer Platform

Viberunner is a powerful Electron-based platform that allows developers to create custom visualizers for any type of file. With an advanced matching system that goes far beyond simple MIME types, you can create sophisticated file handlers that analyze content, file structure, and metadata to provide precise matching.

## 🌟 Key Features

- **Enhanced File Matching**: Go beyond MIME types with filename patterns, content analysis, and priority-based selection
- **Direct Node.js Access**: Frames have full access to Node.js APIs for maximum flexibility and performance
- **Modern Dark UI**: Beautiful glassmorphism interface with smooth animations
- **React-Based Visualizers**: Build components using React 18+ with TypeScript support
- **Hot Reloading**: Instant visualizer updates during development
- **File Interaction**: Read, analyze, and even modify files with user permission
- **Priority System**: Ensure the most specific visualizer wins for each file

## 📚 Table of Contents

1. [Quick Start](#-quick-start)
2. [Visualizer Architecture](#-visualizer-architecture)
3. [Frame API - Direct Node.js Access](#-frame-api---direct-nodejs-access)
4. [Enhanced Matching System](#-enhanced-matching-system)
5. [Creating Your First Visualizer](#-creating-your-first-visualizer)
6. [Configuration Reference](#-configuration-reference)
7. [Custom App Icons](#-custom-app-icons)
8. [Component Development](#-component-development)
9. [File Analysis & APIs](#-file-analysis--apis)
10. [Advanced Examples](#-advanced-examples)
11. [Build & Distribution](#-build--distribution)
12. [Best Practices](#-best-practices)
13. [Troubleshooting](#-troubleshooting)
14. [Frame Cleanup API](#frame-cleanup-api)

## 🎨 Custom App Icons

Viberunner supports custom icons for your visualizers, making them easily recognizable in the launcher and tabs.

### Adding Icons to Your Visualizer

1. **Add an icon file** to your visualizer directory (PNG, SVG, JPG, etc.)
2. **Reference it in viz.json** using the `icon` field with a relative path

### Example Configuration

```json
{
  "name": "JSON Formatter",
  "description": "Pretty print and validate JSON files",
  "version": "1.0.0",
  "author": "Your Name",
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

### File Structure with Icon

```
my-json-formatter/
├── viz.json              # Visualizer configuration
├── icon.png              # Custom icon (32x32 recommended)
├── package.json          # NPM dependencies
├── src/
│   └── App.tsx           # Main React component
└── dist/
    └── bundle.iife.js    # Built output
```

### Icon Guidelines

- **Recommended size**: 32x32 pixels (will be scaled automatically)
- **Supported formats**: PNG, SVG, JPG, GIF, WebP
- **File location**: Must be within your visualizer directory
- **Path**: Relative to your visualizer root (e.g., `"icon.png"`, `"assets/icon.svg"`)

### Where Icons Appear

Custom icons are displayed in:
- **Launcher**: Standalone app cards and file app listings
- **Tabs**: Tab icons for opened visualizers
- **App Selection**: When multiple apps match a file

### Fallback Behavior

If no custom icon is provided, Viberunner uses emoji fallbacks:
- **Standalone apps**: ⚡ (lightning bolt)
- **File visualizers**: 📄 (document)
- **New tabs**: ➕ (plus sign)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Viberunner app installed

### Create a New Visualizer

```bash
# 1. Create visualizer directory
mkdir my-awesome-visualizer
cd my-awesome-visualizer

# 2. Initialize npm project
npm init -y

# 3. Install dependencies
npm install react react-dom
npm install -D @types/react @types/react-dom @vitejs/plugin-react typescript vite

# 4. Create required files
touch viz.json tsconfig.json vite.config.ts src/App.tsx
```

### Basic File Structure
```
my-awesome-visualizer/
├── viz.json              # Visualizer configuration
├── package.json          # NPM dependencies
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Build configuration
├── src/
│   └── App.tsx           # Main React component
└── dist/
    └── bundle.iife.js    # Built output (generated)
```

## 🏗️ Visualizer Architecture

### How Visualizers Work

1. **File Drop**: User drops a file into Viberunner
2. **Analysis**: Viberunner analyzes the file (path, content, metadata)
3. **Matching**: Enhanced matcher system finds compatible visualizers
4. **Selection**: Best match or user selection if multiple options
5. **Loading**: Visualizer component is dynamically loaded
6. **Rendering**: React component renders with file data

### Data Flow

```
File Drop → File Analysis → Matcher Evaluation → Visualizer Selection → Component Loading → Rendering
```

## 🚀 Frame API - Direct Node.js Access

### Overview

Frames now have direct access to Node.js APIs instead of receiving pre-processed file content. This provides better performance, flexibility, and avoids data corruption issues.

### Frame Props

#### File-based Frames
```typescript
interface FrameProps {
  fileInput: {
    path: string;      // Full file path
    mimetype: string;  // Detected MIME type
  };
  container: HTMLElement; // Mount point

  // Legacy support (deprecated - use fileInput instead)
  fileData?: {
    path: string;
    mimetype: string;
    content: string;   // Empty - read files directly
    analysis: object;  // Minimal metadata
  };
}
```

#### Standalone Frames
```typescript
interface FrameProps {
  container: HTMLElement; // Mount point
}
```

### Available APIs

Frames have access to the global `api` object and direct Node.js modules:

```javascript
// File operations
const content = api.readFile(filePath, 'utf8');
api.writeFile(filePath, content);
const backupPath = api.backupFile(filePath);

// File system operations
const exists = api.exists(filePath);
const stats = api.stat(filePath);
const files = api.readDir(dirPath);

// Path utilities
const dirname = api.path.dirname(filePath);
const basename = api.path.basename(filePath);
const extname = api.path.extname(filePath);

// MIME type detection
const mimeType = api.mime.lookup(filePath);

// Direct Node.js access
const fs = api.fs;
const path = api.path;
const customModule = api.require('some-module');
```

### Migration Guide

#### Before (Legacy)
```javascript
const KanbanBoard = ({ fileData }) => {
  // Had to handle base64 decoding, etc.
  let content = fileData.content;
  if (!content.includes('\n') && content.length > 100) {
    content = atob(content); // Base64 decode
  }

  // Limited to pre-analyzed data
  const isLarge = fileData.analysis.size > 1000000;
};
```

#### After (Recommended)
```javascript
const KanbanBoard = ({ fileInput }) => {
  // Direct file access - much simpler!
  const content = api.readFile(fileInput.path, 'utf8');

  // Full control over file operations
  const stats = api.stat(fileInput.path);
  const isLarge = stats.size > 1000000;

  // Can read related files in same directory
  const dirname = api.path.dirname(fileInput.path);
  const relatedFiles = api.readDir(dirname);
};
```

### Benefits

1. **No data corruption** - Direct file access eliminates base64 encoding issues
2. **Better performance** - Only read what you need, when you need it
3. **More flexibility** - Access entire filesystem, not just the dropped file
4. **Simpler code** - No need to handle multiple encoding formats
5. **Enhanced capabilities** - Can read config files, create temp files, etc.

### Example: Reading an Image

#### Before
```javascript
// Image data was pre-encoded as base64, could be corrupted
const imageData = `data:${fileData.mimetype};base64,${fileData.content}`;
```

#### After
```javascript
// Read image directly when needed, no corruption risk
const imageBuffer = api.fs.readFileSync(fileInput.path);
const imageData = `data:${fileInput.mimetype};base64,${imageBuffer.toString('base64')}`;
```

### Backward Compatibility

For migration period, both `fileInput` (new) and `fileData` (legacy) props are provided. Use `fileInput.path` for all new development.

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
- **Large file handling**: Different visualizers for different sizes
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
- **Backward compatibility**: Still works with existing visualizers
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

## 🛠️ Creating Your First Visualizer

Let's create a **JSON Formatter** visualizer step by step:

### 1. Create Configuration (`viz.json`)

```json
{
  "name": "JSON Formatter",
  "description": "Pretty print and validate JSON files with syntax highlighting",
  "version": "1.0.0",
  "author": "Your Name",
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
```

### 2. Setup Build Configuration (`vite.config.ts`)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic' // Important: Use classic JSX runtime
    })
  ],
  build: {
    lib: {
      entry: 'src/App.tsx',
      name: 'JsonFormatter',
      fileName: 'bundle',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
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
import React from 'react';

interface FileData {
  path: string;
  mimetype: string;
  content: string;
  analysis?: {
    filename: string;
    size: number;
    isJson: boolean;
    jsonContent?: any;
  };
}

interface JsonFormatterProps {
  fileData: FileData;
}

const JsonFormatter: React.FC<JsonFormatterProps> = ({ fileData }) => {
  const [jsonData, setJsonData] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [formatted, setFormatted] = React.useState<string>('');

  React.useEffect(() => {
    try {
      // Try to parse the JSON content
      let content = fileData.content;

      // Handle base64 encoded content
      if (fileData.mimetype === 'application/json' && !content.startsWith('{')) {
        content = atob(content);
      }

      const parsed = JSON.parse(content);
      setJsonData(parsed);
      setFormatted(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fileData]);

  const handleSave = async () => {
    if (!formatted || error) return;

    try {
      // Create backup of original file first
      const backupResult = await window.api.backupFile(fileData.path);
      if (!backupResult.success) {
        throw new Error(`Failed to create backup: ${backupResult.error}`);
      }

      // Save the formatted JSON back to the original file
      const saveResult = await window.api.writeFile(fileData.path, formatted, 'utf8');
      if (!saveResult.success) {
        throw new Error(`Failed to save file: ${saveResult.error}`);
      }

      alert(`JSON saved successfully!\nBackup created: ${backupResult.backupPath}`);
    } catch (err) {
      alert(`Error saving file: ${err}`);
    }
  };

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#ef4444' }}>
        <h3>❌ JSON Parse Error</h3>
        <p>{error}</p>
        <pre style={{
          background: '#1e1e1e',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          overflow: 'auto',
          maxHeight: '200px'
        }}>
          {fileData.content.slice(0, 1000)}...
        </pre>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', background: '#0a0a0a', color: '#fff' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3>📄 JSON Formatter</h3>
        <button
          onClick={handleSave}
          style={{
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: 'pointer'
          }}
        >
          💾 Save Formatted
        </button>
      </div>

      <div style={{
        background: '#1e1e1e',
        borderRadius: '8px',
        padding: '15px',
        border: '1px solid #333'
      }}>
        <pre style={{
          margin: 0,
          fontSize: '14px',
          lineHeight: '1.5',
          overflow: 'auto',
          maxHeight: '600px'
        }}>
          {formatted}
        </pre>
      </div>

      <div style={{
        marginTop: '15px',
        fontSize: '12px',
        color: '#888',
        display: 'flex',
        gap: '20px'
      }}>
        <span>📁 {fileData.analysis?.filename || 'Unknown'}</span>
        <span>📊 {fileData.analysis?.size ? `${(fileData.analysis.size / 1024).toFixed(1)} KB` : 'Unknown size'}</span>
        <span>🔍 {Object.keys(jsonData || {}).length} properties</span>
      </div>
    </div>
  );
};

// Export the component for Viberunner to load
export default JsonFormatter;

// Global registration for IIFE bundle
if (typeof window !== 'undefined' && (window as any).__LOAD_VISUALIZER__) {
  (window as any).__LOAD_VISUALIZER__(JsonFormatter);
}
```

### 5. Build the Visualizer

```bash
npm run build
```

This creates `dist/bundle.iife.js` that Viberunner can load.

## 📋 Configuration Reference

### Complete `viz.json` Schema

```json
{
  "name": "string (required)",
  "description": "string (required)",
  "version": "string (required)",
  "author": "string (required)",

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

  // Standalone visualizers (no file input required)
  "standalone": "boolean (optional)",

  // Custom icon (relative path to icon file in app directory)
  "icon": "string (optional)",

  // Optional metadata
  "tags": ["string"],
  "homepage": "string",
  "repository": "string",
  "license": "string"
}
```

## 🚀 Standalone Visualizers

Viberunner supports standalone visualizers that don't require file input. These can be utilities, dashboards, or any application that operates independently.

### Configuration

To create a standalone visualizer, set `"standalone": true` in your `viz.json`:

```json
{
  "name": "Weather Dashboard",
  "description": "Real-time weather information and forecasts",
  "version": "1.0.0",
  "author": "Your Name",
  "standalone": true
}
```

### Component Interface

Standalone visualizers receive `null` as fileData:

```typescript
interface StandaloneVisualizerProps {
  fileData: null; // Always null for standalone visualizers
}

const WeatherDashboard: React.FC<StandaloneVisualizerProps> = ({ fileData }) => {
  // fileData will be null - this is a standalone utility
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    // Fetch weather data using Node.js APIs
    const https = require('https');
    // ... make API calls, read config files, etc.
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h2>🌤️ Weather Dashboard</h2>
      {/* Your utility UI here */}
    </div>
  );
};

export default WeatherDashboard;
```

### Example Standalone Visualizers

**System Monitor**
```json
{
  "name": "System Monitor",
  "description": "Real-time CPU, memory, and disk usage",
  "standalone": true
}
```

**Calculator**
```json
{
  "name": "Scientific Calculator",
  "description": "Advanced calculator with programming functions",
  "standalone": true
}
```

**API Tester**
```json
{
  "name": "REST API Tester",
  "description": "Test and debug REST API endpoints",
  "standalone": true
}
```

**Clipboard Manager**
```json
{
  "name": "Clipboard History",
  "description": "Manage and search clipboard history",
  "standalone": true
}
```

### Launching Standalone Visualizers

Standalone visualizers appear in the "Utilities" section of the sidebar with **Launch** buttons. They can:

- Access full Node.js APIs via `require()`
- Make HTTP requests to external services
- Read/write files and configurations
- Execute shell commands
- Create persistent data stores
- Build complex UI applications

This enables Viberunner to serve as a platform for any kind of utility or application, not just file visualizers!

## ⚛️ Component Development

### File Data Interface

Your React component receives this data structure:

```typescript
interface FileData {
  path: string;           // Full file path
  mimetype: string;       // MIME type
  content: string;        // File content (base64 for binary)
  analysis: {             // Enhanced file analysis
    filename: string;     // Just the filename
    size: number;         // File size in bytes
    isJson: boolean;      // Is valid JSON
    jsonContent?: any;    // Parsed JSON (if applicable)
  };
}

interface VisualizerProps {
  fileData: FileData;
}
```

### Available APIs

Visualizers can access these APIs through the global `window.api`:

```typescript
// Read directories (for folder visualizers)
const dirResult = await window.api.readDirectory('/path/to/dir');

// Get file MIME type
const mimetype = await window.api.getMimetype('/path/to/file');

// Read file content
const content = await window.api.readFile('/path/to/file');

// Find matching visualizers for a file
const matches = await window.api.findMatchingVisualizers('/path/to/file');

// File Writing & Backup Operations (NEW!)
// Write content to a file (with automatic backup support)
const writeResult = await window.api.writeFile('/path/to/file', content, 'utf8'); // or 'base64'

// Create backup of original file before modifications
const backupResult = await window.api.backupFile('/path/to/file');

// Show native save dialog for "Save As" functionality
const dialogResult = await window.api.saveFileDialog({
  title: 'Save Modified File',
  defaultPath: '/path/to/default.json',
  filters: [
    { name: 'JSON Files', extensions: ['json'] },
    { name: 'All Files', extensions: ['*'] }
  ]
});
```

### Full Node.js Access

Visualizers have complete access to Node.js modules via `require()`:

```typescript
// File system operations
const fs = require('fs');
const content = fs.readFileSync('/path/to/file', 'utf8');
fs.writeFileSync('/path/to/output.txt', 'Hello World');

// Path utilities
const path = require('path');
const filename = path.basename('/foo/bar/baz.txt'); // 'baz.txt'
const dir = path.dirname('/foo/bar/baz.txt'); // '/foo/bar'

// Operating system info
const os = require('os');
const homeDir = os.homedir();
const platform = os.platform();

// Child processes
const { spawn, exec } = require('child_process');
const result = exec('ls -la', (error, stdout, stderr) => {
  console.log(stdout);
});

// Crypto operations
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update('data').digest('hex');

// HTTP requests
const https = require('https');
// ... make API calls

// Any other Node.js module
const util = require('util');
const events = require('events');
// ... etc
```

**Security Note**: Visualizers run with full Node.js privileges, so only load trusted visualizers.

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
const MyVisualizer: React.FC<VisualizerProps> = ({ fileData }) => {
  // 1. Use React hooks for state management
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 2. Handle file analysis in useEffect
  useEffect(() => {
    const analyzeFile = async () => {
      try {
        setLoading(true);
        // Process fileData
        const processed = await processFile(fileData);
        setData(processed);
      } catch (error) {
        console.error('Error processing file:', error);
      } finally {
        setLoading(false);
      }
    };
    analyzeFile();
  }, [fileData]);

  // 3. Handle loading states
  if (loading) {
    return <div className="loading">Processing file...</div>;
  }

  // 4. Handle error states
  if (!data) {
    return <div className="error">Failed to process file</div>;
  }

  // 5. Return your visualization
  return (
    <div className="visualizer-container">
      {/* Your visualization here */}
    </div>
  );
};
```

## 📊 Advanced Examples

### Example 1: Package.json Upgrader

```json
{
  "name": "Package Upgrader",
  "description": "Check and upgrade npm dependencies",
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
```

### Example 2: Configuration File Analyzer

```json
{
  "name": "Config Analyzer",
  "description": "Analyze configuration files across different formats",
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
```

### Example 3: Large File Handler

```json
{
  "name": "Large File Analyzer",
  "description": "Special handling for files larger than 100MB",
  "matchers": [
    {
      "type": "file-size",
      "minSize": 104857600,
      "priority": 70
    }
  ]
}
```

### Example 4: Node.js Script Detector

```json
{
  "name": "Node.js Script Runner",
  "description": "Detect and analyze Node.js scripts",
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
```

### Example 5: Kanban Board Visualizer

```json
{
  "name": "Kanban Board Visualizer",
  "description": "Visualize kanban boards from various file formats",
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

# 4. Test the built visualizer
# Copy to your visualizers directory and reload in Viberunner
```

### Required Build Output

Your build process **must** generate:
- `dist/bundle.iife.js` - IIFE format bundle
- The bundle must be self-contained
- External deps: `react` and `react-dom` (provided by Viberunner)

### Vite Configuration Template

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic' // Required for compatibility
    })
  ],
  build: {
    lib: {
      entry: 'src/App.tsx',
      name: 'MyVisualizer', // Change this
      fileName: 'bundle',
      formats: ['iife']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
```

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
- **Modular code**: Break complex visualizers into components
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
- Verify JSON syntax in viz.json
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
const DebugInfo: React.FC<{fileData: FileData}> = ({ fileData }) => (
  <details style={{ marginTop: '20px', fontSize: '12px' }}>
    <summary>🐛 Debug Info</summary>
    <pre style={{ background: '#1e1e1e', padding: '10px' }}>
      {JSON.stringify(fileData, null, 2)}
    </pre>
  </details>
);
```

### Getting Help

1. **Check console logs**: Both main process and renderer
2. **Verify file structure**: Ensure all required files exist
3. **Test incrementally**: Start simple, add complexity gradually
4. **Use debug visualizer**: Create a simple debug visualizer first

## 🚀 Advanced Topics

### File Modification Workflows

The new file saving APIs enable powerful file modification workflows:

```tsx
// Example: Smart JSON formatter with validation
const JsonEditor: React.FC<VisualizerProps> = ({ fileData }) => {
  const [content, setContent] = useState('');
  const [isValid, setIsValid] = useState(true);

  const validateAndSave = async () => {
    try {
      // Validate JSON before saving
      JSON.parse(content);

      // Create backup and save
      const backupResult = await window.api.backupFile(fileData.path);
      if (!backupResult.success) throw new Error(backupResult.error);

      const saveResult = await window.api.writeFile(fileData.path, content, 'utf8');
      if (!saveResult.success) throw new Error(saveResult.error);

      alert(`JSON saved and formatted!\nBackup: ${backupResult.backupPath}`);
    } catch (error) {
      alert(`Error: ${error}`);
    }
  };

  return (
    <div>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <button onClick={validateAndSave} disabled={!isValid}>
        💾 Save Formatted JSON
      </button>
    </div>
  );
};
```

### Multi-file Visualizers

```tsx
// Handle multiple related files
const analyzeProject = async (packageJsonPath: string) => {
  const dir = path.dirname(packageJsonPath);

  // Read related files
  const lockFile = path.join(dir, 'package-lock.json');
  const nodeModules = path.join(dir, 'node_modules');

  // Use the directory API to analyze project structure
  const dirResult = await window.api.readDirectory(dir);
  if (dirResult.success) {
    return dirResult.files.filter(f => f.name.endsWith('.json'));
  }
};
```

### External API Integration

```tsx
// Check npm registry for latest versions
const checkLatestVersions = async (dependencies: Record<string, string>) => {
  const results = {};

  for (const [pkg, version] of Object.entries(dependencies)) {
    try {
      const response = await fetch(`https://registry.npmjs.org/${pkg}/latest`);
      const data = await response.json();
      results[pkg] = {
        current: version,
        latest: data.version,
        needsUpdate: version !== data.version
      };
    } catch (error) {
      console.error(`Error checking ${pkg}:`, error);
    }
  }

  return results;
};
```

### Frame Cleanup API

**⚠️ Important:** Frames should register cleanup callbacks to prevent memory leaks and ensure proper resource management when tabs are closed.

#### Available Functions

```javascript
// Register a cleanup callback for the current tab
registerCleanup(tabId, cleanupFunction)
```

#### Basic Usage

```javascript
function MyFrame({ tabId }) {
  const [interval, setInterval] = useState(null);

  useEffect(() => {
    // Start some process
    const intervalId = setInterval(() => {
      console.log('Processing...');
    }, 1000);
    setInterval(intervalId);

    // Register cleanup callback
    registerCleanup(tabId, () => {
      console.log('Cleaning up interval');
      clearInterval(intervalId);
    });

    // Component cleanup (React unmount)
    return () => {
      clearInterval(intervalId);
    };
  }, [tabId]);

  return <div>My Frame Content</div>;
}
```

#### Advanced Usage Examples

```javascript
// Multiple cleanup callbacks
function AdvancedFrame({ tabId }) {
  useEffect(() => {
    // WebSocket connection
    const ws = new WebSocket('ws://localhost:8080');

    // File watchers
    const watchers = [];

    // Register multiple cleanup callbacks
    registerCleanup(tabId, () => {
      console.log('Closing WebSocket connection');
      ws.close();
    });

    registerCleanup(tabId, () => {
      console.log('Stopping file watchers');
      watchers.forEach(watcher => watcher.close());
    });

    registerCleanup(tabId, () => {
      console.log('Clearing any pending operations');
      // Clear any other resources
    });

  }, [tabId]);
}
```

#### When Cleanup is Called

Cleanup callbacks are automatically executed when:
- A tab is closed by the user
- The application is shutting down
- A tab is being replaced (rare edge cases)

#### Best Practices

1. **Always register cleanup**: Even if you think your frame doesn't need it
2. **Multiple callbacks**: Register separate callbacks for different types of cleanup
3. **Error handling**: Cleanup callbacks are wrapped in try-catch, but handle your own errors when possible
4. **Immediate cleanup**: Also implement React's `useEffect` cleanup for immediate component unmounting

```javascript
useEffect(() => {
  const resource = createResource();

  // Register for tab cleanup
  registerCleanup(tabId, () => {
    resource.cleanup();
  });

  // Also handle React unmount
  return () => {
    resource.cleanup();
  };
}, [tabId]);
```

---

## 🎉 Conclusion

You now have everything needed to create powerful, sophisticated visualizers for Viberunner! The enhanced matching system allows for precise file targeting, while the React-based architecture provides a familiar development experience.

Start with simple visualizers and gradually add complexity. The priority-based matching ensures your visualizers activate exactly when they should, creating a seamless user experience.

Happy visualizing! 🚀