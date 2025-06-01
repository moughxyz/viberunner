# GitHub Actions Workflows

This directory contains GitHub Actions workflows for the Viberunner project. These workflows handle continuous integration, building, and releasing the application across multiple platforms.

## Workflows Overview

### 🔧 CI Workflow (`ci.yml`)
**Triggers**: Push to `main`/`develop` branches, Pull Requests to `main`/`develop`

**Purpose**: Comprehensive continuous integration pipeline

**Jobs**:
- **Lint & TypeCheck**: Runs ESLint and TypeScript compilation checks
- **Build Test**: Tests packaging on macOS, Windows, and Linux
- **Security Audit**: Runs npm security audit and checks for outdated packages
- **Build Status**: Aggregates results from all jobs

### 🚀 Release Workflow (`release.yml`)
**Triggers**: Push tags matching `v*` (e.g., `v1.0.0`, `v2.1.3`)

**Purpose**: Creates GitHub releases with distributables for all platforms

**What it does**:
1. Builds distributables for macOS (DMG), Windows (Setup EXE), and Linux (DEB/RPM)
2. Creates a GitHub release with auto-generated release notes
3. Uploads all build artifacts as release assets

**Output Formats**:
- **macOS**: `.dmg` installer and `.zip` portable
- **Windows**: Setup `.exe` installer
- **Linux**: `.deb` and `.rpm` packages

**Key Features**:
- **Modern approach**: Uses current GitHub Actions (not deprecated ones)
- **Robust file discovery**: Uses glob patterns to find build artifacts automatically
- **Parallel builds**: All platforms build simultaneously for faster execution
- **Auto-generated release notes**: Includes commit history and rich formatting
- **Bulk asset upload**: All files uploaded together, more reliable than individual uploads

### 🧪 Pre-Release Workflow (`pre-release.yml`)
**Triggers**: Push tags matching `v*-beta*`, `v*-alpha*`, `v*-rc*`

**Purpose**: Creates pre-releases for testing versions

**Examples**: `v1.0.0-beta1`, `v2.0.0-alpha2`, `v1.5.0-rc1`

### 📦 Build Workflow (`build.yml`)
**Triggers**: Push to `main`/`develop` branches, Pull Requests to `main`

**Purpose**: Simple build verification without creating releases

**What it does**:
- Packages the app for all platforms
- Uploads build artifacts for download (7-day retention)

## 🚀 How to Create a Release

### 1. Stable Release
```bash
# Create and push a version tag
git tag v1.0.0
git push origin v1.0.0
```

This will trigger the `release.yml` workflow and create a public release.

### 2. Pre-Release (Beta/Alpha/RC)
```bash
# Create and push a pre-release tag
git tag v1.0.0-beta1
git push origin v1.0.0-beta1
```

This will trigger the `pre-release.yml` workflow and create a pre-release.

## 📋 Workflow Requirements

### Repository Secrets
No additional secrets are required beyond the default `GITHUB_TOKEN` which is automatically provided.

### Repository Settings
Make sure your repository has:
- ✅ Actions enabled
- ✅ Allow GitHub Actions to create and approve pull requests (for automated releases)

## 🛠️ Platform-Specific Build Details

### macOS
- **Runners**: `macos-latest`
- **Outputs**: `.dmg` installer, `.zip` portable
- **Note**: Apps are not signed (users may see security warnings)

### Windows
- **Runners**: `windows-latest`
- **Outputs**: Setup `.exe` installer
- **Note**: Apps are not signed (Windows Defender may show warnings)

### Linux
- **Runners**: `ubuntu-latest`
- **Outputs**: `.deb` package (Ubuntu/Debian), `.rpm` package (RHEL/Fedora)
- **Note**: Universal Linux compatibility

## 🔍 Monitoring Workflow Status

### Viewing Workflow Runs
1. Go to your repository on GitHub
2. Click the "Actions" tab
3. Select a workflow to see its runs

### Downloading Artifacts
1. Click on a workflow run
2. Scroll down to the "Artifacts" section
3. Click to download build artifacts

### Troubleshooting Failed Builds
Common issues and solutions:

**Build Failures**:
- Check Node.js version compatibility
- Verify all dependencies are properly listed in `package.json`
- Ensure build scripts work locally first

**Release Creation Failures**:
- Verify tag format matches trigger patterns
- Check that the repository has releases enabled
- Ensure `GITHUB_TOKEN` has proper permissions

## 📁 Build Artifacts Structure

After a successful build, artifacts are organized as:

```
artifacts/
├── viberunner-darwin-x64/
│   ├── *.dmg
│   └── *.zip
├── viberunner-linux-x64/
│   ├── *.deb
│   ├── *.rpm
│   └── *.zip
└── viberunner-win32-x64/
    ├── *.exe
    └── *.zip
```

## 🔄 Workflow Dependencies

### Required npm Scripts
Make sure these scripts exist in `package.json`:
- `npm run build` - Builds the renderer (Vite)
- `npm run package` - Packages the app (Electron Forge)
- `npm run make` - Creates distributables (Electron Forge)
- `npm run lint` - Runs ESLint

### Required Tools
- **Electron Forge**: For packaging and making distributables
- **Vite**: For building the renderer process
- **TypeScript**: For type checking
- **ESLint**: For code linting

## 🎯 Best Practices

1. **Test Locally First**: Always test `npm run make` locally before pushing tags
2. **Use Semantic Versioning**: Follow semver for tag names (e.g., `v1.2.3`)
3. **Pre-Release Testing**: Use alpha/beta/rc tags for testing before stable releases
4. **Monitor Build Times**: Workflows typically take 10-15 minutes for full cross-platform builds
5. **Artifact Management**: Regular builds are kept for 7 days, releases for 30 days

## 📝 Customization

To customize these workflows for your needs:

1. **Change Trigger Branches**: Modify the `branches` arrays in workflow files
2. **Add More Platforms**: Add entries to the `strategy.matrix` sections
3. **Modify Release Notes**: Edit the `body` sections in release workflows
4. **Adjust Retention**: Change `retention-days` for artifact storage
5. **Add Code Signing**: Uncomment and configure the signing sections in `forge.config.js`