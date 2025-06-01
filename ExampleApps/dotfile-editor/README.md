# 🔧 Dotfile Editor

A powerful dotfile editor for Viberunner that helps you manage and edit your configuration files (.bashrc, .zshrc, .gitconfig, etc.) with Monaco editor integration.

## Features

- **OS-Aware Scanning**: Automatically detects common dotfiles based on your operating system
- **Monaco Editor**: Full-featured code editor with syntax highlighting
- **Smart File Detection**: Shows which files exist and which don't
- **Multiple Language Support**: Syntax highlighting for shell, vim, git config, JSON, YAML, and more
- **Search & Filter**: Find dotfiles quickly with text search
- **Unsaved Changes Tracking**: Visual indicators for modified files
- **Create New Files**: Add custom dotfiles on the fly
- **Dark Theme**: Integrated with Viberunner's dark UI design
- **Responsive Design**: Works on desktop and mobile devices

## Screenshots

### Main Interface
![Dotfile Editor Interface](https://via.placeholder.com/800x600/0a0a0a/ffffff?text=Dotfile+Editor+Interface)

### Editor View
![Monaco Editor](https://via.placeholder.com/800x400/1e1e1e/ffffff?text=Monaco+Editor+with+Syntax+Highlighting)

## Supported Dotfiles

The editor automatically scans for these common configuration files:

### Shell Configuration
- `.bashrc` - Bash shell configuration
- `.bash_profile` - Bash login shell configuration
- `.bash_logout` - Bash logout script
- `.zshrc` - Zsh shell configuration
- `.zsh_profile` - Zsh login shell configuration
- `.profile` - Generic shell profile

### Development Tools
- `.vimrc` - Vim editor configuration
- `.gitconfig` - Git global configuration
- `.gitignore_global` - Global Git ignore file
- `.npmrc` - npm configuration
- `.yarnrc` - Yarn configuration
- `.editorconfig` - Editor configuration

### Terminal & System
- `.tmux.conf` - tmux terminal multiplexer configuration
- `.screenrc` - GNU Screen configuration
- `.inputrc` - Readline input configuration
- `.curlrc` - curl configuration
- `.wgetrc` - wget configuration

### Custom Files
- `.aliases` - Custom command aliases
- `.functions` - Custom shell functions
- `.exports` - Environment variable exports
- `.path` - PATH environment variable configuration

### OS-Specific Files

**macOS:**
- `.bash_sessions_disable` - Disable bash session restore
- `.hushlogin` - Disable login message

**Windows:**
- `.minttyrc` - MinTTY terminal configuration
- `.condarc` - Conda package manager configuration

## Usage

### Getting Started
1. **Launch**: Open the Dotfile Editor in Viberunner
2. **Browse**: See all your dotfiles in the sidebar
3. **Filter**: Use "Show only existing files" to see just the files you have
4. **Search**: Type in the search box to find specific dotfiles

### Editing Files
1. **Select**: Click on any file in the sidebar to open it
2. **Edit**: Use the Monaco editor with full syntax highlighting
3. **Save**: Click the "💾 Save" button or use Ctrl+S
4. **Track Changes**: Unsaved changes are marked with a yellow dot (•)

### Creating New Files
1. Click the "+ New File" button
2. Enter the filename (e.g., `.myconfig`)
3. Start editing immediately

### File Status Indicators
- 📄 **Blue document**: File exists on your system
- 📝 **Yellow document**: File doesn't exist yet (will be created on save)
- **Yellow dot (•)**: File has unsaved changes

## Syntax Highlighting

The editor automatically detects file types and applies appropriate syntax highlighting:

- **Shell files** (.bashrc, .zshrc, etc.): Shell script highlighting
- **Git config** (.gitconfig): INI format highlighting
- **Vim config** (.vimrc): Vim script highlighting
- **JSON files**: JSON syntax highlighting
- **YAML files**: YAML syntax highlighting
- **XML files**: XML syntax highlighting

## Technical Implementation

### Viberunner Build Requirements

**Important**: This app is specifically configured for Viberunner compatibility. Viberunner expects:
- **Bundle Format**: IIFE (Immediately Invoked Function Expression) instead of ES modules
- **Specific Filename**: `dist/bundle.iife.js` (not hashed filenames)
- **Single Bundle**: All code must be bundled into one file using `inlineDynamicImports: true`

The Vite configuration has been customized to meet these requirements:

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        format: 'iife',                    // Required: IIFE format for Viberunner
        entryFileNames: 'bundle.iife.js',  // Required: Specific filename
        chunkFileNames: 'bundle.iife.js',  // Ensure chunks use same name
        assetFileNames: 'bundle.css',      // CSS bundle name
        inlineDynamicImports: true         // Bundle everything into single file
      }
    }
  }
})
```

If you modify this configuration, ensure that:
1. The output format remains `'iife'`
2. The entry file is named `bundle.iife.js`
3. Dynamic imports are inlined for single-file output

### Monaco Editor Configuration

The editor uses a fallback system to avoid CDN dependencies:
- **Primary**: Attempts to load Monaco Editor dynamically for full IDE features
- **Fallback**: Simple textarea-based editor if Monaco fails to load
- **No CDN**: All resources are bundled locally, no external dependencies

This approach ensures the app works reliably in Viberunner's sandboxed environment.

### Mock File System
Since this runs in a browser environment, the editor uses a mock file system that:
- Simulates common dotfiles with realistic sample content
- Tracks file existence and modification states
- Provides sample configurations for learning

### Real Implementation Notes
In a production environment with file system access, this would:
- Use Node.js fs module or Electron APIs for file operations
- Read actual files from the user's home directory
- Write changes back to the real file system
- Watch for external file changes

### Editor Features
- Monaco Editor with VS Code-like experience
- Automatic language detection
- Code folding and minimap
- Find/replace functionality
- Multiple cursors
- IntelliSense for supported languages

## Development

### Prerequisites
- Node.js 18+
- React 18+
- TypeScript 5+

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production (Viberunner-compatible)
npm run build
```

