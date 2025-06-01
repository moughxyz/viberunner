import React, { useState, useEffect, useRef } from 'react';

interface DailyNotesProps {
  fileData: null; // Standalone visualizer
  container?: HTMLElement;
  tabId: string;
  appId: string;
}

interface DateInfo {
  date: Date;
  dateString: string;
  displayText: string;
  isToday: boolean;
}

const DailyNotes: React.FC<DailyNotesProps> = ({ tabId, appId }) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [noteContent, setNoteContent] = useState<string>('');
  const [notesDirectory, setNotesDirectory] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const horizontalScrollRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const initialContentRef = useRef<string>('');

  // Initialize preferences helper
  const prefs = (window as any).createPreferencesHelper?.(appId);

  // Initialize notes directory and ensure it exists
  useEffect(() => {
    const initializeNotesDirectory = async () => {
      try {
        const fs = (window as any).api?.fs || require('fs');
        const path = (window as any).api?.path || require('path');

        // Get saved directory preference or use default
        const savedDir = prefs?.getString('notesDirectory', '');
        let targetDir = savedDir;

        if (!targetDir) {
          // Use current working directory + notes folder as default
          const cwd = process.cwd();
          targetDir = path.join(cwd, 'notes');
        }

        // Ensure directory exists
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        setNotesDirectory(targetDir);

        // Save preference if it wasn't set
        if (!savedDir) {
          prefs?.set('notesDirectory', targetDir);
        }
      } catch (err) {
        setError(`Failed to initialize notes directory: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    initializeNotesDirectory();
  }, [appId]);

  // Load note content when selected date or directory changes
  useEffect(() => {
    const loadNoteContent = async () => {
      if (!notesDirectory) return;

      try {
        const fs = (window as any).api?.fs || require('fs');
        const path = (window as any).api?.path || require('path');

        const dateString = formatDateForFilename(selectedDate);
        const filePath = path.join(notesDirectory, `${dateString}.txt`);

        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          setNoteContent(content);
          initialContentRef.current = content;
        } else {
          setNoteContent('');
          initialContentRef.current = '';
        }
        setIsDirty(false);
        setError(null);
      } catch (err) {
        setError(`Failed to load note: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    };

    loadNoteContent();
  }, [selectedDate, notesDirectory]);

  // Auto-save functionality with improved debouncing
  useEffect(() => {
    // Check if content has changed from initial state
    const contentChanged = noteContent !== initialContentRef.current;
    setIsDirty(contentChanged);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only set up auto-save if content has actually changed
    if (contentChanged) {
      saveTimeoutRef.current = window.setTimeout(() => {
        saveNote();
      }, 750); // Reduced from 2000ms to 750ms
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [noteContent, selectedDate, notesDirectory]);

  // Cleanup on unmount
  useEffect(() => {
    const cleanup = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };

    // Register cleanup function for this tab
    if ((window as any).registerCleanup) {
      (window as any).registerCleanup(tabId, cleanup);
    }

    return cleanup;
  }, [tabId]);

  // Format date for filename (YYYY-MM-DD)
  const formatDateForFilename = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Format date for display
  const formatDateForDisplay = (date: Date, isToday: boolean): string => {
    if (isToday) return 'Today';

    const today = new Date();

    // Use localized date formatting
    if (date.getFullYear() === today.getFullYear()) {
      // Same year: "May 31"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } else {
      // Different year: "May 31, 2025"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  // Generate dates for horizontal scroll - show focused dates around today
  const generateDates = (): DateInfo[] => {
    const dates: DateInfo[] = [];
    const today = new Date();

    // Generate 3 days before and 3 days after today for focused navigation
    for (let i = -3; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateString = formatDateForFilename(date);
      const isToday = i === 0;

      dates.push({
        date: new Date(date),
        dateString,
        displayText: formatDateForDisplay(date, isToday),
        isToday
      });
    }

    return dates;
  };

  // Save note to file
  const saveNote = async () => {
    if (!notesDirectory || isSaving) return;

    try {
      setIsSaving(true);
      const fs = (window as any).api?.fs || require('fs');
      const path = (window as any).api?.path || require('path');

      const dateString = formatDateForFilename(selectedDate);
      const filePath = path.join(notesDirectory, `${dateString}.txt`);

      // Only save if there's content or if file already exists (to allow deletion)
      if (noteContent.trim() || fs.existsSync(filePath)) {
        if (noteContent.trim()) {
          fs.writeFileSync(filePath, noteContent, 'utf8');
        } else if (fs.existsSync(filePath)) {
          // Delete empty notes
          fs.unlinkSync(filePath);
        }
        setLastSaved(new Date());
        initialContentRef.current = noteContent;
        setIsDirty(false);
      }
      setError(null);
    } catch (err) {
      setError(`Failed to save note: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Change notes directory
  const changeNotesDirectory = async () => {
    try {
      const { dialog } = (window as any).require('electron');
      const result = await dialog.showOpenDialog({
        title: 'Select Notes Directory',
        properties: ['openDirectory', 'createDirectory']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const newDir = result.filePaths[0];
        setNotesDirectory(newDir);
        prefs?.set('notesDirectory', newDir);
        setShowSettings(false);
      }
    } catch (err) {
      setError(`Failed to change directory: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Show notes directory in finder
  const showNotesDirectoryInFinder = async () => {
    try {
      const { shell } = (window as any).require('electron');
      shell.showItemInFolder(notesDirectory);
    } catch (err) {
      setError(`Failed to show directory: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Navigate to specific date
  const navigateToDate = (date: Date) => {
    setSelectedDate(new Date(date));
    setShowCalendar(false);
  };

  // Get dates for horizontal scroll
  const dates = generateDates();
  const selectedDateString = formatDateForFilename(selectedDate);

  return (
    <div style={{
      padding: '20px',
      background: '#0a0a0a',
      color: '#ffffff',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        borderBottom: '1px solid #333',
        paddingBottom: '20px'
      }}>
        <h2 style={{ margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
          📝 Daily Notes
          {isSaving && <span style={{ fontSize: '14px', color: '#10b981' }}>Saving...</span>}
          {!isSaving && !isDirty && lastSaved && (
            <span style={{
              fontSize: '14px',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ✅ Saved
            </span>
          )}
          {!isSaving && lastSaved && !isDirty && (
            <span style={{ fontSize: '12px', color: '#6b7280' }}>
              {lastSaved.toLocaleTimeString()}
            </span>
          )}
        </h2>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowSettings(!showSettings)}
            style={{
              background: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          background: '#dc2626',
          color: 'white',
          padding: '10px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          ❌ {error}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div style={{
          background: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#3b82f6' }}>Settings</h3>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#b3b3b3' }}>
              Notes Directory:
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{
                flex: 1,
                padding: '8px 12px',
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace'
              }}>
                {notesDirectory || 'Not set'}
              </span>
              <button
                onClick={changeNotesDirectory}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Change
              </button>
              <button
                onClick={showNotesDirectoryInFinder}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Show in Finder
              </button>
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.4' }}>
            <p><strong>Note:</strong> Changing the directory will not transfer existing notes. You must manually copy any existing .txt files to the new directory.</p>
          </div>
        </div>
      )}

      {/* Calendar Picker */}
      {showCalendar && (
        <div style={{
          background: '#1e1e1e',
          border: '1px solid #333',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#3b82f6' }}>Pick a Date</h3>
          <input
            type="date"
            value={formatDateForFilename(selectedDate)}
            onChange={(e) => navigateToDate(new Date(e.target.value))}
            style={{
              background: '#0a0a0a',
              border: '1px solid #333',
              borderRadius: '4px',
              padding: '8px 12px',
              color: '#ffffff',
              fontSize: '14px'
            }}
          />
        </div>
      )}

      {/* Horizontal Date Navigation */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div
          ref={horizontalScrollRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '10px',
            scrollBehavior: 'smooth',
            visibility: 'visible',
            flex: 1
          }}
        >
          {dates.map((dateInfo) => (
            <button
              key={dateInfo.dateString}
              data-is-today={dateInfo.isToday}
              onClick={() => navigateToDate(dateInfo.date)}
              style={{
                minWidth: '120px',
                padding: '12px 16px',
                background: dateInfo.dateString === selectedDateString
                  ? 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)'
                  : dateInfo.isToday
                    ? 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
                    : '#1a1a1a',
                color: dateInfo.isToday ? '#fbbf24' : '#ffffff',
                border: dateInfo.isToday
                  ? '1px solid rgba(251, 191, 36, 0.3)'
                  : dateInfo.dateString === selectedDateString
                    ? '1px solid rgba(59, 130, 246, 0.5)'
                    : '1px solid #333',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: dateInfo.isToday ? '600' : dateInfo.dateString === selectedDateString ? '500' : 'normal',
                whiteSpace: 'nowrap',
                transition: 'all 0.3s ease',
                boxShadow: dateInfo.isToday
                  ? '0 0 20px rgba(251, 191, 36, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  : dateInfo.dateString === selectedDateString
                    ? '0 4px 12px rgba(59, 130, 246, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    : '0 2px 4px rgba(0, 0, 0, 0.1)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (!dateInfo.isToday && dateInfo.dateString !== selectedDateString) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #2a2a2a 0%, #333 100%)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!dateInfo.isToday && dateInfo.dateString !== selectedDateString) {
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              {dateInfo.isToday && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.05) 0%, rgba(251, 191, 36, 0.1) 100%)',
                  borderRadius: '12px',
                  pointerEvents: 'none'
                }} />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>
                {dateInfo.displayText}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowCalendar(!showCalendar)}
          style={{
            background: '#1e40af',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '12px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.3s ease',
            height: 'fit-content'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(30, 64, 175, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1e40af';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          }}
        >
          📅 Calendar
        </button>
      </div>

      {/* Note Editor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <h3 style={{ margin: 0, color: '#b3b3b3' }}>
            Note for {formatDateForDisplay(selectedDate, formatDateForFilename(selectedDate) === formatDateForFilename(new Date()))}
          </h3>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>
            Auto-saves after 750ms of inactivity
          </span>
        </div>

        <textarea
          value={noteContent}
          onChange={(e) => setNoteContent(e.target.value)}
          placeholder={`Write your note for ${formatDateForDisplay(selectedDate, formatDateForFilename(selectedDate) === formatDateForFilename(new Date()))}...`}
          style={{
            flex: 1,
            minHeight: '400px',
            background: '#1e1e1e',
            border: '1px solid #333',
            borderRadius: '8px',
            padding: '20px',
            color: '#ffffff',
            fontSize: '16px',
            lineHeight: '1.6',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            resize: 'vertical',
            outline: 'none'
          }}
        />
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #333',
        fontSize: '12px',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        Notes are saved as .txt files in: {notesDirectory}
      </div>
    </div>
  );
};

// Export the component for Viberunner to load
export default DailyNotes;

// Global registration for IIFE bundle
if (typeof window !== 'undefined' && (window as any).__LOAD_VISUALIZER__) {
  (window as any).__LOAD_VISUALIZER__(DailyNotes);
}