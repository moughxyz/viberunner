# Frame API - Node.js Direct Access

## Overview

Frames now have direct access to Node.js APIs instead of receiving pre-processed file content. This provides better performance, flexibility, and avoids data corruption issues.

## Frame Props

### File-based Frames
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

### Standalone Frames
```typescript
interface FrameProps {
  container: HTMLElement; // Mount point
}
```

## Available APIs

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

## Migration Guide

### Before (Legacy)
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

### After (Recommended)
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

## Benefits

1. **No data corruption** - Direct file access eliminates base64 encoding issues
2. **Better performance** - Only read what you need, when you need it
3. **More flexibility** - Access entire filesystem, not just the dropped file
4. **Simpler code** - No need to handle multiple encoding formats
5. **Enhanced capabilities** - Can read config files, create temp files, etc.

## Example: Reading an Image

### Before
```javascript
// Image data was pre-encoded as base64, could be corrupted
const imageData = `data:${fileData.mimetype};base64,${fileData.content}`;
```

### After
```javascript
// Read image directly when needed, no corruption risk
const imageBuffer = api.fs.readFileSync(fileInput.path);
const imageData = `data:${fileInput.mimetype};base64,${imageBuffer.toString('base64')}`;
```

## Backward Compatibility

For migration period, both `fileInput` (new) and `fileData` (legacy) props are provided. Use `fileInput.path` for all new development.