**Note**: The build process is configured specifically for Viberunner compatibility. The output will be a single `bundle.iife.js` file instead of the typical ES modules with hashed names that Vite normally generates.

### Dependencies
- `@monaco-editor/react` - Monaco editor React component
- `react` - React framework
- `react-dom` - React DOM rendering
- `vite` - Build tool and dev server
- `typescript` - Type checking

## Security & Privacy

- **Local Only**: All file operations are local to your machine
- **No Network**: Does not send configuration data anywhere
- **Mock Environment**: Current implementation uses sample data for safety
- **User Control**: You decide what to edit and save

## Troubleshooting

### Build Issues

**Bundle not found error** (`Bundle not found: .../dist/bundle.iife.js`)
- Ensure you've run `npm run build` after any changes
- Verify that `dist/bundle.iife.js` exists in the output directory
- Check that Vite config uses `format: 'iife'` and `entryFileNames: 'bundle.iife.js'`

**Vite generating wrong file format**
- Default Vite generates ES modules with hashed filenames
- Viberunner requires IIFE format with specific naming
- Use the provided `vite.config.ts` without modifications

**Monaco Editor CDN errors**
- The fallback system should handle this automatically
- Check browser console - should show "Using simple text editor as Monaco Editor failed to load"
- Ensure `@monaco-editor/react` is installed but don't worry about CDN failures

### Common Issues

**Monaco Editor Not Loading**
- Ensure `@monaco-editor/react` is properly installed
- Check browser console for JavaScript errors
- Verify internet connection for CDN resources

**File Not Saving**
- Check browser console for error messages
- Ensure file permissions in real implementation
- Verify file path format for your OS

**Search Not Working**
- Case-insensitive search should work automatically
- Try clearing the search box and typing again
- Check if "Show only existing files" is affecting results

## Future Enhancements

- **Real File System Integration**: Connect to actual file system APIs
- **File Backup**: Automatic backup before making changes
- **Syntax Validation**: Real-time error checking for configuration files
- **Import/Export**: Backup and restore dotfile configurations
- **Templates**: Common dotfile templates for quick setup
- **Diff View**: Compare current file with saved version
- **Multi-file Search**: Search content across all dotfiles
- **Custom File Associations**: Add support for more file types

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - Feel free to modify and distribute.

---

**Note**: This is a Viberunner visualizer. The current implementation uses mock data for demonstration purposes. In a production environment, proper file system APIs would be integrated for real file operations.