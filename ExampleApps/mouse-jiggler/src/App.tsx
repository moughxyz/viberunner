import React, { useState, useEffect, useRef, useMemo } from 'react';

interface FileData {
  path: string;
  mimetype: string;
  content: string;
  analysis?: {
    filename: string;
    size: number;
    isJson: boolean;
    jsonContent?: any;
  };
}

interface MouseJigglerProps {
  fileData: FileData | null; // Can be null for standalone mode
  tabId?: string; // For cleanup registration
}

// Add window API types
declare global {
  interface Window {
    __LOAD_VISUALIZER__?: (component: any) => void;
  }
}

const MouseJiggler: React.FC<MouseJigglerProps> = ({ fileData, tabId }) => {
  const [isActive, setIsActive] = useState(false);
  const [interval, setInterval] = useState(30); // seconds
  const [pattern, setPattern] = useState<'tiny' | 'circle' | 'zigzag' | 'corners'>('tiny');
  const [totalMoves, setTotalMoves] = useState(0);
  const [lastMove, setLastMove] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [robotAvailable, setRobotAvailable] = useState(false);
  const [platform, setPlatform] = useState<string>('');
  const [hasAccessibilityPermissions, setHasAccessibilityPermissions] = useState<boolean | null>(null);

  const intervalRef = useRef<any>(null);

  // Pre-calculate next move time to avoid calling function in JSX
  const nextMoveTime = useMemo(() => {
    if (!lastMove || !isActive) return null;
    try {
      return new Date(lastMove.getTime() + interval * 1000);
    } catch (error) {
      console.error('Error calculating next move time:', error);
      return null;
    }
  }, [lastMove, isActive, interval]);

  // Initialize mouse control system
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        // Debug: Check what's available in the global environment
        console.log('=== Node.js Module Debugging ===');
        console.log('typeof require:', typeof require);
        console.log('typeof process:', typeof process);
        console.log('typeof module:', typeof module);
        console.log('typeof window:', typeof window);

        // Try to access require function
        let requireFunction;
        try {
          requireFunction = require;
          console.log('Direct require access: SUCCESS');
        } catch (err) {
          console.log('Direct require access: FAILED', err);

          // Try window.require
          try {
            requireFunction = (window as any).require;
            console.log('window.require access: SUCCESS');
          } catch (err2) {
            console.log('window.require access: FAILED', err2);

            // Try eval require
            try {
              requireFunction = eval('require');
              console.log('eval require access: SUCCESS');
            } catch (err3) {
              console.log('eval require access: FAILED', err3);
              throw new Error('Cannot access require function');
            }
          }
        }

        if (!requireFunction) {
          throw new Error('require function not available');
        }

        // Try to require modules one by one
        let childProcess, os;

        try {
          childProcess = requireFunction('child_process');
          console.log('child_process module: SUCCESS', typeof childProcess.exec);
        } catch (err) {
          console.log('child_process module: FAILED', err);
          throw new Error('child_process module not available');
        }

        try {
          os = requireFunction('os');
          console.log('os module: SUCCESS', typeof os.platform);
        } catch (err) {
          console.log('os module: FAILED', err);
          throw new Error('os module not available');
        }

        // Test platform detection
        const platform = os.platform();
        setPlatform(platform);
        console.log('Detected platform:', platform);

        // Test command execution with a simple test
        let testCommand = '';
        switch (platform) {
          case 'darwin': // macOS
            testCommand = 'echo "macOS detected - mouse control ready"';
            break;
          case 'win32': // Windows
            testCommand = 'echo "Windows detected - mouse control ready"';
            break;
          case 'linux': // Linux
            testCommand = 'echo "Linux detected - mouse control ready"';
            break;
          default:
            throw new Error(`Unsupported platform: ${platform}`);
        }

        console.log('Testing command execution...');
        childProcess.exec(testCommand, (error: any, stdout: any, stderr: any) => {
          if (error) {
            console.log('Command execution test: FAILED', error);
            setError(`Command execution test failed: ${error.message}`);
            setRobotAvailable(false);
            return;
          }

          console.log('Command execution test: SUCCESS', stdout.trim());
          console.log('Mouse control system ready');
          setRobotAvailable(true);

          // Check for accessibility permissions on macOS
          if (platform === 'darwin') {
            checkAccessibilityPermissions(childProcess);
          } else {
            // For other platforms, assume permissions are available
            setHasAccessibilityPermissions(true);
          }
        });

      } catch (err: any) {
        console.log('=== Initialization Failed ===');
        console.error('Full error:', err);
        setError(`Failed to initialize mouse control: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setRobotAvailable(false);
      }
    };

    initializeSystem();
  }, []);

  // Cleanup on unmount and tab closure
  useEffect(() => {
    const cleanup = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setIsActive(false);
      console.log('Mouse jiggler cleaned up');
    };

    // Register cleanup for tab closure (if tabId provided)
    if (tabId && typeof window !== 'undefined' && (window as any).registerCleanup) {
      (window as any).registerCleanup(tabId, cleanup);
    }

    // Return React cleanup function
    return cleanup;
  }, [tabId]);

  // Check accessibility permissions on macOS
  const checkAccessibilityPermissions = (childProcess: any) => {
    // First, check if Python3 and Quartz are available
    console.log('Checking Python3 and Quartz availability...');

    // Use spawn with shell: true for better environment access (learned from command-line app)
    const { spawn } = childProcess;

    const pythonProcess = spawn('python3', ['-c', `
import sys
try:
    import Quartz
    print('python-quartz-available')
except ImportError as e:
    print('python-quartz-missing')
    sys.exit(1)
except Exception as e:
    print('python-error')
    sys.exit(1)
`], { shell: true });

    let pythonOutput = '';
    let pythonError = '';

    pythonProcess.stdout?.on('data', (data: any) => {
      pythonOutput += data.toString();
    });

    pythonProcess.stderr?.on('data', (data: any) => {
      pythonError += data.toString();
    });

    pythonProcess.on('close', (code: number | null) => {
      const result = pythonOutput.trim() || (code !== 0 ? 'python3-missing' : '');
      console.log('Python/Quartz check result:', result, 'exit code:', code);

      if (result === 'python-quartz-available') {
        // Python and Quartz are available, now test accessibility permissions
        testAccessibilityPermissions(childProcess);
      } else {
        // Python3 or Quartz not available, check if we can use alternative methods
        console.log('Python3/Quartz not available, checking alternative permission detection...');

        // Try using a simple AppleScript test as fallback with spawn
        const appleScriptProcess = spawn('osascript', ['-e', `
try
  tell application "System Events"
    get position of mouse
  end tell
  return "accessible"
on error
  return "not-accessible"
end try`], { shell: true });

        let asOutput = '';
        let asError = '';

        appleScriptProcess.stdout?.on('data', (data: any) => {
          asOutput += data.toString();
        });

        appleScriptProcess.stderr?.on('data', (data: any) => {
          asError += data.toString();
        });

        appleScriptProcess.on('close', (asCode: number | null) => {
          const asResult = asOutput.trim() || (asCode !== 0 ? 'applescript-failed' : '');
          console.log('AppleScript accessibility check:', asResult, 'exit code:', asCode);

          const hasPermissions = asResult === 'accessible';
          setHasAccessibilityPermissions(hasPermissions);

          if (!hasPermissions) {
            console.log('No accessibility permissions detected - using fallback approaches');
          } else {
            // Python/Quartz not available but permissions exist - use AppleScript mouse movement
            console.log('Accessibility permissions detected but Python/Quartz unavailable - using AppleScript fallback');
          }
        });

        appleScriptProcess.on('error', (err: any) => {
          console.log('AppleScript process error:', err);
          setHasAccessibilityPermissions(false);
        });
      }
    });

    pythonProcess.on('error', (err: any) => {
      console.log('Python process error:', err);
      // Continue to fallback AppleScript check
      const appleScriptProcess = spawn('osascript', ['-e', `
try
  tell application "System Events"
    get position of mouse
  end tell
  return "accessible"
on error
  return "not-accessible"
end try`], { shell: true });

      let asOutput = '';

      appleScriptProcess.stdout?.on('data', (data: any) => {
        asOutput += data.toString();
      });

      appleScriptProcess.on('close', (asCode: number | null) => {
        const asResult = asOutput.trim() || 'applescript-failed';
        console.log('AppleScript accessibility check (fallback):', asResult);
        setHasAccessibilityPermissions(asResult === 'accessible');
      });

      appleScriptProcess.on('error', () => {
        setHasAccessibilityPermissions(false);
      });
    });
  };

  // Test accessibility permissions using Python/Quartz
  const testAccessibilityPermissions = (childProcess: any) => {
    // Use spawn with shell: true for better environment access
    const { spawn } = childProcess;

    const testProcess = spawn('python3', ['-c', `
import sys
try:
    import Quartz
    # Try to get current mouse position (this requires accessibility permissions)
    pos = Quartz.CGEventGetLocation(Quartz.CGEventCreate(None))
    print('accessible')
except Exception as e:
    print('not-accessible')
    sys.exit(1)
`], { shell: true });

    let testOutput = '';
    let testError = '';

    testProcess.stdout?.on('data', (data: any) => {
      testOutput += data.toString();
    });

    testProcess.stderr?.on('data', (data: any) => {
      testError += data.toString();
    });

    testProcess.on('close', (code: number | null) => {
      const result = testOutput.trim();
      const hasPermissions = result === 'accessible' && code === 0;

      console.log('Python/Quartz accessibility check result:', result, 'exit code:', code, 'error:', testError);
      setHasAccessibilityPermissions(hasPermissions);

      if (!hasPermissions) {
        console.log('No accessibility permissions for Python/Quartz - will try fallback methods');
      } else {
        console.log('Accessibility permissions granted for Python/Quartz - mouse movement available');
      }
    });

    testProcess.on('error', (err: any) => {
      console.log('Python/Quartz test process error:', err);
      setHasAccessibilityPermissions(false);
    });
  };

  // Open System Preferences to accessibility settings
  const openAccessibilitySettings = () => {
    if (platform === 'darwin') {
      const { exec } = require('child_process');
      exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"');
    }
  };

  // Manual recheck of permissions
  const recheckPermissions = () => {
    if (platform === 'darwin') {
      const childProcess = require('child_process');
      console.log('Manually rechecking accessibility permissions...');
      checkAccessibilityPermissions(childProcess);
    }
  };

  const moveMouseByPattern = async (moveCount: number) => {
    try {
      // Get modules using the same approach as initialization
      const { exec } = require('child_process');

      if (!platform) {
        setError('Platform not detected');
        return;
      }

      // Calculate movement based on pattern
      let deltaX = 0;
      let deltaY = 0;

      switch (pattern) {
        case 'tiny':
          // Very small movement, just a few pixels
          deltaX = (moveCount % 2 === 0) ? 2 : -2;
          deltaY = (moveCount % 4 < 2) ? 1 : -1;
          break;

        case 'circle':
          // Small circular pattern
          const angle = (moveCount * 45) % 360;
          const radius = 20;
          deltaX = Math.cos(angle * Math.PI / 180) * radius;
          deltaY = Math.sin(angle * Math.PI / 180) * radius;
          break;

        case 'zigzag':
          // Zigzag pattern
          const step = 30;
          if (moveCount % 4 === 0) {
            deltaX = step;
          } else if (moveCount % 4 === 1) {
            deltaY = step;
          } else if (moveCount % 4 === 2) {
            deltaX = -step;
          } else {
            deltaY = -step;
          }
          break;

        case 'corners':
          // Move to different corners of a small rectangle
          const offset = 50;
          const corner = moveCount % 4;
          switch (corner) {
            case 0:
              deltaX = -offset;
              deltaY = -offset;
              break;
            case 1:
              deltaX = offset;
              deltaY = -offset;
              break;
            case 2:
              deltaX = offset;
              deltaY = offset;
              break;
            case 3:
              deltaX = -offset;
              deltaY = offset;
              break;
          }
          break;
      }

      // Execute platform-specific mouse movement command
      let command = '';
      switch (platform) {
        case 'darwin': // macOS
          if (hasAccessibilityPermissions) {
            // Use Python with CoreGraphics for actual mouse movement
            command = `python3 -c "
import Quartz
# Get current mouse position
pos = Quartz.CGEventGetLocation(Quartz.CGEventCreate(None))
# Calculate new position
newX = pos.x + ${deltaX}
newY = pos.y + ${deltaY}
# Move mouse to new position
Quartz.CGWarpMouseCursorPosition((newX, newY))
print(f'Moved mouse from ({pos.x:.0f}, {pos.y:.0f}) to ({newX:.0f}, {newY:.0f})')
" 2>/dev/null || osascript -e "
tell application \\"System Events\\"
  set currentPos to position of mouse
  set newX to (item 1 of currentPos) + ${deltaX}
  set newY to (item 2 of currentPos) + ${deltaY}
  set position of mouse to {newX, newY}
end tell
" 2>/dev/null || echo "Mouse movement failed"`;
          } else {
            // Try AppleScript even without detected permissions - it might still work
            command = `osascript -e "
tell application \\"System Events\\"
  set currentPos to position of mouse
  set newX to (item 1 of currentPos) + ${deltaX}
  set newY to (item 2 of currentPos) + ${deltaY}
  set position of mouse to {newX, newY}
end tell
" 2>/dev/null || caffeinate -d -t 1 && echo "System kept awake (attempted move: ${deltaX}, ${deltaY})"`;
          }
          break;
        case 'win32': // Windows
          command = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; $pos = [System.Windows.Forms.Cursor]::Position; [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($($pos.X + ${deltaX}), $($pos.Y + ${deltaY}))" 2>nul || powershell -Command "[System.Windows.Forms.SendKeys]::SendWait('{F15}')" && echo "Fallback: F15 key sent"`;
          break;
        case 'linux': // Linux
          command = `xdotool mousemove_relative -- ${deltaX} ${deltaY} 2>/dev/null || xset s reset && echo "Fallback: screensaver reset"`;
          break;
        default:
          console.error('Unsupported platform for mouse movement');
          return;
      }

      // Execute the command via Node.js child_process
      exec(command, (error: any, stdout: any, stderr: any) => {
        if (error) {
          console.error('Mouse movement error:', error);
          console.error('Command was:', command);
          console.error('stderr:', stderr);

          // If actual mouse movement fails, suggest checking permissions
          if (platform === 'darwin') {
            setError(`Mouse movement failed. You may need to grant accessibility permissions to Viberunner in System Preferences > Security & Privacy > Accessibility.`);
            setHasAccessibilityPermissions(false);
          } else {
            setError(`Movement failed: ${error.message}`);
          }
          return;
        }

        console.log(`Mouse movement: (${deltaX}, ${deltaY}) using ${pattern} pattern on ${platform}`);
        if (stdout && stdout.trim()) {
          console.log('Command output:', stdout.trim());
        }
        setLastMove(new Date());
        setTotalMoves((prev: number) => prev + 1);
        setError(null); // Clear any previous errors
      });
    } catch (err: any) {
      console.error('Error in moveMouseByPattern:', err);
      setError(`Error moving mouse: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const startJiggling = () => {
    if (!robotAvailable) {
      setError('Mouse control not available');
      return;
    }

    setIsActive(true);
    setError(null);

    let moveCount = 0;

    // Perform first jiggle immediately
    try {
      moveMouseByPattern(moveCount);
      moveCount++;
    } catch (err: any) {
      console.error('Error with initial mouse movement:', err);
      setError(`Error moving mouse: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsActive(false);
      return;
    }

    // Then set up the interval for subsequent movements
    intervalRef.current = window.setInterval(() => {
      try {
        moveMouseByPattern(moveCount);
        moveCount++;
      } catch (err: any) {
        console.error('Error moving mouse:', err);
        setError(`Error moving mouse: ${err instanceof Error ? err.message : 'Unknown error'}`);
        stopJiggling();
      }
    }, interval * 1000);

    console.log(`Mouse jiggling started with ${interval}s interval using ${pattern} pattern`);
  };

  const stopJiggling = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsActive(false);
    console.log('Mouse jiggling stopped');
  };

  const toggleJiggling = () => {
    if (isActive) {
      stopJiggling();
    } else {
      startJiggling();
    }
  };

  const resetStats = () => {
    setTotalMoves(0);
    setLastMove(null);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A';
    try {
      return date.toLocaleTimeString();
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Theme colors
  const theme = {
    background: '#0a0a0a',
    surface: '#1a1a1a',
    surfaceVariant: '#2a2a2a',
    primary: '#4CAF50',
    secondary: '#2196F3',
    accent: '#FF9800',
    danger: '#f44336',
    text: '#ffffff',
    textSecondary: '#b3b3b3',
    border: '#3a3a3a'
  };

  return (
    <div style={{
      background: theme.background,
      color: theme.text,
      minHeight: '100vh',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        background: theme.surface,
        borderRadius: '12px',
        border: `1px solid ${theme.border}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '2rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            🖱️ Mouse Jiggler
          </h1>

          {/* Status indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            background: isActive ? theme.primary + '20' : theme.surfaceVariant,
            border: `1px solid ${isActive ? theme.primary : theme.border}`
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isActive ? theme.primary : theme.textSecondary,
              animation: isActive ? 'pulse 2s infinite' : 'none'
            }} />
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Standalone utility description */}
        <div style={{
          fontSize: '1rem',
          color: theme.textSecondary,
          lineHeight: '1.5'
        }}>
          <strong>Standalone Utility:</strong> Keep your screen active during presentations, video calls, or long tasks by automatically moving the mouse cursor at configurable intervals.
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          marginBottom: '2rem',
          padding: '1rem',
          background: theme.danger + '20',
          border: `1px solid ${theme.danger}`,
          borderRadius: '8px',
          color: theme.danger
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Permission status and mode selection */}
      {platform === 'darwin' && hasAccessibilityPermissions !== null && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: hasAccessibilityPermissions ? theme.primary + '20' : theme.accent + '20',
          border: `1px solid ${hasAccessibilityPermissions ? theme.primary : theme.accent}`,
          borderRadius: '12px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: hasAccessibilityPermissions ? theme.primary : theme.accent }}>
                {hasAccessibilityPermissions ? '✅ Accessibility Permissions Granted' : '🔒 Accessibility Permissions Needed'}
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4' }}>
                {hasAccessibilityPermissions
                  ? 'Full mouse control available. Viberunner can move your mouse cursor directly.'
                  : 'Mouse jiggler will attempt direct mouse movement and fallback to system activity if needed.'
                }
              </p>
              {!hasAccessibilityPermissions && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: theme.textSecondary, lineHeight: '1.4' }}>
                  <strong>For best results:</strong> Grant accessibility permissions in System Preferences &gt; Security &amp; Privacy &gt; Accessibility, then click "Recheck".
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              {!hasAccessibilityPermissions && (
                <button
                  onClick={openAccessibilitySettings}
                  style={{
                    background: theme.secondary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  Open Settings
                </button>
              )}
              <button
                onClick={recheckPermissions}
                disabled={isActive}
                style={{
                  background: theme.surfaceVariant,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.9rem',
                  cursor: isActive ? 'not-allowed' : 'pointer',
                  opacity: isActive ? 0.5 : 1,
                  whiteSpace: 'nowrap'
                }}
              >
                🔄 Recheck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System check */}
      {!robotAvailable && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          background: theme.accent + '20',
          border: `1px solid ${theme.accent}`,
          borderRadius: '12px',
          color: theme.accent
        }}>
          <h3 style={{ margin: '0 0 1rem 0' }}>🔧 System Requirements</h3>
          <p style={{ margin: '0 0 1rem 0' }}>
            System commands are required for mouse control. If you're seeing this message, platform-specific tools may need to be installed.
          </p>
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>On macOS: Uses built-in osascript (no additional setup)</li>
            <li>On Windows: Uses built-in PowerShell (no additional setup)</li>
            <li>On Linux: Install xdotool with: sudo apt-get install xdotool</li>
          </ul>
        </div>
      )}

      {/* Main controls */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem'
      }}>
        {/* Control panel */}
        <div style={{
          padding: '1.5rem',
          background: theme.surface,
          borderRadius: '12px',
          border: `1px solid ${theme.border}`
        }}>
          <h3 style={{
            margin: '0 0 1.5rem 0',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>
            ⚙️ Controls
          </h3>

          {/* Interval setting */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Jiggle Interval (seconds)
            </label>
            <input
              type="number"
              min="1"
              max="300"
              value={interval.toString()}
              onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isActive}
              style={{
                width: '100%',
                background: theme.surfaceVariant,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                padding: '0.75rem',
                color: theme.text,
                fontSize: '1rem'
              }}
            />
            <div style={{
              marginTop: '0.5rem',
              fontSize: '0.8rem',
              color: theme.textSecondary
            }}>
              Recommended: 30-60 seconds
            </div>
          </div>

          {/* Pattern selection */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Movement Pattern
            </label>
            <select
              value={pattern}
              onChange={(e) => setPattern(e.target.value as any)}
              disabled={isActive}
              style={{
                width: '100%',
                background: theme.surfaceVariant,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                padding: '0.75rem',
                color: theme.text,
                fontSize: '1rem'
              }}
            >
              <option value="tiny">Tiny - Minimal movement (2px)</option>
              <option value="circle">Circle - Small circular pattern</option>
              <option value="zigzag">Zigzag - Back and forth movement</option>
              <option value="corners">Corners - Rectangle pattern</option>
            </select>
          </div>

          {/* Main toggle button */}
          <button
            onClick={toggleJiggling}
            disabled={!robotAvailable}
            style={{
              width: '100%',
              background: isActive ? theme.danger : theme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: robotAvailable ? 'pointer' : 'not-allowed',
              opacity: robotAvailable ? 1 : 0.5,
              transition: 'all 0.2s'
            }}
          >
            {isActive ? '⏹️ Stop Jiggling' : '▶️ Start Jiggling'}
          </button>
        </div>

        {/* Statistics panel */}
        <div style={{
          padding: '1.5rem',
          background: theme.surface,
          borderRadius: '12px',
          border: `1px solid ${theme.border}`
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '1.2rem',
              fontWeight: '600'
            }}>
              📊 Statistics
            </h3>
            <button
              onClick={resetStats}
              style={{
                background: theme.surfaceVariant,
                color: theme.text,
                border: `1px solid ${theme.border}`,
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              🔄 Reset
            </button>
          </div>

          <div style={{
            display: 'grid',
            gap: '1rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Total moves:</span>
              <span style={{ fontWeight: '600', color: theme.primary }}>{totalMoves}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Last move:</span>
              <span style={{ fontWeight: '600' }}>
                {lastMove ? formatTime(lastMove) : 'Never'}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Next move:</span>
              <span style={{ fontWeight: '600', color: theme.secondary }}>
                {formatTime(nextMoveTime)}
              </span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Pattern:</span>
              <span style={{ fontWeight: '600' }}>{pattern}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>Interval:</span>
              <span style={{ fontWeight: '600' }}>{interval}s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage tips */}
      <div style={{
        padding: '1.5rem',
        background: theme.surfaceVariant,
        borderRadius: '12px',
        border: `1px solid ${theme.border}`
      }}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.1rem',
          fontWeight: '600'
        }}>
          💡 Usage Tips
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          fontSize: '0.9rem',
          color: theme.textSecondary
        }}>
          <div>• Use "Tiny" pattern for minimal disruption</div>
          <div>• 30-60 second intervals work well for most use cases</div>
          <div>• Test patterns before important presentations</div>
          <div>• The app keeps your screen active without obvious mouse jumps</div>
          <div>• Stop jiggling when you're actively using the computer</div>
          <div>• Works great during video calls or long downloads</div>
        </div>
      </div>

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

// Export the component for Viberunner to load
export default MouseJiggler;

// Global registration for IIFE bundle
if (typeof window !== 'undefined' && (window as any).__LOAD_VISUALIZER__) {
  (window as any).__LOAD_VISUALIZER__(MouseJiggler);
}