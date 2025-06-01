# Electron Icon Converter

This script automates the creation of all required icon formats for Electron Forge from a single source image.

## Quick Start

```bash
# Super simple - just drop your icon as source-icon.png in assets/
npm run convert-icon

# Or specify a custom path
node scripts/convert-icon.js path/to/your/icon.png
```

## What it does

Converts a single source image into all formats needed for Electron Forge:

- **`assets/icon.icns`** - macOS app icon (with all required resolutions)
- **`assets/icon.ico`** - Windows app icon
- **`assets/icon.png`** - Linux app icon (copy of source)

## Simple Workflow

1. **Drop your icon** as `assets/source-icon.png` (1024x1024 recommended)
2. **Run the command**: `npm run convert-icon`
3. **Done!** All icon formats are generated automatically

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
# Standard workflow (recommended)
# 1. Save your icon as assets/source-icon.png
# 2. Run:
npm run convert-icon

# Custom icon path
node scripts/convert-icon.js my-app-icon.png
node scripts/convert-icon.js /Users/you/Desktop/logo.png
```

## Output

After running the script, you'll have:
```
assets/
├── source-icon.png  # Your source file (not committed to git)
├── icon.icns        # macOS (multiple resolutions bundled)
├── icon.ico         # Windows
└── icon.png         # Linux
```

Your `forge.config.js` should then use:
```js
icon: './assets/icon'  // No extension needed!
```

## Features

- ✅ **One-command workflow** (just `npm run convert-icon`)
- ✅ **Automatic dependency checking** (installs ImageMagick if missing)
- ✅ **Input validation** (checks dimensions, format, etc.)
- ✅ **Cross-platform support** (macOS, Windows, Linux)
- ✅ **Proper cleanup** (removes temporary files)
- ✅ **Detailed logging** (shows progress and results)
- ✅ **Error handling** (helpful error messages)

## Troubleshooting

### "Input file not found"
Make sure you have saved your icon as `assets/source-icon.png`:
```bash
ls -la assets/source-icon.png
```

### "Command not found: convert"
Install ImageMagick:
```bash
brew install imagemagick
```

### "Image is not square"
Your source image should have equal width and height. Use an image editor to crop it to a square first.

### ICNS not created on Windows/Linux
ICNS files can only be created on macOS. The script will skip this step on other platforms with a warning.

---

**Workflow**: Just save your high-res icon as `assets/source-icon.png` and run `npm run convert-icon` anytime you want to regenerate all icon formats!