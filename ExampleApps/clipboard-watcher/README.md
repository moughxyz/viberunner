# 📋 Clipboard Watcher

A real-time clipboard monitoring visualizer for Vibeframe that tracks clipboard history with advanced search and filtering capabilities.

## Features

- **Real-time Monitoring**: Automatically tracks clipboard changes every second
- **Smart Search**: Text search with optional regex pattern matching
- **Content Type Detection**: Identifies text, HTML, images, and other content types
- **Copy Functionality**: Click to copy any historical entry back to clipboard
- **Export History**: Download clipboard history as JSON
- **Dark Theme**: Integrated with Vibeframe's dark UI design
- **Pause/Resume**: Control monitoring with easy toggle
- **Size Tracking**: Shows content size for each entry
- **History Limit**: Maintains last 100 clipboard entries for performance

## Screenshots

### Main Interface
![Clipboard Watcher Interface](https://via.placeholder.com/800x600/0a0a0a/ffffff?text=Clipboard+Watcher+Interface)

### Search & Filter
![Search Functionality](https://via.placeholder.com/800x400/1e1e1e/ffffff?text=Search+%26+Regex+Filtering)

## Usage

1. **Launch**: Open as a standalone visualizer in Vibeframe
2. **Monitor**: Copy text/content - it will automatically appear in the history
3. **Search**: Use the search box to find specific content
4. **Regex**: Enable regex mode for pattern matching
5. **Copy Back**: Click the copy button on any entry to restore it to clipboard
6. **Export**: Save your clipboard history as a JSON file
7. **Control**: Pause/resume monitoring as needed

## Content Types

The visualizer automatically detects and categorizes:

- 📝 **Text**: Plain text content
- 🌐 **HTML**: HTML markup and web content
- 🖼️ **Image**: Image data URLs and base64 images
- 📄 **Other**: Any other content format

## Search Features

### Text Search
- Case-insensitive substring matching
- Real-time filtering as you type
- Shows match count

### Regex Search
- Enable with the "Regex" checkbox
- Pattern matching with full regex support
- Graceful fallback to text search for invalid patterns
- Case-insensitive by default (uses `gi` flags)

### Example Searches

**Text Search:**
- `password` - Find all entries containing "password"
- `https://` - Find all URLs
- `TODO` - Find all todo items

**Regex Search:**
- `^\d+$` - Find entries that are only numbers
- `\b[A-Z]{2,}\b` - Find entries with uppercase abbreviations
- `\d{4}-\d{2}-\d{2}` - Find dates in YYYY-MM-DD format
- `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` - Find email addresses

## Technical Details

### Clipboard Access
- Uses Electron's clipboard API when available
- Falls back to web Clipboard API in browser environments
- Handles permissions gracefully with error messaging

### Performance
- 1-second polling interval for balance between responsiveness and performance
- Maintains maximum 100 entries to prevent memory issues
- Efficient duplicate detection to avoid spam

### Data Format
Exported JSON structure:
```json
{
  "exported": "2024-01-15T10:30:00.000Z",
  "entries": [
    {
      "id": "1705312200000",
      "content": "Sample clipboard content",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "type": "text",
      "size": 24
    }
  ]
}
```

## Security & Privacy

- **Local Only**: All clipboard data stays on your machine
- **No Network**: Does not send clipboard data anywhere
- **Temporary Storage**: Data is not persisted between sessions
- **User Control**: Easy clear and pause functionality

## Development

### Build from Source

```bash
# Clone and setup
git clone [repository]
cd clipboard-watcher
npm install

# Development
npm run dev

# Build for production
npm run build
```

### Requirements
- Node.js 18+
- React 18+
- Vite 5+
- TypeScript 5+

## Troubleshooting

### Clipboard Access Issues
- **Browser**: Grant clipboard permissions when prompted
- **Electron**: Should work automatically with proper Electron setup
- **Security**: Some browsers block clipboard access in insecure contexts

### Performance
- If memory usage is high, use the "Clear" button to reset history
- Pause monitoring when not needed to reduce CPU usage
- Large content (images) may impact performance

### Search Problems
- Invalid regex patterns automatically fall back to text search
- Case sensitivity only affects text search (regex uses 'gi' flags)
- Special characters in text search are treated literally

## License

MIT License - Feel free to modify and distribute.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: This is a standalone Vibeframe visualizer. It does not require any file input and runs independently as a utility application.