# 📝 Daily Notes - Viberunner App

A simple and elegant daily journaling app for Viberunner that helps you maintain a consistent writing habit with easy date navigation and automatic saving.

## ✨ Features

### 🗓️ **Intuitive Date Navigation**
- **Horizontal Day Scroll**: Navigate through dates with a beautiful horizontal scrolling interface
- **Today Highlighting**: Current day is prominently highlighted with a golden border
- **Smart Date Labels**: Shows "Today", "Yesterday", "Tomorrow", "X days ago", or formatted dates
- **Infinite Navigation**: Browse 30 days in the past and future (extendable)

### 📅 **Calendar Integration**
- **Date Picker**: Jump to any date quickly with the built-in calendar picker
- **Visual Feedback**: Clear indication of the currently selected date

### 💾 **Smart Auto-Save**
- **Auto-Save**: Notes are automatically saved 2 seconds after you stop typing
- **Save Indicators**: Visual feedback showing when notes are being saved
- **Empty Note Cleanup**: Empty notes are automatically deleted to keep your directory clean

### ⚙️ **Flexible Settings**
- **Custom Directory**: Choose where your notes are stored
- **Directory Preferences**: Settings are saved and persist between sessions
- **Quick Access**: "Show in Finder" button to quickly navigate to your notes folder
- **Migration Warning**: Clear instructions when changing directories

### 📁 **File Management**
- **Simple Storage**: Notes are saved as `.txt` files with YYYY-MM-DD naming convention
- **Human Readable**: Files can be opened and edited in any text editor
- **Portable**: Easy to backup, sync, or transfer your notes

## 🎯 Usage

### Getting Started

1. **Launch the App**: Click on "Daily Notes" in your Viberunner launcher
2. **Start Writing**: The app opens to today's note - just start typing!
3. **Navigate Dates**: Use the horizontal scroll or calendar picker to access other days
4. **Auto-Save**: Your notes save automatically - no need to manually save

### Navigation

- **Horizontal Scroll**: Click on any date button in the top bar
- **Calendar Picker**: Click "📅 Calendar" button and select a date
- **Today Button**: The golden-highlighted button always takes you to today

### Settings

- **Change Directory**: Click "⚙️ Settings" → "Change" to select a new notes folder
- **Show in Finder**: Click "Show in Finder" to open your notes directory
- **Directory Migration**: When changing directories, manually copy existing `.txt` files to the new location

## 📂 File Structure

```
notes/
├── 2024-01-15.txt    # January 15, 2024
├── 2024-01-16.txt    # January 16, 2024
├── 2024-01-17.txt    # January 17, 2024
└── ...
```

### File Naming Convention
- **Format**: `YYYY-MM-DD.txt`
- **Example**: `2024-03-15.txt` for March 15, 2024
- **Sorting**: Files naturally sort chronologically

## 🛠️ Technical Details

### Default Storage Location
- **Default**: `notes/` folder in the app's current working directory
- **Customizable**: Can be changed to any folder via Settings
- **Auto-Creation**: Directory is created automatically if it doesn't exist

### Persistence
- **Preferences**: Directory preference is saved using Viberunner's preferences API
- **Session Memory**: Current date and note content persist during app session
- **Cross-Session**: Settings and notes are maintained between app launches

### Performance
- **Lightweight**: Only loads the current note into memory
- **Fast Navigation**: Instant switching between dates
- **Efficient Storage**: Plain text files with minimal overhead

## 🎨 Design Features

- **Dark Theme**: Seamless integration with Viberunner's dark interface
- **Responsive Layout**: Adapts to different window sizes
- **Smooth Animations**: Polished transitions and hover effects
- **Clear Typography**: Easy-to-read fonts optimized for writing

## 🔧 Advanced Usage

### Keyboard Navigation
- **Tab**: Navigate between interface elements
- **Date Input**: Use the calendar picker for precise date selection
- **Text Editing**: Standard text editing shortcuts work in the note area

### Backup Strategy
Since notes are stored as simple text files, you can:
- **Copy Files**: Manually backup the entire notes directory
- **Cloud Sync**: Place your notes directory in Dropbox, iCloud, etc.
- **Version Control**: Use Git to track changes to your notes
- **Export**: Files are already in portable `.txt` format

### Directory Organization
Consider organizing your notes by year:
```
notes/
├── 2023/
│   ├── 2023-12-25.txt
│   └── 2023-12-31.txt
├── 2024/
│   ├── 2024-01-01.txt
│   └── 2024-01-15.txt
```

## 🚀 Development

This app is built using:
- **React 18+** with TypeScript
- **Viberunner API** for preferences and file operations
- **Node.js APIs** for file system operations
- **Modern CSS** for styling and animations

### Building
```bash
npm install
npm run build
```

## 📝 License

MIT License - Feel free to modify and distribute as needed.

---

**Happy Writing! ✍️**

Start your daily journaling journey with this simple, elegant, and powerful note-taking app designed specifically for consistent daily writing habits.