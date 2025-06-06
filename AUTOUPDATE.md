# Autoupdate with Electron Forge

This document explains how autoupdate functionality works in Viberunner using Electron Forge and GitHub Releases.

## Overview

Autoupdate allows your Electron app to automatically check for, download, and install updates without requiring users to manually download new versions. This implementation uses:

- **electron-updater**: The core autoupdate library
- **GitHub Releases**: As the update server
- **Electron Forge**: For building and publishing releases

## How It Works

### 1. Update Discovery
- The app checks GitHub Releases API for new versions
- Uses the repository information from `package.json`
- Compares current version with latest release version

### 2. Update Download
- Downloads the appropriate installer/update file for the platform
- Verifies the download integrity
- Stores the update locally

### 3. Update Installation
- On Windows: Uses Squirrel.Windows for seamless updates
- On macOS: Downloads and prompts user to install DMG
- On Linux: Depends on the distribution method (AppImage, deb, rpm)

## Implementation Details

### Main Process (`src/main/index.ts`)

```typescript
import { autoUpdater } from 'electron-updater';

// Configure autoupdate
autoUpdater.checkForUpdatesAndNotify();

// Handle autoupdate events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  autoUpdater.quitAndInstall();
});
```

### IPC Communication

The main process exposes these IPC handlers:
- `check-for-updates`: Manually trigger update check
- `download-update`: Download available update
- `quit-and-install`: Install downloaded update and restart
- `get-app-version`: Get current app version

### Renderer Process (`UpdateNotification.tsx`)

A React component that provides:
- Manual update checking
- Update notification UI
- Download progress indication
- Installation controls

### Configuration Files

#### `package.json`
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/viberunner.git"
  },
  "homepage": "https://github.com/yourusername/viberunner"
}
```

#### `forge.config.js`
```javascript
publishers: [
  {
    name: '@electron-forge/publisher-github',
    config: {
      repository: {
        owner: 'yourusername',
        name: 'viberunner'
      },
      prerelease: false,
      draft: false, // IMPORTANT: Must be false for autoupdate
      generateReleaseNotes: true
    }
  }
]
```

## Platform-Specific Behavior

### Windows (Squirrel)
- **Maker**: `@electron-forge/maker-squirrel`
- **Update Method**: Delta updates via Squirrel.Windows
- **Installation**: Silent background updates
- **Restart**: Automatic after download

### macOS
- **Maker**: `@electron-forge/maker-dmg`
- **Update Method**: Full DMG download
- **Installation**: User must mount and install DMG
- **Code Signing**: Required for automatic updates

### Linux
- **Makers**: `@electron-forge/maker-deb`, `@electron-forge/maker-rpm`
- **Update Method**: Depends on package manager
- **Installation**: Manual or via package manager

## Publishing Workflow

### 1. Version Bump
```bash
npm version patch  # or minor/major
```

### 2. Build and Publish
```bash
npm run publish
```

This will:
1. Build the app with `npm run build`
2. Package the app for all platforms
3. Create GitHub Release with assets
4. Upload platform-specific installers

### 3. Automatic Distribution
- Users with the app installed will be notified of updates
- Windows users get automatic updates
- macOS/Linux users get download notifications

## Update Server Requirements

### GitHub Releases
- Repository must be public (or have proper access tokens)
- Releases must not be drafts (`draft: false`)
- Release assets must include platform-specific installers

### Custom Update Server
If you prefer a custom server, you can configure `electron-updater`:

```typescript
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://your-update-server.com/updates'
});
```

## Security Considerations

### Code Signing
- **Windows**: Sign with a valid certificate to avoid SmartScreen warnings
- **macOS**: Sign and notarize for automatic updates
- **Linux**: Package signing varies by distribution

### Update Verification
- `electron-updater` verifies download integrity
- Uses checksums and signatures when available
- Rejects tampered or corrupted updates

## Troubleshooting

### Common Issues

1. **Updates not detected**
   - Check repository URL in `package.json`
   - Ensure releases are not drafts
   - Verify network connectivity

2. **Download failures**
   - Check GitHub API rate limits
   - Verify release assets exist
   - Check file permissions

3. **Installation failures**
   - Ensure proper code signing
   - Check user permissions
   - Verify platform compatibility

### Debug Mode
Enable debug logging:

```typescript
// In main process
import log from 'electron-log';
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
```

### Testing Updates
1. Create a test release with higher version number
2. Install current version of app
3. Trigger update check manually
4. Verify download and installation process

## Best Practices

1. **Version Management**
   - Use semantic versioning (semver)
   - Test updates thoroughly before release
   - Provide clear release notes

2. **User Experience**
   - Show update progress to users
   - Allow users to postpone updates
   - Provide rollback mechanism if needed

3. **Release Strategy**
   - Use staged rollouts for major updates
   - Monitor update success rates
   - Have rollback plan ready

4. **Performance**
   - Check for updates on app startup
   - Use background downloads
   - Minimize disruption to user workflow

## Environment Variables

For CI/CD and publishing:

```bash
# GitHub token for publishing
export GH_TOKEN=your_github_token

# Code signing (macOS)
export APPLE_ID=your_apple_id
export APPLE_PASSWORD=your_app_specific_password
export APPLE_TEAM_ID=your_team_id

# Code signing (Windows)
export WINDOWS_CERTIFICATE_FILE=path_to_certificate
export WINDOWS_CERTIFICATE_PASSWORD=certificate_password
```

## Monitoring and Analytics

Consider implementing:
- Update success/failure tracking
- Version adoption metrics
- Error reporting for failed updates
- User feedback collection

This autoupdate implementation provides a robust foundation for keeping your Electron app up-to-date across all platforms while maintaining a smooth user experience.