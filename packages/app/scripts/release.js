#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function colorize(text, color) {
  return `${colors[color]}${text}${colors.reset}`;
}

function log(message, color = 'reset') {
  console.log(colorize(message, color));
}

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim().toLowerCase());
    });
  });
}

function getPackageJson() {
  const packagePath = path.resolve(process.cwd(), 'package.json');
  try {
    const packageData = fs.readFileSync(packagePath, 'utf8');
    return JSON.parse(packageData);
  } catch (error) {
    log(`❌ Error reading package.json: ${error.message}`, 'red');
    process.exit(1);
  }
}

function writePackageJson(packageData) {
  const packagePath = path.resolve(process.cwd(), 'package.json');
  try {
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
    log(`✅ Updated package.json`, 'green');
  } catch (error) {
    log(`❌ Error writing package.json: ${error.message}`, 'red');
    process.exit(1);
  }
}

function writeReleaseJson(version) {
  // Go up to workspace root, then down to packages/common/src
  const workspaceRoot = path.resolve(process.cwd(), '../../');
  const releasePath = path.resolve(workspaceRoot, 'packages/common/src/release.json');
  const releaseDir = path.dirname(releasePath);

  // Create directory if it doesn't exist
  try {
    if (!fs.existsSync(releaseDir)) {
      fs.mkdirSync(releaseDir, { recursive: true });
    }
  } catch (error) {
    log(`❌ Error creating directory ${releaseDir}: ${error.message}`, 'red');
    process.exit(1);
  }

  const releaseData = {
    production: `v${version}`,
    downloads: {
      windows: `https://github.com/moughxyz/viberunner/releases/download/v${version}/Viberunner-${version}.Setup.exe`,
      macOS: {
        dmg: `https://github.com/moughxyz/viberunner/releases/download/v${version}/Viberunner.dmg`,
        arm64: `https://github.com/moughxyz/viberunner/releases/download/v${version}/Viberunner-darwin-arm64-${version}.zip`
      },
      linux: {
        deb: `https://github.com/moughxyz/viberunner/releases/download/v${version}/viberunner_${version}_amd64.deb`,
        rpm: `https://github.com/moughxyz/viberunner/releases/download/v${version}/viberunner-${version}-1.x86_64.rpm`
      }
    }
  };

  try {
    fs.writeFileSync(releasePath, JSON.stringify(releaseData, null, 2) + '\n');
    log(`✅ Updated release.json`, 'green');
  } catch (error) {
    log(`❌ Error writing release.json: ${error.message}`, 'red');
    process.exit(1);
  }
}

function parseVersion(version) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2]
  };
}

function bumpVersion(currentVersion, bumpType) {
  const version = parseVersion(currentVersion);

  switch (bumpType) {
    case 'major':
      version.major++;
      version.minor = 0;
      version.patch = 0;
      break;
    case 'minor':
      version.minor++;
      version.patch = 0;
      break;
    case 'patch':
      version.patch++;
      break;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }

  return `${version.major}.${version.minor}.${version.patch}`;
}

function executeCommand(command, description) {
  try {
    log(`🔄 ${description}...`, 'blue');
    const result = execSync(command, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    log(`✅ ${description} completed`, 'green');
    return result.trim();
  } catch (error) {
    log(`❌ Error during ${description.toLowerCase()}: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkGitStatus() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      log(`⚠️  Warning: You have uncommitted changes:`, 'yellow');
      console.log(status);
      return false;
    }
    return true;
  } catch (error) {
    log(`❌ Error checking git status: ${error.message}`, 'red');
    process.exit(1);
  }
}

function checkGitRemote() {
  try {
    const remotes = execSync('git remote -v', { encoding: 'utf8' });
    if (!remotes.includes('origin')) {
      log(`❌ No 'origin' remote found. Please set up a git remote first.`, 'red');
      process.exit(1);
    }
    log(`✅ Git remote found`, 'green');
  } catch (error) {
    log(`❌ Error checking git remotes: ${error.message}`, 'red');
    process.exit(1);
  }
}

async function main() {
  log('🚀 Viberunner Release Script', 'bold');
  log('==============================\n', 'bold');

  // Check git status and remotes
  checkGitRemote();
  const isClean = checkGitStatus();

  if (!isClean) {
    const proceed = await prompt(colorize('Do you want to proceed anyway? (y/N): ', 'yellow'));
    if (proceed !== 'y' && proceed !== 'yes') {
      log('❌ Release cancelled. Please commit your changes first.', 'red');
      process.exit(0);
    }
  }

  // Get current version
  const packageData = getPackageJson();
  const currentVersion = packageData.version;

  log(`📦 Current version: ${colorize(currentVersion, 'cyan')}`, 'blue');

  // Ask for bump type
  log('\n🔼 Version bump options:', 'bold');
  log('  1. patch   - Bug fixes (0.0.X)', 'cyan');
  log('  2. minor   - New features (0.X.0)', 'cyan');
  log('  3. major   - Breaking changes (X.0.0)', 'cyan');

  const bumpChoice = await prompt(colorize('\nWhich version bump? (1/2/3 or patch/minor/major): ', 'yellow'));

  let bumpType;
  switch (bumpChoice) {
    case '1':
    case 'patch':
    case 'p':
      bumpType = 'patch';
      break;
    case '2':
    case 'minor':
    case 'm':
      bumpType = 'minor';
      break;
    case '3':
    case 'major':
    case 'maj':
      bumpType = 'major';
      break;
    default:
      log('❌ Invalid choice. Please enter 1, 2, 3, or patch/minor/major', 'red');
      rl.close();
      process.exit(1);
  }

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bumpType);

  log(`\n📈 Version will be bumped from ${colorize(currentVersion, 'cyan')} to ${colorize(newVersion, 'green')} (${colorize(bumpType, 'yellow')} bump)`, 'blue');

  // Confirm the release
  const confirm = await prompt(colorize('\nProceed with release? (Y/n): ', 'yellow'));
  if (confirm === 'n' || confirm === 'no') {
    log('❌ Release cancelled', 'red');
    rl.close();
    process.exit(0);
  }

  rl.close();

  log('\n🔨 Starting release process...', 'bold');

  // Update package.json
  packageData.version = newVersion;
  writePackageJson(packageData);

  // Update release.json
  writeReleaseJson(newVersion);

  // Git operations
  executeCommand('git add package.json ../../packages/common/src/release.json', 'Adding package.json and release.json to git');
  executeCommand(`git commit -m "chore: bump version to ${newVersion}"`, 'Committing version bump');
  executeCommand(`git tag -a v${newVersion} -m "Release v${newVersion}"`, 'Creating git tag');
  executeCommand('git push origin main', 'Pushing commits to remote');
  executeCommand(`git push origin v${newVersion}`, 'Pushing tag to remote');

  log('\n🎉 Release completed successfully!', 'bold');
  log(`📋 Summary:`, 'bold');
  log(`   • Version bumped: ${currentVersion} → ${newVersion}`, 'cyan');
  log(`   • Tag created: v${newVersion}`, 'cyan');
  log(`   • Changes pushed to remote`, 'cyan');
  log(`\n🔄 GitHub Actions will now build and publish the release automatically.`, 'green');
  log(`📥 Check the Actions tab in your GitHub repository for build progress.`, 'blue');
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  log('\n❌ Release cancelled by user', 'red');
  rl.close();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  log(`❌ Unexpected error: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});

main().catch((error) => {
  log(`❌ Release failed: ${error.message}`, 'red');
  rl.close();
  process.exit(1);
});