export const templates = [
  {
    name: "Clipboard Manager",
    description: "a clipboard manager that shows recent history",
    prompt: "a clipboard manager that shows recent history",
  },
  {
    name: "Daily Notes",
    description: "a note for every day saved to a file",
    prompt: `
      create a new runner called Daily Notes:

      here's how it looks structurally

      [ [today] | [today - 1] | [today - 2] ... [today - n | infinite horizontal scroll] ] [Calendar Picker] [Settings]
      [
      textarea displaying the contents of the daily note
      ]

      - Each daily note is .txt file (create it if it doesn't exit)
      - User can change this directory and the preference is saved via the parent app's (viberunner) prefs API
      - Changing the directroy does not transfer any of the existing txt files. user must be instructed to manually copy paste old files into new directory
      - User should be able to "Show notes directory" to reveal in finder
      - Date format should be localized in the format "May 12"
      `,
  },
  {
    name: "Image Redactor",
    description: "a tool to redact sensitive information from images",
    prompt: `
      create a new contextual runner called Image Redactor:

      1. Allows the user to draw rectangles to redact sensitive information from images
      2. Rectangle opacity should be 100%
      3. Allow the rectangle to blur whats underneath, or be a solid black rectangle
      4. The user can save the redacted image as a copy (save with one click in the same directory as the input)

      `,
  },
  {
    name: "QR Code Generator/Scanner",
    description:
      "generate QR codes for text/URLs and scan from screen or clipboard",
    prompt: `
      create a new runner called QR Code Generator/Scanner:

      1. Two main modes: Generate and Scan
      2. Generate mode:
         - Input field for text or URL
         - Size adjustment slider (small, medium, large)
         - Error correction level options
         - Generate QR code and display preview
         - Save QR code as PNG/SVG with one click
         - Copy QR code to clipboard
      3. Scan mode:
         - Scan QR codes from clipboard image
         - Screen capture tool to select area and scan
         - Display decoded text/URL with copy button
         - For URLs, show "Open in Browser" button
      4. History of recently generated/scanned codes
      `,
  },
  {
    name: "Password Generator",
    description:
      "create secure passwords with customizable criteria and strength checker",
    prompt: `
      create a new runner called Password Generator:

      1. Customizable password criteria:
         - Length slider (8-128 characters)
         - Include uppercase letters (A-Z)
         - Include lowercase letters (a-z)
         - Include numbers (0-9)
         - Include symbols (!@#$%^&*)
         - Exclude ambiguous characters (0, O, l, 1, etc.)
      2. Generate button that creates a new password
      3. Password strength indicator (weak/medium/strong/very strong)
      4. One-click copy to clipboard
      5. Show/hide password toggle
      6. Generate multiple passwords at once (1-10)
      7. Password history with timestamps (last 20 generated)
      8. Passphrase generator using common words with customizable word count and separator
      `,
  },
  {
    name: "Unit Converter",
    description:
      "convert between different units for length, weight, temperature, currency",
    prompt: `
      create a new runner called Unit Converter:

      1. Category tabs: Length, Weight, Temperature, Volume, Area, Speed, Time, Data/Storage
      2. Two-way conversion interface:
         - Input field for "From" value
         - Dropdown for "From" unit
         - Input field for "To" value (auto-calculated)
         - Dropdown for "To" unit
         - Swap button to flip from/to units
      3. Common conversions for each category:
         - Length: mm, cm, m, km, in, ft, yd, mi
         - Weight: g, kg, oz, lb, stone, ton
         - Temperature: Celsius, Fahrenheit, Kelvin
         - Volume: ml, l, fl oz, cup, pint, qt, gal
         - Area: sq cm, sq m, sq km, sq in, sq ft, sq yd, acres
         - Speed: m/s, km/h, mph, knots
         - Data: B, KB, MB, GB, TB, bits, Kbits, Mbits, Gbits
      4. Real-time conversion as user types
      5. Copy result to clipboard
      6. Recently used conversions history
      `,
  },
  {
    name: "Pomodoro Timer",
    description:
      "focus timer with break intervals, session tracking, and statistics",
    prompt: `
      create a new runner called Pomodoro Timer:

      1. Timer display with large, easy-to-read countdown
      2. Customizable intervals:
         - Work session (default 25 minutes)
         - Short break (default 5 minutes)
         - Long break (default 15 minutes)
         - Sessions before long break (default 4)
      3. Timer controls:
         - Start/Pause/Stop buttons
         - Skip to next session
         - Reset current session
      4. Visual and audio notifications:
         - System notification when session ends
         - Optional sound alerts (customizable)
         - Optional desktop notification with custom messages
      5. Session tracking:
         - Today's completed pomodoros count
         - Weekly/monthly statistics
         - Total focus time tracked
         - Session history with timestamps
      6. Minimalist progress indicator showing current session and cycle progress
      7. Optional always-on-top mode for the timer
      8. Background color changes based on session type (work=red, break=green)
      `,
  },
  {
    name: "Color Picker & Palette",
    description:
      "pick colors from screen, generate harmonious palettes, save swatches",
    prompt: `
      create a new runner called Color Picker & Palette:

      1. Color picker modes:
         - Screen color picker (crosshair cursor to pick any pixel)
         - Manual color input (HEX, RGB, HSL, HSV)
         - Color wheel/slider interface
      2. Color format display and conversion:
         - HEX (#FF5733)
         - RGB (255, 87, 51)
         - HSL (9°, 100%, 60%)
         - HSV (9°, 80%, 100%)
         - One-click copy for any format
      3. Palette generation:
         - Complementary colors
         - Triadic colors
         - Analogous colors
         - Monochromatic variations
         - Custom palette builder
      4. Saved swatches:
         - Save favorite colors with custom names
         - Organize in collections/folders
         - Export palettes as .ase, .gpl, or JSON
         - Import existing palette files
      5. Color accessibility tools:
         - Contrast ratio checker between two colors
         - WCAG compliance indicators
         - Color blindness simulator
      6. Recent colors history (last 20 picked)
      `,
  },
  {
    name: "JSON/XML Formatter",
    description:
      "format, validate, and minify JSON/XML with syntax highlighting",
    prompt: `
      create a new runner called JSON/XML Formatter:

      1. Two main modes: JSON and XML (tab interface)
      2. Input area:
         - Large textarea for pasting/typing JSON/XML
         - File drop zone to load from files
         - Paste from clipboard button
      3. Output area:
         - Formatted/beautified output with syntax highlighting
         - Line numbers
         - Collapsible/expandable sections for nested objects
      4. Action buttons:
         - Format/Beautify (with custom indentation: 2, 4 spaces or tabs)
         - Minify/Compress
         - Validate (show errors with line numbers)
         - Copy formatted output
         - Save to file
      5. JSON-specific features:
         - Convert to different formats (YAML, CSV for arrays)
         - Path explorer (click on keys to show JSONPath)
         - Type indicators (string, number, boolean, null, array, object)
      6. XML-specific features:
         - Pretty print with proper indentation
         - Attribute formatting options
         - XPath support for querying
      7. Settings:
         - Theme selection (dark/light)
         - Font size adjustment
         - Auto-format on paste option
      `,
  },
  {
    name: "Base64 Encoder/Decoder",
    description: "encode/decode base64, URL encoding, hex conversion",
    prompt: `
      create a new runner called Base64 Encoder/Decoder:

      1. Encoding types tabs: Base64, URL Encoding, Hex, Binary
      2. Two-panel interface:
         - Input panel (left): Raw text or encoded data
         - Output panel (right): Converted result
         - Bidirectional arrows to switch encode/decode mode
      3. Base64 features:
         - Standard Base64 encoding/decoding
         - URL-safe Base64 variant
         - File encoding support (drag & drop files)
         - Image preview for encoded images
      4. URL Encoding features:
         - Percent encoding/decoding
         - Component vs full URL encoding options
         - Reserved characters handling
      5. Hex features:
         - Hex to text and text to hex
         - Uppercase/lowercase hex options
         - Byte separator options (none, space, colon, dash)
      6. Binary features:
         - Text to binary and binary to text
         - 8-bit grouping with spaces
         - ASCII value display
      7. Utility features:
         - One-click copy for input/output
         - Clear all button
         - Swap input/output button
         - Character/byte count display
         - Auto-detect encoding type
         - Batch processing for multiple inputs
      `,
  },
  {
    name: "Hash Generator",
    description: "generate MD5, SHA1, SHA256 hashes for text or files",
    prompt: `
      create a new runner called Hash Generator:

      1. Hash algorithm selection:
         - MD5, SHA1, SHA224, SHA256, SHA384, SHA512
         - CRC32, Adler32
         - HMAC variants with key input
      2. Input methods:
         - Text input textarea
         - File drag & drop zone
         - Paste from clipboard
         - Direct file browser selection
      3. Output display:
         - All selected hash types computed simultaneously
         - Uppercase/lowercase toggle for hex output
         - One-click copy for each hash
         - Export all hashes to text file
      4. File processing:
         - Progress bar for large files
         - File metadata display (name, size, type, modified date)
         - Batch processing for multiple files
         - Compare hashes between files
      5. Hash comparison:
         - Input field to paste expected hash
         - Visual match/mismatch indicator
         - Difference highlighting for close matches
      6. Advanced features:
         - Salt input for additional security
         - Iteration count for key derivation functions
         - Base64 output option alongside hex
         - Hash history with timestamps
         - Verify file integrity by comparing with known hashes
      7. Performance indicators:
         - Processing time display
         - Throughput calculation (MB/s for files)
      `,
  },
  {
    name: "Regex Tester",
    description: "test regular expressions with live matching and explanation",
    prompt: `
      create a new runner called Regex Tester:

      1. Three-panel layout:
         - Regex pattern input (top)
         - Test string input (middle)
         - Results and explanation (bottom)
      2. Regex pattern features:
         - Syntax highlighting for regex patterns
         - Flag checkboxes (global, ignore case, multiline, dotall, unicode, sticky)
         - Common regex library/presets dropdown
         - Pattern validation with error indicators
      3. Test string area:
         - Multi-line text input
         - File import for testing against file contents
         - Sample text generator for common patterns (emails, URLs, etc.)
      4. Live matching results:
         - Highlighted matches in the test string
         - Match groups displayed with different colors
         - Numbered capture groups
         - Match count and position indicators
      5. Detailed results panel:
         - List of all matches with indices
         - Capture groups breakdown for each match
         - Replace preview (find & replace functionality)
         - Export matches to JSON/CSV
      6. Regex explanation:
         - Human-readable breakdown of the pattern
         - Character class explanations
         - Quantifier meanings
         - Special character escapes
      7. Quick tools:
         - Escape/unescape special characters
         - Generate regex for common patterns (email, phone, date)
         - Regex cheat sheet reference
         - Performance analysis (execution time, steps)
      8. History and favorites:
         - Save frequently used patterns
         - Recent patterns history
         - Pattern sharing (export/import)
      `,
  },
  {
    name: "Lorem Ipsum Generator",
    description: "generate placeholder text with various styles and lengths",
    prompt: `
      create a new runner called Lorem Ipsum Generator:

      1. Text type selection:
         - Classic Lorem Ipsum (Latin)
         - Hipster Ipsum (trendy/quirky phrases)
         - Bacon Ipsum (meat-themed)
         - Corporate Ipsum (business jargon)
         - Cupcake Ipsum (sweet-themed)
         - Pirate Ipsum (nautical/pirate themed)
         - Custom word list input
      2. Generation options:
         - Generate by: words, sentences, paragraphs
         - Quantity slider/input (1-1000)
         - Start with "Lorem ipsum dolor sit amet..." checkbox
         - HTML formatting options (paragraphs, lists, headings)
      3. Output formatting:
         - Plain text
         - HTML with <p> tags
         - Markdown format
         - Bulleted/numbered lists
         - Mixed content (headers, paragraphs, lists)
      4. Advanced options:
         - Sentence length variation (short, medium, long, mixed)
         - Add random HTML tags (strong, em, a, code)
         - Include random numbers/dates
         - Capitalization styles (sentence case, title case, all caps)
      5. Output controls:
         - Live preview with formatting
         - One-click copy to clipboard
         - Download as .txt file
         - Word/character count display
         - Regenerate button for new random text
      6. Presets:
         - Quick generation buttons (50 words, 3 paragraphs, etc.)
         - Save custom presets
         - Template system for repeated use
      7. Special generators:
         - Email template filler
         - Blog post structure generator
         - Product description generator
         - Social media post length variants
      `,
  },
  {
    name: "Screenshot Annotator",
    description:
      "capture screenshots and add arrows, text, highlights for documentation",
    prompt: `
      create a new contextual runner called Screenshot Annotator:

      1. Screenshot capture modes:
         - Full screen capture
         - Window selection (click on window)
         - Custom area selection (drag to select region)
         - Timed capture (3, 5, 10 second delay)
         - Import existing image from file/clipboard
      2. Annotation tools:
         - Arrow tool (various styles: straight, curved, different heads)
         - Text boxes with customizable fonts, sizes, and colors
         - Highlighting (semi-transparent rectangles and freehand)
         - Shapes (rectangles, circles, lines) with fill/outline options
         - Blur/pixelate tool for sensitive information
         - Magnifier/zoom callouts for detail emphasis
      3. Drawing controls:
         - Color picker with preset palette and custom colors
         - Stroke width adjustment (1-20px)
         - Opacity slider for all elements
         - Layer management (bring to front/back, delete individual annotations)
      4. Text annotation features:
         - Multiple font families and sizes
         - Bold, italic, underline formatting
         - Text alignment options
         - Auto-sizing text boxes
         - Numbered callouts (1, 2, 3...)
      5. Export and sharing:
         - Save to various formats (PNG, JPG, PDF, SVG)
         - Copy to clipboard with one click
         - Auto-save to designated screenshots folder
         - Quick share via email or messaging apps
         - Print with scaling options
      6. Advanced features:
         - Undo/redo functionality (up to 50 steps)
         - Keyboard shortcuts for all tools
         - Templates for common annotation layouts
         - Batch processing for multiple screenshots
         - Watermark/signature addition
      `,
  },
  {
    name: "Font Preview",
    description:
      "preview installed system fonts with custom text and export samples",
    prompt: `
      create a new runner called Font Preview:

      1. Font discovery and listing:
         - Scan and list all installed system fonts
         - Font family grouping (serif, sans-serif, monospace, script, display)
         - Search and filter fonts by name or category
         - Recently used fonts section
         - Favorite fonts with star rating system
      2. Preview interface:
         - Large preview area showing selected font
         - Custom text input (default: "The quick brown fox...")
         - Multiple preview texts (alphabet, numbers, punctuation, pangrams)
         - Font size slider (8px to 200px)
         - Real-time preview updates as you type
      3. Font information display:
         - Font family name and style variants
         - Font format (TTF, OTF, WOFF, etc.)
         - Character set support and language coverage
         - Font metrics (ascender, descender, line height)
         - License information if available
      4. Comparison tools:
         - Side-by-side font comparison (up to 4 fonts)
         - Same text rendered in multiple fonts
         - Font pairing suggestions for headers/body combinations
         - Typography harmony checker
      5. Export and sharing:
         - Export font samples as images (PNG, SVG)
         - Generate font specimen sheets (complete character set)
         - Create font comparison charts
         - PDF export with multiple fonts and sizes
         - Copy font names to clipboard for CSS/design tools
      6. Advanced features:
         - Font weight and style variations (if available)
         - OpenType feature testing (ligatures, small caps, etc.)
         - Web font CDN link generation for Google Fonts
         - Font loading performance testing
         - Custom text templates for different use cases
      7. Integration features:
         - Import text from files for testing
         - Generate Lorem Ipsum in selected fonts
         - Color background options for contrast testing
         - Print preview with different paper sizes
      `,
  },
  {
    name: "Image Compressor",
    description:
      "batch compress images with quality/size controls and format conversion",
    prompt: `
      create a new contextual runner called Image Compressor:

      1. File input methods:
         - Drag and drop multiple images
         - File browser selection (individual or bulk)
         - Folder selection for batch processing
         - Paste images from clipboard
         - Supported formats: JPG, PNG, GIF, WebP, TIFF, BMP
      2. Compression settings:
         - Quality slider (1-100%) with live preview
         - Target file size input (compress until size reached)
         - Preset options (web optimized, email friendly, high quality)
         - Lossless vs lossy compression toggle
         - Advanced codec settings for each format
      3. Output format options:
         - Convert between formats (JPG ↔ PNG ↔ WebP ↔ AVIF)
         - Maintain original format or batch convert
         - Progressive JPEG encoding option
         - PNG optimization (palette reduction, bit depth)
      4. Resize options:
         - Maintain aspect ratio or custom dimensions
         - Percentage scaling (25%, 50%, 75%, etc.)
         - Maximum width/height constraints
         - Smart cropping for specific aspect ratios
         - Batch resize with consistent dimensions
      5. Processing interface:
         - Preview panel showing before/after comparison
         - File size reduction statistics (original vs compressed)
         - Processing progress bar for batch operations
         - Estimated time remaining for large batches
         - Quality comparison viewer (zoom, pan)
      6. Output management:
         - Choose output directory or overwrite originals
         - Custom naming patterns (prefix, suffix, numbering)
         - Organize output by date, size, or format
         - Compression report with statistics
         - Undo/restore original files option
      7. Advanced features:
         - EXIF data handling (preserve, strip, or selective)
         - Color profile management (sRGB, Adobe RGB)
         - Watermark addition with transparency
         - Batch image optimization for web (multiple sizes)
         - Integration with popular image hosting services
      `,
  },
  {
    name: "Emoji Picker",
    description: "browse, search, and copy emojis with categories and favorites",
    prompt: `
      create a new runner called Emoji Picker:

      1. Emoji organization:
         - Category tabs (Smileys, People, Animals, Food, Travel, Objects, Symbols, Flags)
         - Sub-categories within each main category
         - Recently used emojis section (persistent across sessions)
         - Frequently used emojis with usage statistics
         - Personal favorites with custom organization
      2. Search functionality:
         - Real-time search by emoji name or keyword
         - Multiple language support for search terms
         - Tag-based search (happy, sad, food, etc.)
         - Fuzzy search for approximate matches
         - Search history with quick access
      3. Emoji display:
         - Grid layout with adjustable emoji size
         - Hover tooltips showing emoji names and keywords
         - Unicode code point display
         - Skin tone variations for applicable emojis
         - Animated emoji support (where available)
      4. Copy and usage:
         - One-click copy to clipboard
         - Multiple copy formats (emoji, unicode, HTML entity, shortcode)
         - Quick paste history (last 20 copied emojis)
         - Bulk copy multiple emojis as text string
      5. Advanced features:
         - Emoji combinations and suggestions
         - Trending emojis based on usage patterns
         - Custom emoji collections and folders
         - Import/export emoji collections
         - Emoji usage analytics and statistics
      6. Platform compatibility:
         - Preview how emojis appear on different platforms
         - Compatibility checker (which platforms support each emoji)
         - Version information (Unicode version, when introduced)
         - Fallback suggestions for unsupported emojis
      7. Productivity features:
         - Emoji keyboard shortcuts
         - Text replacement rules (turn :smile: into 😊)
         - Integration with system emoji picker
         - Quick emoji insertion for common phrases
         - Emoji reaction sets for different contexts
      8. Customization:
         - Theme options (dark/light/system)
         - Grid density settings
         - Category visibility toggles
         - Custom sorting options (alphabetical, usage, recency)
      `,
  },
  {
    name: "System Monitor",
    description:
      "real-time CPU, memory, disk usage with historical graphs and alerts",
    prompt: `
      create a new runner called System Monitor:

      1. Real-time monitoring dashboard:
         - CPU usage percentage with per-core breakdown
         - Memory usage (RAM) with available/used/cached breakdown
         - Disk I/O activity (read/write speeds, queue depth)
         - Network activity (upload/download speeds, connections)
         - GPU usage and temperature (if available)
         - System temperature sensors
      2. Historical graphs and charts:
         - Time-series graphs for all metrics (1min, 5min, 1hr, 24hr views)
         - Smooth real-time updating (1-5 second intervals)
         - Zoomable and scrollable timeline
         - Export graph data as CSV/JSON
         - Screenshot/save graphs as images
      3. Process monitoring:
         - Top CPU/memory consuming processes
         - Process tree view with parent-child relationships
         - Per-process resource usage statistics
         - Kill/terminate processes with confirmation
         - Process priority adjustment
      4. System information:
         - OS version, uptime, boot time
         - Hardware specs (CPU model, RAM size, disk capacity)
         - Running services and background tasks
         - System load averages
         - Logged-in users and active sessions
      5. Alerts and notifications:
         - Customizable threshold alerts (CPU >80%, RAM >90%, etc.)
         - System notification when thresholds exceeded
         - Alert history and acknowledgment
         - Email/webhook notifications for critical events
      6. Performance analysis:
         - Resource usage trends and patterns
         - Performance bottleneck identification
         - System health score calculation
         - Recommendations for optimization
         - Comparison with historical performance
      7. Advanced features:
         - Always-on-top mini widget mode
         - System tray integration with quick stats
         - Export system reports
         - Custom monitoring intervals
         - Multi-system monitoring (remote machines)
      `,
  },
  {
    name: "WiFi Scanner",
    description:
      "scan available networks with signal strength, security details, and analysis",
    prompt: `
      create a new runner called WiFi Scanner:

      1. Network discovery and scanning:
         - Continuous scanning for available WiFi networks
         - Manual refresh/rescan button
         - Auto-refresh intervals (5s, 10s, 30s, off)
         - Hidden network detection attempts
         - Scan result history and comparison
      2. Network information display:
         - SSID (network name) with hidden network indicators
         - Signal strength (dBm, percentage, visual bars)
         - Security type (Open, WEP, WPA, WPA2, WPA3, Enterprise)
         - Channel number and frequency (2.4GHz/5GHz)
         - BSSID (MAC address) of access points
         - Vendor information based on MAC address
      3. Signal analysis:
         - Real-time signal strength monitoring
         - Signal quality graphs over time
         - Channel congestion analysis
         - Optimal channel recommendations
         - Signal strength heatmap visualization
      4. Security assessment:
         - Security protocol identification and warnings
         - Encryption strength indicators
         - Vulnerability detection (WPS enabled, weak encryption)
         - Rogue access point detection
         - Security recommendations
      5. Network details:
         - Connection history (previously connected networks)
         - Data usage per network (if available)
         - Connection speed and quality metrics
         - Network performance testing tools
         - Ping and traceroute to gateway
      6. Advanced features:
         - Export scan results to CSV/JSON
         - Network comparison and ranking
         - Geolocation mapping of networks
         - Bluetooth and other wireless device scanning
         - Network troubleshooting tools
      7. Monitoring and alerts:
         - Monitor specific networks for availability
         - Signal strength alerts and notifications
         - New network discovery notifications
         - Network security change alerts
         - Connection quality monitoring
      8. Visualization:
         - Channel utilization charts
         - Signal strength over time graphs
         - Network topology visualization
         - Frequency spectrum analysis
         - Geographic mapping integration
      `,
  },
  {
    name: "Process Manager",
    description:
      "view running processes, kill applications, monitor resource usage",
    prompt: `
      create a new runner called Process Manager:

      1. Process listing and details:
         - Comprehensive list of all running processes
         - Process ID (PID), parent process ID (PPID)
         - Process name, command line arguments
         - User/owner of each process
         - Process state (running, sleeping, stopped, zombie)
         - Start time and runtime duration
      2. Resource usage monitoring:
         - Real-time CPU usage per process (% and actual time)
         - Memory usage (RSS, Virtual, Shared memory)
         - Disk I/O statistics (read/write bytes, operations)
         - Network usage per process (if available)
         - File descriptors and handle count
         - Thread count per process
      3. Process management:
         - Kill/terminate processes with confirmation dialogs
         - Send custom signals to processes (SIGTERM, SIGKILL, etc.)
         - Change process priority (nice values)
         - Suspend and resume processes
         - Restart crashed processes
         - Force quit unresponsive applications
      4. Process tree visualization:
         - Hierarchical tree view of parent-child relationships
         - Collapsible/expandable process groups
         - Visual indicators for process relationships
         - Search and filter within process tree
         - Process dependency analysis
      5. Filtering and search:
         - Search processes by name, PID, or command
         - Filter by user, CPU usage, memory usage
         - Show/hide system processes
         - Custom filters and saved filter sets
         - Quick filters for common process types
      6. Monitoring and alerts:
         - Set alerts for high resource usage processes
         - Monitor specific processes for crashes/restarts
         - Process performance history and trends
         - Automatic process restart rules
         - System performance impact analysis
      7. Advanced features:
         - Process startup analysis and optimization
         - System service management
         - Environment variables inspection
         - Open files and network connections per process
         - Process security context and permissions
         - Core dump analysis tools
      8. Export and reporting:
         - Export process lists to CSV/JSON
         - Generate system performance reports
         - Process usage statistics over time
         - Automated reports and logging
         - Integration with system monitoring tools
      `,
  },
  {
    name: "Disk Usage Analyzer",
    description:
      "visual breakdown of disk space usage by folder with cleanup tools",
    prompt: `
      create a new runner called Disk Usage Analyzer:

      1. Disk space visualization:
         - Interactive treemap showing folder sizes
         - Sunburst/pie chart visualization options
         - Directory tree view with size indicators
         - Visual size comparison bars
         - Color coding by file types or age
         - Zoomable and navigable visualizations
      2. Scanning and analysis:
         - Full system scan or selective folder scanning
         - Real-time progress with cancel option
         - Multi-threaded scanning for performance
         - Background scanning with notifications
         - Incremental scanning for changed areas only
         - Scan result caching for faster subsequent runs
      3. Detailed information:
         - File and folder sizes (bytes, KB, MB, GB, TB)
         - File count and folder count statistics
         - Percentage of total disk space used
         - File type breakdown and statistics
         - Last modified dates and access times
         - File attribute analysis (hidden, system, etc.)
      4. Navigation and exploration:
         - Click to drill down into folders
         - Breadcrumb navigation for easy back-tracking
         - Quick jump to specific paths
         - Bookmarks for frequently analyzed locations
         - Integration with file explorer/finder
         - Right-click context menu actions
      5. Cleanup and optimization:
         - Identify large files and folders for cleanup
         - Find duplicate files with comparison tools
         - Locate old/unused files by access date
         - Temporary file detection and cleanup
         - Cache and log file identification
         - Safe cleanup recommendations
      6. File type analysis:
         - Breakdown by file extensions
         - Media file analysis (photos, videos, audio)
         - Document and archive file statistics
         - Application and system file usage
         - Custom file type categorization
         - Largest files by type listing
      7. Reporting and export:
         - Generate detailed usage reports
         - Export data to CSV, JSON, or HTML
         - Before/after cleanup comparisons
         - Historical usage tracking
         - Automated periodic scans and reports
         - Email reports for scheduled analysis
      8. Advanced features:
         - Network drive and external storage analysis
         - RAID and multi-disk systems support
         - Symbolic link and junction handling
         - Permission and access control analysis
         - Integration with cloud storage services
         - Command-line interface for automation
      `,
  },
]
