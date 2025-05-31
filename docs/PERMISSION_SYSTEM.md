# Viberunner Permission System

Viberunner implements a persistent permission system using macOS Security-Scoped Bookmarks to handle file system security while providing apps with reliable access to their files.

## How It Works

### 1. **Persistent Permissions**
Unlike session-based permissions, Viberunner uses macOS Security-Scoped Bookmarks to store access permissions permanently. Once you grant access to a directory, it will remain available across app restarts without requiring new permissions.

### 2. **Startup Permissions**
When Viberunner launches, it:
- Automatically validates existing stored permissions
- Requests access to common directories if not already granted:
  - Documents
  - Desktop
  - Downloads

### 3. **On-Demand Permissions**
When apps need access to new directories, they can request permissions dynamically, and these will be permanently stored.

### 4. **Silent Permission Checking**
Apps can check if they have access to directories without showing permission dialogs.

## API for Apps

Apps running in Viberunner can use these IPC calls for file system access:

### Check Directory Access (Silent)
```javascript
const result = await window.api.checkDirectoryAccess('/path/to/directory');
if (result.success && result.hasAccess) {
  // You can access this directory
  console.log('Access available');
} else if (!result.success) {
  console.error('Check failed:', result.error);
}
```

This method **never shows a dialog** - it only checks existing permissions (both current session and stored bookmarks).

### Request Directory Access
```javascript
const result = await window.api.requestDirectoryAccess(
  '/Users/username/Documents/MyProject',
  'This app needs to save your project files'
);

if (result.success && result.granted) {
  // Permission granted and permanently stored
  console.log('Access granted and saved');
} else {
  console.log('Access denied or error:', result.error);
}
```

### Secure File Operations

#### Read File (Secure)
```javascript
const result = await window.api.readFileSecure('/path/to/file.txt');
if (result.success) {
  const content = atob(result.content); // base64 decode
} else {
  console.error('Read failed:', result.error);
}
```

#### Write File (Permission-aware)
```javascript
const result = await window.api.writeFile(
  '/path/to/file.txt',
  'file content',
  'utf8'
);
if (!result.success) {
  console.error('Write failed:', result.error);
}
```

### Get All Granted Paths
```javascript
const result = await window.api.getGrantedPaths();
if (result.success) {
  console.log('Accessible directories:', result.grantedPaths);
  // This includes both current session and permanently stored paths
}
```

## Best Practices for App Developers

### 1. **Check Before Requesting**
Always check silently first, then request only if needed:
```javascript
let hasAccess = await window.api.checkDirectoryAccess(targetDir);
if (!hasAccess.hasAccess) {
  const permission = await window.api.requestDirectoryAccess(
    targetDir,
    'Save your sketches and export them as images'
  );
  hasAccess = permission;
}
```

### 2. **Request Minimal Permissions**
Only request access to directories you actually need.

### 3. **Provide Clear Reasons**
Always provide a user-friendly explanation when requesting permissions:
```javascript
await window.api.requestDirectoryAccess(
  documentsPath,
  'Save your sketches and export them as images'
);
```

### 4. **Handle Permission Denials Gracefully**
```javascript
const result = await window.api.requestDirectoryAccess(path, reason);
if (!result.granted) {
  // Show alternative options or explain limitations
  showMessage('Without folder access, files will be saved to a temporary location');
}
```

### 5. **Use Secure File Operations**
Always use the secure file operations for the best compatibility:
```javascript
// Good practice: use secure read/write operations
const result = await window.api.readFileSecure(filePath);
if (result.success) {
  const content = atob(result.content);
  // Process content
}
```

## Permission Persistence

### Storage Method
Permissions are stored using macOS Security-Scoped Bookmarks in:
- `~/Library/Application Support/Viberunner/bookmarks.json`

### Lifetime
- **Permanent**: Permissions survive app restarts and system reboots
- **User-scoped**: Each user has their own set of permissions
- **App-scoped**: Permissions are specific to Viberunner

### Validation
- Bookmarks are validated on app startup
- Invalid bookmarks (e.g., if the target folder was deleted) are automatically cleaned up
- No user intervention required for bookmark maintenance

## Security Notes

- All permissions use Apple's Security-Scoped Bookmark system
- Bookmarks are signed and cannot be tampered with
- Each bookmark is specific to Viberunner and the current user
- File paths with `..` are automatically rejected for security
- Permission dialogs are shown by macOS, not by Viberunner

## Migration from Session-Based Systems

If your app currently expects permissions to be temporary:

```javascript
// Old approach (not recommended)
// Assume permissions are always available

// New approach (recommended)
const hasAccess = await window.api.checkDirectoryAccess(path);
if (!hasAccess.hasAccess) {
  const result = await window.api.requestDirectoryAccess(path, reason);
  if (!result.granted) {
    // Handle lack of permissions gracefully
    return;
  }
}
// Now safe to proceed with file operations
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