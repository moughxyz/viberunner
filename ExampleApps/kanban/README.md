# 📋 Kanban Board Visualizer

A powerful and intuitive Kanban board visualizer for Vizor that transforms simple text files into interactive, drag-and-drop task management boards. Perfect for managing projects, organizing tasks, and visualizing workflows directly from text files.

## ✨ Features

- **📝 Simple Text Format**: Uses an intuitive text format with categories and items
- **🔍 Smart Detection**: Automatically matches files containing "kanban" in the filename
- **🎯 Drag & Drop**: Move tasks between columns with smooth drag-and-drop functionality
- **✏️ Inline Editing**: Click to edit column titles and task descriptions
- **➕ Dynamic Management**: Add/remove columns and tasks on the fly
- **💾 Direct File Saving**: Save changes back to the original file with automatic backup
- **🌙 Modern Dark UI**: Beautiful dark theme with smooth animations and hover effects
- **⚠️ Change Tracking**: Visual indicators for unsaved changes
- **📱 Responsive Design**: Works seamlessly on different screen sizes

## 📄 File Format

The Kanban visualizer uses a simple, human-readable text format:

```
CATEGORY NAME:
- Task item 1
- Task item 2
- Task item 3

ANOTHER CATEGORY:
- Different task
- Another task

IN PROGRESS:
- Work in progress item
- Almost done task

DONE:
- Completed task
- Finished work
```

### Format Rules

1. **Column Headers**: End with a colon (`:`)
2. **Task Items**: Start with a dash and space (`- `)
3. **Empty Lines**: Used to separate columns (optional)
4. **Flexible Naming**: Column names can be anything you want

## 🎯 File Matching

The visualizer automatically detects files using multiple criteria:

- **Primary**: Files containing "kanban" in the filename (priority 95)
- **Secondary**: Text files containing "kanban" (priority 90)
- **Tertiary**: .txt files containing "board" (priority 85)

### Example Matching Files

✅ **Will Match:**
- `my-kanban-board.txt`
- `project-kanban.txt`
- `kanban-tasks.txt`
- `sprint-board.txt`
- `team-kanban-2024.txt`

❌ **Won't Match:**
- `tasks.txt` (no "kanban" or "board")
- `kanban.json` (wrong format)
- `board.md` (wrong extension)

## 🚀 Quick Start

### 1. Create a Kanban File

Create a text file with "kanban" in the name:

```bash
# Create a new kanban file
touch my-project-kanban.txt
```

### 2. Add Your Content

```
TO DO:
- Set up project repository
- Create initial documentation
- Design user interface

IN PROGRESS:
- Implement core features
- Write unit tests

REVIEW:
- Code review changes
- Update documentation

DONE:
- Project planning
- Team kickoff meeting
```

### 3. Open in Vizor

Drop the file into Vizor and watch it transform into an interactive Kanban board!

## 🎮 Usage Guide

### Managing Columns

- **Add Column**: Type a title in the "New column title" field and click "➕ Add Column"
- **Edit Column**: Click on any column title to edit it inline
- **Delete Column**: Click the 🗑️ icon next to the column title (confirms before deleting)

### Managing Tasks

- **Add Task**: Type in the input field at the bottom of any column and press Enter or click ➕
- **Edit Task**: Click on any task text to edit it inline
- **Move Task**: Drag and drop tasks between columns
- **Delete Task**: Click the ✕ button on any task

### Saving Changes

- **Direct Save**: Click "💾 Save Board" to save directly to the original file
- **Backup Protection**: Automatic backup creation before saving
- **Download Fallback**: If direct save fails, downloads the updated file
- **Change Tracking**: Visual warning when you have unsaved changes

## 🔧 Technical Details

### File Processing

1. **Content Detection**: Automatically handles base64 encoded content
2. **Format Parsing**: Intelligent parsing of categories and items
3. **Fallback Handling**: Creates default structure for unformatted files
4. **Error Recovery**: Graceful handling of malformed content

### State Management

- **Real-time Updates**: Immediate UI updates for all changes
- **Change Tracking**: Monitors modifications for save warnings
- **Drag State**: Visual feedback during drag operations
- **Edit Mode**: Inline editing with keyboard shortcuts

### File Operations

