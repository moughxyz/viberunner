import React, { useState, useEffect } from 'react';

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

interface KanbanBoardProps {
  fileData: FileData;
}

interface KanbanItem {
  id: string;
  text: string;
}

interface KanbanColumn {
  id: string;
  title: string;
  items: KanbanItem[];
}

// Add window API types
declare global {
  interface Window {
    api?: {
      writeFile?: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
      backupFile?: (path: string) => Promise<{ success: boolean; backupPath?: string; error?: string }>;
      [key: string]: any;
    };
    __LOAD_VISUALIZER__?: (component: any) => void;
  }
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ fileData }) => {
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ item: KanbanItem; sourceColumnId: string } | null>(null);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const darkTheme = {
    background: '#0a0a0a',
    backgroundSecondary: '#1a1a1a',
    backgroundCard: '#1e1e1e',
    backgroundAccent: '#2a2a2a',
    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    textMuted: '#808080',
    borderColor: '#333333',
    borderAccent: '#444444',
    accentPrimary: '#3b82f6',
    accentSuccess: '#10b981',
    accentWarning: '#f59e0b',
    accentDanger: '#ef4444',
    accentInfo: '#06b6d4',
    shadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    shadowHover: '0 8px 25px rgba(59, 130, 246, 0.15)',
    gradientCard: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
    gradientAccent: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
  };

  useEffect(() => {
    parseKanbanFile();
  }, [fileData]);

  const parseKanbanFile = () => {
    try {
      setLoading(true);
      setError(null);

      let content = fileData.content;

      // Handle base64 encoded content
      if (fileData.mimetype === 'text/plain' && !content.includes('\n') && content.length > 100) {
        try {
          content = atob(content);
        } catch {
          // If base64 decode fails, use content as-is
        }
      }

      const parsedColumns = parseKanbanContent(content);
      setColumns(parsedColumns);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Error parsing kanban file:', err);
      setError(`Failed to parse kanban file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const parseKanbanContent = (content: string): KanbanColumn[] => {
    const lines = content.split('\n');
    const columns: KanbanColumn[] = [];
    let currentColumn: KanbanColumn | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) continue;

      // Check if it's a category line (ends with :)
      if (line.endsWith(':')) {
        const title = line.slice(0, -1).trim();
        currentColumn = {
          id: `col-${Date.now()}-${i}`,
          title,
          items: []
        };
        columns.push(currentColumn);
      } else if (line.startsWith('- ') && currentColumn) {
        // It's an item line
        const text = line.slice(2).trim();
        if (text) {
          currentColumn.items.push({
            id: `item-${Date.now()}-${i}-${Math.random()}`,
            text
          });
        }
      }
    }

    // If no columns were found, create a default one
    if (columns.length === 0) {
      columns.push({
        id: `col-${Date.now()}`,
        title: 'To Do',
        items: content.trim() ? content.split('\n').filter(line => line.trim()).map((line, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          text: line.trim()
        })) : []
      });
    }

    return columns;
  };

  const generateKanbanContent = (cols: KanbanColumn[]): string => {
    return cols.map(column => {
      const header = `${column.title}:`;
      const items = column.items.map(item => `- ${item.text}`).join('\n');
      return items ? `${header}\n${items}` : header;
    }).join('\n\n');
  };

  const saveToFile = async () => {
    try {
      const content = generateKanbanContent(columns);

      // Try to save with backup
      if (window.api?.writeFile) {
        // Create backup first
        if (window.api.backupFile) {
          const backupResult = await window.api.backupFile(fileData.path);
          if (!backupResult.success) {
            console.warn('Backup failed:', backupResult.error);
          }
        }

        const result = await window.api.writeFile(fileData.path, content);
        if (result.success) {
          setHasUnsavedChanges(false);
          alert('✅ Kanban board saved successfully!');
          return;
        } else {
          throw new Error(result.error || 'Failed to save file');
        }
      }

      // Fallback: download file
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileData.analysis?.filename || 'kanban.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('📥 Kanban board downloaded! Replace your original file.');
    } catch (err) {
      console.error('Save failed:', err);
      alert(`❌ Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const addColumn = () => {
    if (!newColumnTitle.trim()) return;

    const newColumn: KanbanColumn = {
      id: `col-${Date.now()}`,
      title: newColumnTitle.trim(),
      items: []
    };

    setColumns([...columns, newColumn]);
    setNewColumnTitle('');
    setHasUnsavedChanges(true);
  };

  const updateColumnTitle = (columnId: string, newTitle: string) => {
    setColumns((cols: KanbanColumn[]) => cols.map((col: KanbanColumn) =>
      col.id === columnId ? { ...col, title: newTitle } : col
    ));
    setEditingColumn(null);
    setHasUnsavedChanges(true);
  };

  const deleteColumn = (columnId: string) => {
    if (confirm('Delete this column and all its items?')) {
      setColumns((cols: KanbanColumn[]) => cols.filter((col: KanbanColumn) => col.id !== columnId));
      setHasUnsavedChanges(true);
    }
  };

  const addItem = (columnId: string) => {
    const text = newItemTexts[columnId]?.trim();
    if (!text) return;

    const newItem: KanbanItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      text
    };

    setColumns((cols: KanbanColumn[]) => cols.map((col: KanbanColumn) =>
      col.id === columnId
        ? { ...col, items: [...col.items, newItem] }
        : col
    ));

    setNewItemTexts((prev: Record<string, string>) => ({ ...prev, [columnId]: '' }));
    setHasUnsavedChanges(true);
  };

  const updateItem = (columnId: string, itemId: string, newText: string) => {
    setColumns((cols: KanbanColumn[]) => cols.map((col: KanbanColumn) =>
      col.id === columnId
        ? {
            ...col,
            items: col.items.map(item =>
              item.id === itemId ? { ...item, text: newText } : item
            )
          }
        : col
    ));
    setEditingItem(null);
    setHasUnsavedChanges(true);
  };

  const deleteItem = (columnId: string, itemId: string) => {
    setColumns((cols: KanbanColumn[]) => cols.map((col: KanbanColumn) =>
      col.id === columnId
        ? { ...col, items: col.items.filter(item => item.id !== itemId) }
        : col
    ));
    setHasUnsavedChanges(true);
  };

  const moveItem = (item: KanbanItem, fromColumnId: string, toColumnId: string) => {
    if (fromColumnId === toColumnId) return;

    setColumns((cols: KanbanColumn[]) => cols.map((col: KanbanColumn) => {
      if (col.id === fromColumnId) {
        return { ...col, items: col.items.filter(i => i.id !== item.id) };
      } else if (col.id === toColumnId) {
        return { ...col, items: [...col.items, item] };
      }
      return col;
    }));
    setHasUnsavedChanges(true);
  };

  const handleDragStart = (e: React.DragEvent, item: KanbanItem, columnId: string) => {
    setDraggedItem({ item, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    if (draggedItem) {
      moveItem(draggedItem.item, draggedItem.sourceColumnId, targetColumnId);
      setDraggedItem(null);
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: darkTheme.background,
        color: darkTheme.textPrimary,
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
        <div style={{ fontSize: '1.2rem' }}>Loading Kanban board...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: darkTheme.background,
        color: darkTheme.accentDanger,
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
        <div style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Error loading Kanban board</div>
        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '2rem',
      background: darkTheme.background,
      color: darkTheme.textPrimary,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        background: darkTheme.gradientCard,
        borderRadius: '16px',
        border: `1px solid ${darkTheme.borderColor}`,
        boxShadow: darkTheme.shadow
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '600' }}>
            📋 Kanban Board
          </h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {hasUnsavedChanges && (
              <span style={{
                color: darkTheme.accentWarning,
                fontSize: '0.9rem',
                padding: '0.5rem 1rem',
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: '6px',
                border: `1px solid ${darkTheme.accentWarning}30`
              }}>
                ⚠️ Unsaved changes
              </span>
            )}
            <button
              onClick={saveToFile}
              style={{
                background: darkTheme.gradientAccent,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: hasUnsavedChanges ? darkTheme.shadowHover : darkTheme.shadow
              }}
            >
              💾 Save Board
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ color: darkTheme.textSecondary }}>
            📁 <strong>{fileData.analysis?.filename || 'kanban.txt'}</strong>
          </div>
          <div style={{ color: darkTheme.textSecondary }}>
            📊 {columns.length} columns, {columns.reduce((total, col) => total + col.items.length, 0)} items
          </div>
        </div>

        {/* Add Column */}
        <div style={{
          marginTop: '1rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="New column title..."
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addColumn()}
            style={{
              background: darkTheme.backgroundCard,
              border: `1px solid ${darkTheme.borderColor}`,
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              color: darkTheme.textPrimary,
              fontSize: '0.9rem',
              minWidth: '200px'
            }}
          />
          <button
            onClick={addColumn}
            disabled={!newColumnTitle.trim()}
            style={{
              background: newColumnTitle.trim() ? darkTheme.accentSuccess : darkTheme.backgroundCard,
              color: newColumnTitle.trim() ? 'white' : darkTheme.textMuted,
              border: `1px solid ${newColumnTitle.trim() ? darkTheme.accentSuccess : darkTheme.borderColor}`,
              borderRadius: '6px',
              padding: '0.5rem 1rem',
              cursor: newColumnTitle.trim() ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem'
            }}
          >
            ➕ Add Column
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        overflowX: 'auto',
        paddingBottom: '1rem',
        minHeight: '400px'
      }}>
        {columns.map(column => (
          <div
            key={column.id}
            style={{
              minWidth: '300px',
              background: darkTheme.backgroundCard,
              borderRadius: '12px',
              border: `1px solid ${darkTheme.borderColor}`,
              padding: '1rem',
              boxShadow: darkTheme.shadow,
              display: 'flex',
              flexDirection: 'column'
            }}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            {/* Column Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: `1px solid ${darkTheme.borderColor}`
            }}>
              {editingColumn === column.id ? (
                <input
                  type="text"
                  defaultValue={column.title}
                  autoFocus
                  onBlur={(e) => updateColumnTitle(column.id, e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      updateColumnTitle(column.id, (e.target as HTMLInputElement).value);
                    }
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: darkTheme.textPrimary,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    width: '100%'
                  }}
                />
              ) : (
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => setEditingColumn(column.id)}
                >
                  {column.title} ({column.items.length})
                </h3>
              )}
              <button
                onClick={() => deleteColumn(column.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: darkTheme.accentDanger,
                  cursor: 'pointer',
                  fontSize: '1rem',
                  padding: '0.25rem'
                }}
                title="Delete column"
              >
                🗑️
              </button>
            </div>

            {/* Items */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {column.items.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item, column.id)}
                  style={{
                    background: draggedItem?.item.id === item.id
                      ? `${darkTheme.accentPrimary}20`
                      : darkTheme.backgroundAccent,
                    border: `1px solid ${draggedItem?.item.id === item.id
                      ? darkTheme.accentPrimary
                      : darkTheme.borderAccent}`,
                    borderRadius: '8px',
                    padding: '0.75rem',
                    cursor: 'move',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    if (draggedItem?.item.id !== item.id) {
                      e.currentTarget.style.borderColor = darkTheme.accentPrimary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (draggedItem?.item.id !== item.id) {
                      e.currentTarget.style.borderColor = darkTheme.borderAccent;
                    }
                  }}
                >
                  {editingItem === item.id ? (
                    <textarea
                      defaultValue={item.text}
                      autoFocus
                      onBlur={(e) => updateItem(column.id, item.id, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          updateItem(column.id, item.id, (e.target as HTMLTextAreaElement).value);
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: darkTheme.textPrimary,
                        fontSize: '0.9rem',
                        width: '100%',
                        resize: 'vertical',
                        minHeight: '40px'
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: '0.9rem',
                        lineHeight: '1.4',
                        flex: 1,
                        cursor: 'text'
                      }}
                      onClick={() => setEditingItem(item.id)}
                    >
                      {item.text}
                    </span>
                  )}
                  <button
                    onClick={() => deleteItem(column.id, item.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: darkTheme.accentDanger,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      padding: '0.25rem',
                      opacity: 0.7,
                      flexShrink: 0
                    }}
                    title="Delete item"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Add New Item */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginTop: '0.5rem'
              }}>
                <input
                  type="text"
                  placeholder="Add new item..."
                  value={newItemTexts[column.id] || ''}
                  onChange={(e) => setNewItemTexts((prev: Record<string, string>) => ({
                    ...prev,
                    [column.id]: e.target.value
                  }))}
                  onKeyPress={(e) => e.key === 'Enter' && addItem(column.id)}
                  style={{
                    flex: 1,
                    background: darkTheme.backgroundSecondary,
                    border: `1px solid ${darkTheme.borderColor}`,
                    borderRadius: '6px',
                    padding: '0.5rem',
                    color: darkTheme.textPrimary,
                    fontSize: '0.8rem'
                  }}
                />
                <button
                  onClick={() => addItem(column.id)}
                  disabled={!newItemTexts[column.id]?.trim()}
                  style={{
                    background: newItemTexts[column.id]?.trim()
                      ? darkTheme.accentPrimary
                      : darkTheme.backgroundSecondary,
                    color: newItemTexts[column.id]?.trim()
                      ? 'white'
                      : darkTheme.textMuted,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.5rem',
                    cursor: newItemTexts[column.id]?.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '0.8rem'
                  }}
                >
                  ➕
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {columns.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: darkTheme.textMuted,
            background: darkTheme.backgroundCard,
            borderRadius: '12px',
            border: `1px dashed ${darkTheme.borderColor}`,
            width: '100%'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
            <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              No columns found
            </div>
            <div style={{ fontSize: '0.9rem' }}>
              Add a column above to get started!
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export the component for Vizor to load
export default KanbanBoard;

// Global registration for IIFE bundle
if (typeof window !== 'undefined' && (window as any).__LOAD_VISUALIZER__) {
  (window as any).__LOAD_VISUALIZER__(KanbanBoard);
}