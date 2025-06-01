import React, { useState, useEffect, useRef } from 'react'

interface PomodoroConfig {
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  sessionsUntilLongBreak: number
}

interface ScriptConfig {
  onBreakStart: string
  onBreakEnd: string
  onStop: string
  enabled: boolean
}

type TimerState = 'idle' | 'work' | 'shortBreak' | 'longBreak' | 'paused'

const DEFAULT_CONFIG: PomodoroConfig = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsUntilLongBreak: 4
}

const DEFAULT_SCRIPTS: ScriptConfig = {
  onBreakStart: '',
  onBreakEnd: '',
  onStop: '',
  enabled: false
}

function App() {
  const [config, setConfig] = useState<PomodoroConfig>(DEFAULT_CONFIG)
  const [scripts, setScripts] = useState<ScriptConfig>(DEFAULT_SCRIPTS)
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [timeLeft, setTimeLeft] = useState(0)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const getCurrentDuration = (): number => {
    switch (timerState) {
      case 'work':
        return config.workMinutes * 60
      case 'shortBreak':
        return config.shortBreakMinutes * 60
      case 'longBreak':
        return config.longBreakMinutes * 60
      default:
        return config.workMinutes * 60
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const executeScript = async (script: string, description: string) => {
    if (!scripts.enabled || !script.trim()) return

    try {
      // In a real Electron environment, you would use ipcRenderer to execute scripts
      // For now, we'll just log what would be executed
      console.log(`[Script] ${description}:`, script)

      // If running in Electron, uncomment the following:
      // const { ipcRenderer } = window.require('electron')
      // await ipcRenderer.invoke('execute-script', script)

      // For web environment, we can only show notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Pomodoro Timer: ${description}`, {
          body: `Executed: ${script.substring(0, 50)}${script.length > 50 ? '...' : ''}`,
          icon: '🍅'
        })
      }
    } catch (error) {
      console.error(`Failed to execute ${description} script:`, error)
    }
  }

  const startTimer = (state: TimerState) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setTimerState(state)
    setTimeLeft(getCurrentDuration())

    if (state === 'shortBreak' || state === 'longBreak') {
      executeScript(scripts.onBreakStart, 'break start')
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleTimerComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleTimerComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    switch (timerState) {
      case 'work':
        const newSessions = sessionsCompleted + 1
        setSessionsCompleted(newSessions)

        if (newSessions % config.sessionsUntilLongBreak === 0) {
          startTimer('longBreak')
        } else {
          startTimer('shortBreak')
        }
        break

      case 'shortBreak':
      case 'longBreak':
        executeScript(scripts.onBreakEnd, 'break end')
        setTimerState('idle')
        break
    }
  }

  const startWork = () => {
    startTimer('work')
  }

  const pauseTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setTimerState('paused')
  }

  const resumeTimer = () => {
    if (timerState === 'paused') {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      setTimerState(sessionsCompleted % config.sessionsUntilLongBreak === 0 && sessionsCompleted > 0 ? 'longBreak' : 'work')
    }
  }

  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    executeScript(scripts.onStop, 'timer stop')
    setTimerState('idle')
    setTimeLeft(0)
  }

  const resetSession = () => {
    stopTimer()
    setSessionsCompleted(0)
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const getStateColor = (): string => {
    switch (timerState) {
      case 'work':
        return '#ef4444'
      case 'shortBreak':
        return '#10b981'
      case 'longBreak':
        return '#3b82f6'
      case 'paused':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  const getStateText = (): string => {
    switch (timerState) {
      case 'work':
        return 'Work Session'
      case 'shortBreak':
        return 'Short Break'
      case 'longBreak':
        return 'Long Break'
      case 'paused':
        return 'Paused'
      default:
        return 'Ready to Start'
    }
  }

  const progressPercentage = timerState === 'idle' ? 0 :
    ((getCurrentDuration() - timeLeft) / getCurrentDuration()) * 100

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      color: '#ffffff',
      minHeight: '100vh',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '20px',
        padding: '3rem',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(135deg, #ff6b6b, #ffd93d)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🍅 Micro Pomodoro
          </h1>
          <p style={{
            color: '#a0a0a0',
            margin: 0,
            fontSize: '1.1rem'
          }}>
            Session {sessionsCompleted + 1} • {getStateText()}
          </p>
        </div>

        {/* Timer Display */}
        <div style={{
          position: 'relative',
          width: '200px',
          height: '200px',
          margin: '0 auto 2rem auto'
        }}>
          {/* Progress Circle */}
          <svg style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: 'rotate(-90deg)'
          }} width="200" height="200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={getStateColor()}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progressPercentage / 100)}`}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>

          {/* Time Text */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '2.5rem',
            fontWeight: 'bold',
            color: getStateColor()
          }}>
            {timerState === 'idle' ? formatTime(config.workMinutes * 60) : formatTime(timeLeft)}
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          marginBottom: '2rem'
        }}>
          {timerState === 'idle' && (
            <button
              onClick={startWork}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#dc2626'}
              onMouseOut={(e) => e.currentTarget.style.background = '#ef4444'}
            >
              Start Work Session
            </button>
          )}

          {(timerState === 'work' || timerState === 'shortBreak' || timerState === 'longBreak') && (
            <button
              onClick={pauseTimer}
              style={{
                background: '#f59e0b',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Pause
            </button>
          )}

          {timerState === 'paused' && (
            <button
              onClick={resumeTimer}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Resume
            </button>
          )}

          {timerState !== 'idle' && (
            <button
              onClick={stopTimer}
              style={{
                background: '#6b7280',
                color: 'white',
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Stop
            </button>
          )}
        </div>

        {/* Secondary Controls */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          marginBottom: '2rem'
        }}>
          <button
            onClick={resetSession}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            Reset Session
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              fontSize: '0.9rem',
              cursor: 'pointer'
            }}
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.5rem',
            marginTop: '1rem',
            textAlign: 'left'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Settings</h3>

            {/* Timer Settings */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#a0a0a0' }}>Timer Duration</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem' }}>
                  Work (min):
                  <input
                    type="number"
                    value={config.workMinutes}
                    onChange={(e) => setConfig({...config, workMinutes: parseInt(e.target.value) || 25})}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      width: '60px',
                      marginLeft: '0.5rem'
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.9rem' }}>
                  Short Break (min):
                  <input
                    type="number"
                    value={config.shortBreakMinutes}
                    onChange={(e) => setConfig({...config, shortBreakMinutes: parseInt(e.target.value) || 5})}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      width: '60px',
                      marginLeft: '0.5rem'
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.9rem' }}>
                  Long Break (min):
                  <input
                    type="number"
                    value={config.longBreakMinutes}
                    onChange={(e) => setConfig({...config, longBreakMinutes: parseInt(e.target.value) || 15})}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      width: '60px',
                      marginLeft: '0.5rem'
                    }}
                  />
                </label>
                <label style={{ fontSize: '0.9rem' }}>
                  Sessions to Long Break:
                  <input
                    type="number"
                    value={config.sessionsUntilLongBreak}
                    onChange={(e) => setConfig({...config, sessionsUntilLongBreak: parseInt(e.target.value) || 4})}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'white',
                      padding: '0.25rem',
                      borderRadius: '4px',
                      width: '60px',
                      marginLeft: '0.5rem'
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Script Settings */}
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#a0a0a0' }}>Automation Scripts</h4>
              <label style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <input
                  type="checkbox"
                  checked={scripts.enabled}
                  onChange={(e) => setScripts({...scripts, enabled: e.target.checked})}
                  style={{ marginRight: '0.5rem' }}
                />
                Enable script execution
              </label>

              {scripts.enabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem' }}>
                    On Break Start:
                    <input
                      type="text"
                      value={scripts.onBreakStart}
                      onChange={(e) => setScripts({...scripts, onBreakStart: e.target.value})}
                      placeholder='e.g., osascript -e "tell app \"Music\" to pause"'
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '0.25rem',
                        borderRadius: '4px',
                        width: '100%',
                        marginTop: '0.25rem'
                      }}
                    />
                  </label>
                  <label style={{ fontSize: '0.9rem' }}>
                    On Break End:
                    <input
                      type="text"
                      value={scripts.onBreakEnd}
                      onChange={(e) => setScripts({...scripts, onBreakEnd: e.target.value})}
                      placeholder='e.g., osascript -e "tell app \"Music\" to play"'
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '0.25rem',
                        borderRadius: '4px',
                        width: '100%',
                        marginTop: '0.25rem'
                      }}
                    />
                  </label>
                  <label style={{ fontSize: '0.9rem' }}>
                    On Timer Stop:
                    <input
                      type="text"
                      value={scripts.onStop}
                      onChange={(e) => setScripts({...scripts, onStop: e.target.value})}
                      placeholder="e.g., brightness 0.8"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        padding: '0.25rem',
                        borderRadius: '4px',
                        width: '100%',
                        marginTop: '0.25rem'
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Info */}
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: '#a0a0a0'
        }}>
          <div>Sessions Completed: {sessionsCompleted}</div>
          <div>
            Next: {(() => {
              if (sessionsCompleted % config.sessionsUntilLongBreak === 0 && sessionsCompleted > 0) {
                return 'Long Break'
              }
              if (timerState === 'work') {
                return (sessionsCompleted + 1) % config.sessionsUntilLongBreak === 0 ? 'Long Break' : 'Short Break'
              }
              return 'Work Session'
            })()}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App