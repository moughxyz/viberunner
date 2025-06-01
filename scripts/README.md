# Electron Icon Converter

This script automates the creation of all required icon formats for Electron Forge from a single source image.

## Quick Start

```bash
# Using npm script (recommended)
npm run convert-icon path/to/your/icon.png

# Or directly
node scripts/convert-icon.js path/to/your/icon.png
```

## What it does

Converts a single source image into all formats needed for Electron Forge:

- **`assets/icon.icns`** - macOS app icon (with all required resolutions)
- **`assets/icon.ico`** - Windows app icon
- **`assets/icon.png`** - Linux app icon (copy of source)

## Requirements

### Source Image
- **Format**: PNG (recommended)
- **Size**: 1024x1024 pixels (minimum 512x512)
- **Shape**: Square aspect ratio
- **Quality**: High resolution for best results

### System Dependencies
- **macOS**: `sips` and `iconutil` (built-in)
- **All platforms**: ImageMagick
  ```bash
  # Install ImageMagick via Homebrew
  brew install imagemagick
  ```

## Usage Examples

```bash
# Convert an icon in the current directory
npm run convert-icon my-app-icon.png

# Convert with full path
npm run convert-icon /Users/you/Desktop/logo.png

# Convert from assets directory
npm run convert-icon assets/source-logo.png
```

## Output

After running the script, you'll have:
```
assets/
├── icon.icns    # macOS (multiple resolutions bundled)
├── icon.ico     # Windows
└── icon.png     # Linux
```

Your `forge.config.js` should then use:
```js
icon: './assets/icon'  // No extension needed!
```

## Features

- ✅ **Automatic dependency checking** (installs ImageMagick if missing)
- ✅ **Input validation** (checks dimensions, format, etc.)
- ✅ **Cross-platform support** (macOS, Windows, Linux)
- ✅ **Proper cleanup** (removes temporary files)
- ✅ **Detailed logging** (shows progress and results)
- ✅ **Error handling** (helpful error messages)

## Troubleshooting

### "Command not found: convert"
Install ImageMagick:
```bash
brew install imagemagick
```

### "Input file not found"
Make sure the path to your source image is correct:
```bash
ls -la path/to/your/icon.png
```

### "Image is not square"
Your source image should have equal width and height. Use an image editor to crop it to a square first.

### ICNS not created on Windows/Linux
ICNS files can only be created on macOS. The script will skip this step on other platforms with a warning.

---

**Pro tip**: Save your source icon as `source-icon.png` in the assets directory, then you can easily regenerate all formats anytime:
```bash
npm run convert-icon assets/source-icon.png
```