import React, { useState, useEffect } from 'react';

interface FileData {
  path: string;
  mimetype: string;
  content: string;
}

interface FolderizeProps {
  fileData: FileData;
}

interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  extension?: string;
  modified?: string;
}

const Folderize: React.FC<FolderizeProps> = ({ fileData }) => {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFolderContents = async () => {
      try {
        setLoading(true);
        setError(null);

        const folderPath = fileData.path;
        console.log('Loading folder contents for:', folderPath);

        // Use the new IPC API to read actual directory contents
        const result = await (window as any).api.readDirectory(folderPath);

        if (result.success) {
          const realFiles = result.files.map((file: any) => ({
            name: file.name,
            path: file.path,
            isDirectory: file.isDirectory,
            size: file.size,
            extension: file.extension,
            modified: file.modified
          }));

          console.log(`Loaded ${realFiles.length} real files from ${folderPath}`);
          setFiles(realFiles);
        } else {
          console.error('Failed to read directory:', result.error);
          setError(result.error || 'Failed to read directory contents');
        }
      } catch (err) {
        console.error('Error loading folder contents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load folder contents');
      } finally {
        setLoading(false);
      }
    };

    loadFolderContents();
  }, [fileData.path]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: FileInfo): string => {
    if (file.isDirectory) return '📁';

    switch (file.extension?.toLowerCase()) {
      case 'pdf': return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': return '🖼️';
      case 'mp4':
      case 'mov':
      case 'avi': return '🎥';
      case 'mp3':
      case 'wav':
      case 'flac': return '🎵';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx': return '⚡';
      case 'html':
      case 'css': return '🌐';
      case 'json':
      case 'xml': return '📋';
      case 'txt':
      case 'md': return '📝';
      case 'zip':
      case 'rar':
      case '7z': return '🗜️';
      default: return '📄';
    }
  };

  const darkTheme = {
    background: '#0a0a0a',
    backgroundSecondary: '#1a1a1a',
    backgroundCard: '#1e1e1e',
    textPrimary: '#ffffff',
    textSecondary: '#b3b3b3',
    textMuted: '#808080',
    borderColor: '#333333',
    accentPrimary: '#3b82f6',
    shadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    shadowHover: '0 8px 25px rgba(59, 130, 246, 0.3)'
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
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: '2rem',
          marginBottom: '1rem',
          animation: 'pulse 2s infinite'
        }}>📁</div>
        <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Loading folder contents...</div>
        <div style={{ color: darkTheme.textSecondary, fontSize: '0.9rem' }}>Reading: {fileData.path}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: darkTheme.background,
        color: '#ef4444',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
        <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Error loading folder</div>
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
        background: `linear-gradient(135deg, ${darkTheme.backgroundCard} 0%, ${darkTheme.backgroundSecondary} 100%)`,
        borderRadius: '16px',
        border: `1px solid ${darkTheme.borderColor}`,
        boxShadow: darkTheme.shadow
      }}>
        <h2 style={{
          margin: '0 0 0.5rem 0',
          display: 'flex',
          alignItems: 'center',
          fontSize: '1.8rem',
          fontWeight: '600'
        }}>
          📁 <span style={{ marginLeft: '0.75rem' }}>{fileData.path.split('/').pop() || 'Folder'}</span>
        </h2>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <p style={{
            margin: '0',
            color: darkTheme.textSecondary,
            fontSize: '0.9rem'
          }}>
            📊 {files.length} items
          </p>
          <p style={{
            margin: '0',
            color: darkTheme.textMuted,
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            padding: '0.25rem 0.5rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '6px'
          }}>
            {fileData.path}
          </p>
        </div>
      </div>

      {/* Files Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1.5rem'
      }}>
        {files.map((file) => (
          <div
            key={file.path}
            style={{
              background: `linear-gradient(135deg, ${darkTheme.backgroundCard} 0%, ${darkTheme.backgroundSecondary} 100%)`,
              border: `1px solid ${darkTheme.borderColor}`,
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: darkTheme.shadow,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = darkTheme.shadowHover;
              e.currentTarget.style.borderColor = darkTheme.accentPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = darkTheme.shadow;
              e.currentTarget.style.borderColor = darkTheme.borderColor;
            }}
          >
            {/* Gradient overlay on hover */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: `linear-gradient(135deg, ${darkTheme.accentPrimary} 0%, #8b5cf6 100%)`
            }} />

            {/* File Icon */}
            <div style={{
              fontSize: '2.5rem',
              textAlign: 'center',
              marginBottom: '1rem',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}>
              {getFileIcon(file)}
            </div>

            {/* File Name */}
            <div style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              marginBottom: '0.5rem',
              wordBreak: 'break-word',
              textAlign: 'center',
              color: darkTheme.textPrimary,
              lineHeight: '1.3'
            }}>
              {file.name}
            </div>

            {/* File Size */}
            {!file.isDirectory && file.size && (
              <div style={{
                fontSize: '0.8rem',
                color: darkTheme.textSecondary,
                textAlign: 'center',
                marginBottom: '0.5rem',
                padding: '0.25rem 0.5rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                💾 {formatFileSize(file.size)}
              </div>
            )}

            {/* File Type */}
            <div style={{
              fontSize: '0.7rem',
              color: darkTheme.textMuted,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontWeight: '500'
            }}>
              {file.isDirectory ? '📁 Directory' : `📄 ${file.extension?.toUpperCase() || 'File'}`}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {files.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '4rem',
          color: darkTheme.textMuted,
          fontSize: '1.1rem',
          background: `linear-gradient(135deg, ${darkTheme.backgroundCard} 0%, ${darkTheme.backgroundSecondary} 100%)`,
          borderRadius: '16px',
          border: `1px dashed ${darkTheme.borderColor}`,
          marginTop: '2rem'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
          <div>This folder appears to be empty</div>
        </div>
      )}
    </div>
  );
};

export default Folderize;