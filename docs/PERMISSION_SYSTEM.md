# Viberunner Permission System

Viberunner implements a hybrid permission system to handle macOS file system security while providing apps with the access they need.

## How It Works

### 1. **Startup Permissions**
When Viberunner launches, it requests access to common directories:
- Documents
- Desktop
- Downloads

Users can grant or skip these permissions.

### 2. **On-Demand Permissions**
When apps need access to other directories, they can request permissions dynamically.

### 3. **Permission Caching**
Granted permissions are cached for the session to avoid repeated prompts.

## API for Apps

Apps running in Viberunner can use these IPC calls for file system access:

### Check Directory Access
```javascript
const result = await window.api.checkDirectoryAccess('/path/to/directory');
if (result.success && result.hasAccess) {
  // You can access this directory
}
```

### Request Directory Access
```javascript
const result = await window.api.requestDirectoryAccess(
  '/Users/username/Documents/MyProject',
  'This app needs to save your project files'
);

if (result.success && result.granted) {
  // Permission granted, you can now access the directory
}
```

### Secure File Operations

#### Read File (Secure)
```javascript
const result = await window.api.readFileSecure('/path/to/file.txt');
if (result.success) {
  const content = atob(result.content); // base64 decode
}
```

#### Write File (Permission-aware)
```javascript
const result = await window.api.writeFile(
  '/path/to/file.txt',
  'file content',
  'utf8'
);
```

### Get All Granted Paths
```javascript
const result = await window.api.getGrantedPaths();
if (result.success) {
  console.log('Accessible directories:', result.grantedPaths);
}
```

## Best Practices for App Developers

### 1. **Request Minimal Permissions**
Only request access to directories you actually need.

### 2. **Provide Clear Reasons**
Always provide a user-friendly explanation when requesting permissions:
```javascript
await window.api.requestDirectoryAccess(
  documentsPath,
  'Save your sketches and export them as images'
);
```

### 3. **Handle Permission Denials Gracefully**
```javascript
const result = await window.api.requestDirectoryAccess(path, reason);
if (!result.granted) {
  // Show alternative options or explain limitations
  showMessage('Without folder access, files will be saved to a temporary location');
}
```

### 4. **Check Before Writing**
```javascript
// Good practice: check before attempting file operations
const hasAccess = await window.api.checkDirectoryAccess(targetDir);
if (!hasAccess.hasAccess) {
  const permission = await window.api.requestDirectoryAccess(targetDir, reason);
  if (!permission.granted) {
    // Handle denial
    return;
  }
}

// Now safe to write
await window.api.writeFile(filePath, content);
```

## Common Directory Paths

Get standard directory paths using Node.js path utilities in your app:
```javascript
// You'll need to implement these yourself or request them via IPC
const os = require('os');
const path = require('path');

const documentsPath = path.join(os.homedir(), 'Documents');
const desktopPath = path.join(os.homedir(), 'Desktop');
const downloadsPath = path.join(os.homedir(), 'Downloads');
```

## Error Handling

All permission APIs return consistent error structures:
```javascript
{
  success: boolean,
  error?: string,
  // ... other properties
}
```

Always check the `success` field and handle errors appropriately.

## Security Notes

- Permissions are session-based and don't persist between app restarts
- Apps cannot access directories outside their granted permissions
- File paths with `..` are automatically rejected for security
- Each permission request shows a system dialog to the user

## Migration from Legacy File APIs

If your app currently uses direct file system access, update to use the secure APIs:

```javascript
// Old (may fail in packaged app)
const fs = require('fs');
fs.writeFileSync(path, content);

// New (permission-aware)
const result = await window.api.writeFile(path, content);
if (!result.success) {
  console.error('Write failed:', result.error);
}
```