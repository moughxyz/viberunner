# 🍅 Micro Pomodoro Timer

A minimalist Pomodoro timer for Vibeframe with script execution capabilities for enhanced productivity automation.

## Features

- **Classic Pomodoro Technique**: 25-minute work sessions with configurable break intervals
- **Script Automation**: Execute custom scripts on break start, break end, and timer stop
- **Visual Progress**: Animated circular progress indicator with state-based colors
- **Session Tracking**: Monitor completed sessions and automatic break scheduling
- **Customizable Settings**: Adjust work/break durations and automation behavior
- **Modern UI**: Dark theme with glass morphism design
- **Notifications**: Browser notification support with permission handling
- **Pause/Resume**: Full control over timer state

## Screenshots

### Main Timer Interface
![Pomodoro Timer](https://via.placeholder.com/500x600/0a0a0a/ffffff?text=Micro+Pomodoro+Timer)

### Settings Panel
![Settings Panel](https://via.placeholder.com/500x400/1a1a1a/ffffff?text=Timer+Settings+%26+Scripts)

## Usage

### Basic Operation
1. **Start**: Click "Start Work Session" to begin a 25-minute focus period
2. **Focus**: Work without distractions during the timer countdown
3. **Break**: Timer automatically transitions to break mode when work session completes
4. **Repeat**: Continue the cycle with automatic session tracking

### Timer Controls
- **Pause**: Temporarily halt the timer during any session
- **Resume**: Continue from where you paused
- **Stop**: End the current session and reset to idle state
- **Reset Session**: Clear all progress and start fresh

### Customization
Access settings via the ⚙️ Settings button to configure:

#### Timer Durations
- **Work Session**: Default 25 minutes (customizable)
- **Short Break**: Default 5 minutes (customizable)
- **Long Break**: Default 15 minutes (customizable)
- **Sessions Until Long Break**: Default 4 sessions (customizable)

#### Script Automation
Enable script execution to automate your environment:

**On Break Start**
```bash
# Pause music during break
osascript -e 'tell app "Music" to pause'

# Dim screen brightness
brightness 0.3

# Send notification
osascript -e 'display notification "Take a break!" with title "Pomodoro"'
```

**On Break End**
```bash
# Resume music after break
osascript -e 'tell app "Music" to play'

# Restore screen brightness
brightness 0.8

# Focus mode notification
osascript -e 'display notification "Back to work!" with title "Pomodoro"'
```

**On Timer Stop**
```bash
# Reset environment
brightness 1.0
osascript -e 'tell app "Music" to stop'
```

## Script Examples

### macOS Examples
```bash
# Control Spotify
osascript -e 'tell app "Spotify" to pause'
osascript -e 'tell app "Spotify" to play'

# Adjust system volume
osascript -e 'set volume output volume 50'

# Control Do Not Disturb
shortcuts run "Turn On Do Not Disturb"
shortcuts run "Turn Off Do Not Disturb"

# Screen brightness (requires brightness CLI tool)
brightness 0.5
```

### Cross-Platform Examples
```bash
# Node.js notification script
node -e "require('node-notifier').notify('Break time!')"

# Python script execution
python /path/to/break-script.py

# Shell commands
echo "Break started at $(date)" >> ~/pomodoro.log
```

## Timer States

The timer displays different colors for each state:

- 🔴 **Work Session** (Red): Active focus period
- 🟢 **Short Break** (Green): 5-minute rest period
- 🔵 **Long Break** (Blue): Extended 15-minute break
- 🟡 **Paused** (Yellow): Timer temporarily stopped
- ⚪ **Idle** (Gray): Ready to start

## Browser Compatibility

### Notification Support
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support with permission prompt

### Script Execution
- **Electron Environment**: Full script execution via IPC
- **Web Browser**: Console logging and notifications only
- **Security**: Scripts only execute when explicitly enabled

## Development

### Project Structure
```
micro-pomodoro-timer/
├── src/
│   ├── App.tsx          # Main component
│   └── main.tsx         # React entry point
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.ts       # Build configuration
└── viz.json            # Vibeframe metadata
```

### Building

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Dependencies
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server

## Security Considerations

- **Script Execution**: Only available in trusted Electron environments
- **User Consent**: Scripts require explicit user enablement
- **Sandboxing**: Web version logs scripts instead of executing
- **Permissions**: Notification access requires user permission

## Tips for Productivity

### Effective Pomodoro Technique
1. **Plan**: Identify specific tasks before starting
2. **Focus**: Eliminate distractions during work sessions
3. **Break**: Actually rest during break periods
4. **Review**: Assess progress after each session

### Script Automation Ideas
- **Environment Control**: Adjust lighting, music, notifications
- **Application Management**: Close distracting apps, open work tools
- **Logging**: Track session data for productivity analysis
- **Integration**: Connect with task management tools

## Troubleshooting

### Timer Issues
- **Notification Permission**: Check browser notification settings
- **Script Execution**: Ensure scripts are enabled in settings
- **Performance**: Clear browser cache if timer lags

### Script Problems
- **Path Issues**: Use absolute paths for script files
- **Permissions**: Ensure script files are executable
- **Syntax**: Test commands in terminal before adding to timer

## License

MIT License - Free to use, modify, and distribute.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: This is a standalone Vibeframe visualizer that enhances productivity through the proven Pomodoro Technique with modern automation capabilities.