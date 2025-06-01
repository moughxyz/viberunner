# 🖱️ Mouse Jiggler - Standalone Utility

Keep your screen active by automatically moving the mouse cursor at configurable intervals. Perfect for preventing screen locks during presentations, video calls, or long tasks.

## ✨ Features

- **🚀 Standalone Utility**: Launch directly from Vibeframe's Utilities section - no file needed!
- **🎯 Configurable Intervals**: Set custom jiggle intervals from 1-300 seconds
- **🔄 Multiple Movement Patterns**: Choose from 4 different movement patterns
- **📊 Real-time Statistics**: Track total moves, timing, and activity
- **🎨 Modern Interface**: Beautiful dark theme with status indicators
- **⚙️ Smart Controls**: Intuitive start/stop with safety features
- **🔒 System Integration**: Works across macOS, Windows, and Linux

## 🎮 Movement Patterns

### 1. **Tiny** (Recommended)
- **Movement**: 2-pixel minimal displacement
- **Best for**: Invisible activity during calls/presentations
- **Disruption**: Minimal - barely noticeable

### 2. **Circle**
- **Movement**: 20-pixel radius circular pattern
- **Best for**: Consistent activity detection
- **Disruption**: Low - small circular motion

### 3. **Zigzag**
- **Movement**: 30-pixel back-and-forth pattern
- **Best for**: More obvious activity indication
- **Disruption**: Medium - visible movement

### 4. **Corners**
- **Movement**: 50-pixel rectangle pattern
- **Best for**: Maximum activity detection
- **Disruption**: High - very noticeable movement

## 🚀 Quick Start

### 1. Launch from Vibeframe
- Open Vibeframe
- Navigate to the **Utilities** section in the sidebar
- Click the **Launch** button next to "Mouse Jiggler"
- The utility will open instantly - no file needed!

### 2. Configure & Start
- Set your preferred interval (30-60 seconds recommended)
- Choose movement pattern (start with "Tiny")
- Click "▶️ Start Jiggling"

### 3. Monitor Activity
- Watch the real-time statistics
- Observe the status indicator (green when active)
- Stop anytime with the "⏹️ Stop Jiggling" button

## ⚙️ Configuration Options

### Interval Settings
- **Range**: 1-300 seconds
- **Recommended**: 30-60 seconds
- **Use cases**:
  - Video calls: 45-60 seconds
  - Presentations: 30-45 seconds
  - Downloads/uploads: 60+ seconds

### Pattern Selection
Choose based on your needs:
- **Presentations**: Use "Tiny" pattern
- **Video calls**: Use "Tiny" or "Circle"
- **Background tasks**: Any pattern works
- **Testing**: Use "Corners" for obvious feedback

## 🔧 System Requirements

### macOS
- **Built-in support**: Uses native `osascript` commands
- **Permissions**: May require accessibility permissions for some system control
- **Compatibility**: Works on macOS 10.10+

### Windows
- **Built-in support**: Uses native PowerShell and .NET Framework
- **Permissions**: May require running Vibeframe as administrator
- **Compatibility**: Works on Windows 7+

### Linux
- **Dependencies**: Requires `xdotool` for mouse control
- **Installation**: `sudo apt-get install xdotool` (Ubuntu/Debian) or equivalent
- **Compatibility**: Works with X11-based desktop environments

## 📊 Statistics Tracking

The visualizer provides real-time statistics:

- **Total Moves**: Cumulative mouse movements since start
- **Last Move**: Timestamp of most recent movement
- **Next Move**: Predicted time of next movement
- **Current Pattern**: Active movement pattern
- **Interval**: Current jiggling interval

## 💡 Best Practices

### ✅ Do's
- Test patterns before important meetings
- Use minimal intervals (30-60s) for best results
- Choose "Tiny" pattern for professional settings
- Stop jiggling when actively using the computer
- Monitor the status indicator for active confirmation

### ❌ Don'ts
- Don't use very short intervals (<10s) unnecessarily
- Don't use large patterns during screen sharing
- Don't leave running when not needed
- Don't use during active mouse-intensive work

## 🎯 Use Cases

### 📹 Video Calls & Presentations
- **Pattern**: Tiny
- **Interval**: 45-60 seconds
- **Benefit**: Prevents screen lock without distraction

### 💻 Long Downloads/Uploads
- **Pattern**: Any
- **Interval**: 60+ seconds
- **Benefit**: Keeps system active during transfers

### 📊 Monitoring Dashboards
- **Pattern**: Circle or Tiny
- **Interval**: 30-45 seconds
- **Benefit**: Maintains screen-on for continuous monitoring

### 🎮 Game Idle Prevention
- **Pattern**: Corners (for obvious activity)
- **Interval**: 30 seconds
- **Benefit**: Prevents game timeouts

## 🔒 Security & Privacy

- **Local Operation**: All mouse control happens locally
- **No Network**: No data sent over network
- **No Recording**: Mouse positions not stored or logged
- **Permission-Based**: Requires explicit system permissions
- **Open Source**: Full code visibility for security review

## 🛠️ Technical Details

### Dependencies
- **System Commands**: Cross-platform mouse control via OS-specific commands
- **React 18+**: Modern UI framework
- **Node.js**: Full system access via child_process

### Platform Support
- **macOS**: Uses `osascript` for system-level mouse control
- **Windows**: Uses `powershell` with System.Windows.Forms for cursor manipulation
- **Linux**: Uses `xdotool` for X11-based mouse movement

### Standalone Architecture
- **No file dependency**: Launches independently
- **Utility-focused**: Purpose-built for productivity
- **Always available**: Accessible from Utilities section
- **Self-contained**: All functionality built-in

### System Integration
- **Cross-platform**: macOS, Windows, Linux support
- **Permission handling**: Graceful degradation without permissions
- **Error recovery**: Automatic stop on system errors
- **Resource efficient**: Minimal CPU/memory usage

## 🔍 Troubleshooting

### "Mouse control not available"
1. **macOS**: Ensure `osascript` is available (built-in on all macOS)
2. **Windows**: Ensure PowerShell is available (built-in on Windows 7+)
3. **Linux**: Install xdotool: `sudo apt-get install xdotool`
4. **All**: Restart Vibeframe after system changes

### Mouse not moving visibly
- This is normal for "Tiny" pattern (only 2-pixel movement)
- Check statistics panel for confirmation of activity
- Try "Corners" pattern for visible confirmation

### "Command failed" errors
- **macOS**: Check if accessibility permissions are needed
- **Windows**: Try running Vibeframe as administrator
- **Linux**: Verify xdotool is installed and X11 is running
- **All**: Check console logs for specific error details

### Screen still locks
- Increase jiggling frequency (lower interval)
- Try different movement patterns
- Check system power settings
- Verify the visualizer is active (green status indicator)

### High CPU usage
- Increase interval time (reduce frequency)
- Close unnecessary applications
- Check for system conflicts

## 🚀 Standalone Benefits

As a **standalone utility**, Mouse Jiggler offers several advantages:

- **🎯 Purpose-built**: Designed specifically as a utility, not a file processor
- **⚡ Instant access**: Always available in the Utilities section
- **🔄 Persistent**: Can run independently of any file operations
- **💡 Intuitive**: Clear utility purpose - no need to create trigger files
- **🛠️ Professional**: Appears alongside other system utilities

## 📄 License

MIT License - Free for personal and commercial use.

## 🤝 Contributing

This visualizer is part of the Vibeframe ecosystem. Contributions welcome!

---

**⚠️ Important**: Use responsibly and in accordance with your organization's policies. This tool is designed for legitimate productivity use cases.