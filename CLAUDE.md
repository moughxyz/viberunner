# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
- `npm run dev` - Start development mode with Vite
- `npm run build` - Build the TypeScript and Vite application for production
- `npm run preview` - Preview the built application
- `npm run lint` - Run ESLint with TypeScript support

### Electron Development
- `npm run start` - Start the Electron application in development mode
- `npm run package` - Package the app for distribution
- `npm run make` - Create distribution packages (DMG, ZIP, etc.)
- `npm run rebuild` - Rebuild native modules for Electron

### Testing Commands
Currently no test runner is configured - tests would need to be added.

## Architecture Overview

### Application Structure
Viberunner is an Electron app that serves as a desktop runtime for "runner" applications. It follows a main/renderer process architecture:

- **Main Process** (`src/main/index.ts`): Handles Electron window management, IPC, auto-updates, and system integration
- **Renderer Process** (`src/renderer/`): React-based UI with direct Node.js access (nodeIntegration enabled)

### Key Architectural Concepts

#### Runner System
The core concept is "runners" - React-based applications that can process files or run standalone:
- **File-based runners**: Triggered by file drops, with sophisticated matching based on MIME types, filenames, content patterns
- **Standalone runners**: Utility apps that run independently
- **Enhanced Matching**: Priority-based system supporting filename patterns, content analysis, file size filters

#### Tab System
Chrome-style tabbed interface where each tab can contain:
- New Tab (launcher interface)
- File-based runner instances
- Standalone utility runners
- AI Agent interface

#### Direct Node.js Access
Unlike typical Electron apps, this enables `nodeIntegration` in the renderer, allowing runners direct access to:
- File system operations (`fs`)
- Path utilities (`path`)
- Child processes (`spawn`, `exec`)
- Any Node.js module via `require()`

### File Locations

#### Key Configuration Files
- `forge.config.js` - Electron Forge packaging configuration
- `vite.config.mjs` - Vite build configuration for renderer
- `package.json` - Main application dependencies and scripts

#### Core Components
- `src/renderer/App.tsx` - Main application component with tab management
- `src/renderer/components/AIAgentInterface.tsx` - Claude API integration for runner building
- `src/renderer/services/` - Service layer for API calls and command execution
- `src/renderer/preferences.ts` - User preferences management

#### Runner Integration
- `src/renderer/util.ts` - Utilities including runners directory resolution
- `src/renderer/prompts/newRunner.ts` - AI prompts for runner generation

### Important Implementation Details

#### CSS Isolation
The app implements automatic CSS scoping for runners to prevent style conflicts:
- Each runner gets a unique `data-app-id` attribute
- CSS selectors are automatically prefixed during runtime
- Isolation wrapper ensures runners don't affect the main UI

#### Cleanup System
Runners register cleanup callbacks to prevent memory leaks:
```javascript
registerCleanup(tabId, cleanupFunction)
```

#### Preferences API
Runners can store persistent user preferences:
```javascript
api.getRunnerPreference(runnerId, key, defaultValue)
api.updateRunnerPreference(runnerId, key, value)
```

### Development Rules

#### Key Constraints
- **Do not use semicolons** in JavaScript/TypeScript (per `.cursor/rules/Always.mdc`)
- **Node integration is enabled** - no need for IPC for most operations
- **Don't run the app yourself** - the user handles app execution
- **Runners directory is at `ExampleApps/`** (legacy naming)

#### API Integration
- Uses `@anthropic-ai/sdk` directly in renderer for AI agent functionality
- Claude API key stored in user preferences
- Real-time runner generation and building capabilities

### Build Process
1. Vite builds the renderer process to `dist/`
2. TypeScript compiles main process to `dist-electron/`
3. Electron Forge packages everything using the build hook in `forge.config.js`

### Runner Development Flow
1. User describes desired functionality to AI agent
2. AI generates complete runner with React component, build config, package.json
3. Command executor service runs `npm install` and `npm run build`
4. Built runner becomes available in the runners directory
5. Automatic reload makes new runner immediately usable

This architecture enables rapid creation and deployment of custom desktop utilities with full system access while maintaining proper isolation and resource management.