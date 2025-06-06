#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class IconConverter {
  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'icon-conversion-' + Date.now());
    this.assetsDir = path.join(process.cwd(), 'assets');
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',    // cyan
      success: '\x1b[32m', // green
      warning: '\x1b[33m', // yellow
      error: '\x1b[31m'    // red
    };
    const reset = '\x1b[0m';
    console.log(`${colors[type]}[${type.toUpperCase()}]${reset} ${message}`);
  }

  checkDependencies() {
    this.log('Checking dependencies...');

    const deps = [];

    // Check for ImageMagick
    try {
      execSync('which convert', { stdio: 'ignore' });
      deps.push('✓ ImageMagick (convert)');
    } catch {
      try {
        execSync('which magick', { stdio: 'ignore' });
        deps.push('✓ ImageMagick (magick)');
      } catch {
        this.log('ImageMagick not found. Installing via Homebrew...', 'warning');
        try {
          execSync('brew install imagemagick', { stdio: 'inherit' });
          deps.push('✓ ImageMagick (installed)');
        } catch {
          throw new Error('Failed to install ImageMagick. Please install it manually: brew install imagemagick');
        }
      }
    }

    // Check for macOS tools (sips and iconutil)
    if (process.platform === 'darwin') {
      try {
        execSync('which sips', { stdio: 'ignore' });
        deps.push('✓ sips (macOS)');
      } catch {
        throw new Error('sips not found (should be built into macOS)');
      }

      try {
        execSync('which iconutil', { stdio: 'ignore' });
        deps.push('✓ iconutil (macOS)');
      } catch {
        throw new Error('iconutil not found (should be built into macOS)');
      }
    }

    deps.forEach(dep => this.log(dep, 'success'));
    return true;
  }

  validateInput(inputPath) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Check if it's a PNG
    if (!inputPath.toLowerCase().endsWith('.png')) {
      this.log('Warning: Input file is not a PNG. This may cause issues.', 'warning');
    }

    // Try to get image dimensions using sips (macOS) or file command
    try {
      let dimensions;
      if (process.platform === 'darwin') {
        const output = execSync(`sips -g pixelWidth -g pixelHeight "${inputPath}"`, { encoding: 'utf8' });
        const width = output.match(/pixelWidth: (\d+)/)?.[1];
        const height = output.match(/pixelHeight: (\d+)/)?.[1];
        dimensions = { width: parseInt(width), height: parseInt(height) };
      } else {
        const output = execSync(`file "${inputPath}"`, { encoding: 'utf8' });
        const match = output.match(/(\d+) x (\d+)/);
        if (match) {
          dimensions = { width: parseInt(match[1]), height: parseInt(match[2]) };
        }
      }

      if (dimensions) {
        this.log(`Input dimensions: ${dimensions.width}x${dimensions.height}`, 'info');
        if (dimensions.width < 512 || dimensions.height < 512) {
          this.log('Warning: Image is smaller than 512x512. Quality may be reduced.', 'warning');
        }
        if (dimensions.width !== dimensions.height) {
          this.log('Warning: Image is not square. This may cause distortion.', 'warning');
        }
      }
    } catch (error) {
      this.log('Could not determine image dimensions.', 'warning');
    }
  }

  setupDirectories() {
    // Create temp directory
    fs.mkdirSync(this.tempDir, { recursive: true });

    // Create assets directory
    fs.mkdirSync(this.assetsDir, { recursive: true });

    this.log(`Created temp directory: ${this.tempDir}`);
    this.log(`Assets directory: ${this.assetsDir}`);
  }

  createIconSet(inputPath) {
    if (process.platform !== 'darwin') {
      this.log('Skipping ICNS creation (not on macOS)', 'warning');
      return;
    }

    this.log('Creating macOS ICNS file...');

    const iconsetDir = path.join(this.tempDir, 'icon.iconset');
    fs.mkdirSync(iconsetDir);

    // Define all the sizes needed for macOS
    const sizes = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' }
    ];

    // Generate all sizes
    sizes.forEach(({ size, name }) => {
      const outputPath = path.join(iconsetDir, name);
      execSync(`sips -z ${size} ${size} "${inputPath}" --out "${outputPath}"`, { stdio: 'ignore' });
    });

    // Convert to ICNS
    const icnsPath = path.join(this.assetsDir, 'icon.icns');
    execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);

    this.log(`✓ Created: ${icnsPath}`, 'success');
  }

  createIcoFile(inputPath) {
    this.log('Creating Windows ICO file...');

    // Create a 256x256 version first
    const tempPng = path.join(this.tempDir, 'icon-256.png');

    if (process.platform === 'darwin') {
      execSync(`sips -z 256 256 "${inputPath}" --out "${tempPng}"`);
    } else {
      // Use ImageMagick on other platforms
      const magickCmd = this.getMagickCommand();
      execSync(`${magickCmd} "${inputPath}" -resize 256x256 "${tempPng}"`);
    }

    // Convert to ICO
    const icoPath = path.join(this.assetsDir, 'icon.ico');
    const magickCmd = this.getMagickCommand();
    execSync(`${magickCmd} "${tempPng}" "${icoPath}"`);

    this.log(`✓ Created: ${icoPath}`, 'success');
  }

  copyPngFile(inputPath) {
    this.log('Copying PNG file for Linux...');

    const pngPath = path.join(this.assetsDir, 'icon.png');
    fs.copyFileSync(inputPath, pngPath);

    this.log(`✓ Created: ${pngPath}`, 'success');
  }

  getMagickCommand() {
    // Try to use 'magick' first (ImageMagick 7), fall back to 'convert' (ImageMagick 6)
    try {
      execSync('which magick', { stdio: 'ignore' });
      return 'magick';
    } catch {
      return 'convert';
    }
  }

  cleanup() {
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
      this.log('Cleaned up temporary files');
    }
  }

  async convert(inputPath) {
    try {
      this.log('🎨 Electron Icon Converter', 'info');
      this.log('================================', 'info');

      this.checkDependencies();
      this.validateInput(inputPath);
      this.setupDirectories();

      // Create all icon formats
      this.createIconSet(inputPath);
      this.createIcoFile(inputPath);
      this.copyPngFile(inputPath);

      this.log('================================', 'success');
      this.log('✨ Icon conversion completed!', 'success');
      this.log('', 'info');
      this.log('Generated files:', 'info');
      this.log('  • assets/icon.icns (macOS)', 'info');
      this.log('  • assets/icon.ico (Windows)', 'info');
      this.log('  • assets/icon.png (Linux)', 'info');
      this.log('', 'info');
      this.log('Your electron-forge config should use: icon: "./assets/icon"', 'info');

    } catch (error) {
      this.log(`Error: ${error.message}`, 'error');
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }
}

// CLI handling
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
🎨 Electron Icon Converter

Usage: node scripts/convert-icon.js <input-image>

Examples:
  node scripts/convert-icon.js icon.png
  node scripts/convert-icon.js /path/to/logo.png
  node scripts/convert-icon.js assets/source-icon.png

This script will create:
  • assets/icon.icns (macOS)
  • assets/icon.ico (Windows)
  • assets/icon.png (Linux)

Requirements:
  • Input image should be at least 512x512 (1024x1024 recommended)
  • Input should be a square PNG for best results
  • macOS: requires sips and iconutil (built-in)
  • All platforms: requires ImageMagick
    `);
    process.exit(1);
  }

  const inputPath = path.resolve(args[0]);
  const converter = new IconConverter();
  converter.convert(inputPath);
}

if (require.main === module) {
  main();
}

module.exports = IconConverter;