```typescript
// Save with backup
const backupResult = await window.api.backupFile(filePath);
const saveResult = await window.api.writeFile(filePath, content);

// Fallback download
const blob = new Blob([content], { type: 'text/plain' });
// ... download logic
```

## 🎨 UI Components

### Dark Theme Design

- **Background Gradients**: Subtle gradients for depth
- **Color Coding**: Different states have distinct colors
- **Hover Effects**: Interactive feedback for all clickable elements
- **Shadows & Borders**: Consistent visual hierarchy

### Responsive Layout

- **Horizontal Scrolling**: Board scrolls horizontally for many columns
- **Flexible Columns**: Minimum 300px width, grows as needed
- **Mobile Friendly**: Touch-friendly drag and drop
- **Keyboard Navigation**: Full keyboard support for editing

## 📊 Use Cases

### Project Management
```
BACKLOG:
- User authentication system
- Payment integration
- Email notifications

SPRINT:
- API endpoint development
- Frontend components

TESTING:
- Unit test coverage
- Integration tests

DEPLOYED:
- User registration
- Basic dashboard
```

### Personal Task Management
```
TODAY:
- Morning workout
- Team standup
- Code review

THIS WEEK:
- Grocery shopping
- Dentist appointment
- Project presentation

SOMEDAY:
- Learn new framework
- Organize photos
- Plan vacation
```

### Team Workflows
```
REQUESTED:
- Feature request A
- Bug report B
- Enhancement C

ASSIGNED:
- Developer working on X
- Designer creating Y

REVIEW:
- Pull request #123
- Design mockup Z

COMPLETE:
- Feature shipped
- Bug fixed
```

## 🔒 Data Safety

### Backup Strategy

- **Automatic Backups**: Created before every save operation
- **Timestamp Naming**: Backups include timestamp for identification
- **Error Handling**: Save operations fail safely if backup fails
- **Manual Recovery**: Users can restore from backups if needed

### File Integrity

- **Content Validation**: Ensures valid format before saving
- **Encoding Handling**: Proper UTF-8 encoding for all text
- **Permission Checks**: Respects file system permissions
- **Atomic Operations**: Save operations are atomic when possible

## 🎯 Advanced Features

### Drag & Drop System

- **Visual Feedback**: Items highlight during drag operations
- **Drop Zones**: Entire columns act as drop zones
- **State Management**: Proper cleanup of drag state
- **Touch Support**: Works on touch devices

### Keyboard Shortcuts

- **Enter**: Save inline edits (Shift+Enter for new line in tasks)
- **Escape**: Cancel inline edits
- **Tab**: Navigate between form fields
- **Enter**: Submit new items/columns

### Performance Optimizations

- **Efficient Rendering**: Minimal re-renders during operations
- **Memory Management**: Proper cleanup of event listeners
- **Large File Support**: Handles boards with many items efficiently
- **Smooth Animations**: CSS transitions for all state changes

## 🐛 Troubleshooting

### Common Issues

**"Board appears empty"**
- Check file format - ensure categories end with `:`
- Verify items start with `- `
- Check for encoding issues

**"Can't save changes"**
- Verify file permissions
- Check if file is read-only
- Ensure sufficient disk space

**"Drag and drop not working"**
- Check if browser supports HTML5 drag and drop
- Verify mouse/touch events are working
- Try refreshing the visualizer

### Debug Mode

Add debug information by editing items:
```
DEBUG MODE:
- Current state: {{JSON.stringify(columns)}}
- File path: {{fileData.path}}
- Last modified: {{new Date().toISOString()}}
```

## 🚀 Future Enhancements

### Planned Features

- **Due Dates**: Add date tracking to tasks
- **Labels & Tags**: Color-coded task categorization
- **Progress Tracking**: Visual progress indicators
- **Export Options**: Export to other formats (JSON, CSV)
- **Templates**: Pre-built board templates
- **Collaboration**: Multi-user editing capabilities

### Integration Ideas

- **Git Integration**: Track changes as commits
- **Calendar Sync**: Sync with calendar applications
- **Time Tracking**: Built-in time tracking for tasks
- **Automation**: Rule-based task movement
- **Reporting**: Generate progress reports

## 📄 License

MIT License - Feel free to use, modify, and distribute this visualizer!

---

**Happy Task Managing!** 📋✨

Transform your simple text files into powerful, interactive Kanban boards with this visualizer. Perfect for agile workflows, personal productivity, and team collaboration!