# 📦 Package Upgrader Visualizer

A powerful Vizor visualizer for analyzing and upgrading npm dependencies in package.json files. Get detailed insights about outdated packages, view their information, and generate updated package.json files with a beautiful, intuitive interface.

## ✨ Features

- **🔍 Smart Detection**: Automatically matches package.json files with advanced patterns
- **📊 Comprehensive Analysis**: Fetches latest versions, descriptions, licenses, and more from npm registry
- **🎯 Update Classification**: Categorizes updates as major, minor, or patch with color coding
- **⚠️ Deprecation Warnings**: Highlights deprecated packages
- **📋 Filtering System**: Filter by update type (all, outdated, major, minor, patch)
- **✅ Selective Updates**: Choose which packages to update with checkboxes
- **💾 Export Functionality**: Download updated package.json files
- **🔗 Quick Links**: Direct links to package homepage, repository, and npm page
- **🌙 Dark Theme**: Beautiful, modern UI that matches Vizor's design

## 🎯 File Matching

This visualizer will activate for:

- Files named exactly `package.json` (highest priority)
- Files named `package-lock.json`
- JSON files containing `dependencies` property
- JSON files containing `devDependencies` property
- JSON files with dependency-related patterns

## 🚀 Quick Start

1. **Drop a package.json file** into Vizor
2. **Click "Check Updates"** to analyze dependencies
3. **Review the results** - outdated packages are highlighted
4. **Select packages** to update using checkboxes
5. **Click "Save Updated"** to download the new package.json

## 📋 Interface Guide

### Header Section
- **Package Info**: Shows package name, version, and total dependencies
- **Update Summary**: Displays counts of outdated packages by type
- **Action Buttons**:
  - `🔍 Check Updates`: Analyze all dependencies
  - `💾 Save Updated (N)`: Download updated package.json

### Filter Controls
- **All**: Show all dependencies
- **Outdated**: Show only packages with updates available
- **Major**: Show only major version updates (breaking changes)
- **Minor**: Show only minor version updates (new features)
- **Patch**: Show only patch updates (bug fixes)

### Dependency Cards
Each package displays:
- **Package Name**: With deprecation warnings if applicable
- **Update Type Badge**: Color-coded (🚨 Major, 📈 Minor, 🔧 Patch)
- **Version Comparison**: Current vs latest version
- **Update Checkbox**: Select for updating
- **Info Button**: Toggle detailed package information

### Detailed Information
When expanded, each package shows:
- **Description**: Package purpose and functionality
- **License**: Software license type
- **Quick Links**:
  - 🏠 Homepage
  - 📚 Repository
  - 📦 NPM Page

## 🎨 Visual Indicators

### Update Type Colors
- 🚨 **Red (Major)**: Breaking changes, may require code modifications
- 📈 **Orange (Minor)**: New features, backward compatible
- 🔧 **Green (Patch)**: Bug fixes, safe to update

### Status Indicators
- ✅ **Green**: Package is up to date
- ⚠️ **Orange**: Updates available
- ❌ **Red**: Deprecated package or error fetching data
- 🔄 **Blue**: Currently checking for updates

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm or yarn

### Build Commands
```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

### Project Structure
```
package-upgrader/
├── src/
│   └── App.tsx          # Main React component
├── dist/
│   └── bundle.iife.js   # Built output for Vizor
├── viz.json             # Visualizer configuration
├── package.json         # Project dependencies
├── tsconfig.json        # TypeScript configuration
├── vite.config.ts       # Build configuration
└── README.md            # This file
```

## 🔧 Configuration

The visualizer uses multiple matchers for precise file detection:

```json
{
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

## 🚨 Safety Notes

- **Backup First**: Always backup your package.json before making changes
- **Review Updates**: Check major updates carefully for breaking changes
- **Test Thoroughly**: Test your application after updating dependencies
- **Read Changelogs**: Review package changelogs for important changes

## 🔮 Future Enhancements

- **Security Vulnerability Detection**: Integration with npm audit
- **Dependency Tree Visualization**: Show package relationships
- **Update Scheduling**: Plan updates over time
- **Automated Testing**: Integration with CI/CD pipelines
- **Custom Update Policies**: Configure update rules per project

## 🤝 Contributing

This visualizer is part of the Vizor ecosystem. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **npm Registry API**: For providing package information
- **Vizor Platform**: For the visualization framework
- **React Community**: For the excellent development experience

---

**Happy dependency upgrading! 🚀**