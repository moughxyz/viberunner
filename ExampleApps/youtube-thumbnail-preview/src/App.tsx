import React, { useState, useEffect } from 'react';

interface YouTubeThumbnailPreviewProps {
  // New API - direct file path access
  fileInput?: {
    path: string;
    mimetype: string;
  };

  // Legacy API support for backward compatibility
  fileData?: {
    path: string;
    mimetype: string;
    content: string;
    analysis?: {
      filename: string;
      size: number;
      isJson: boolean;
      jsonContent?: any;
    };
  };
}

// Add window API types
declare global {
  interface Window {
    api?: {
      [key: string]: any;
    };
    __LOAD_APP__?: (component: any) => void;
    __LOAD_APP__?: (component: any) => void;
  }
}

const YouTubeThumbnailPreview: React.FC<YouTubeThumbnailPreviewProps> = ({ fileInput, fileData }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [channelName, setChannelName] = useState('Your Channel');
  const [viewCount, setViewCount] = useState('1.2K');
  const [timeAgo, setTimeAgo] = useState('2 hours ago');
  const [videoDuration, setVideoDuration] = useState('10:24');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');

  // YouTube theme colors
  const themes = {
    dark: {
      background: '#0f0f0f',
      surface: '#212121',
      surfaceVariant: '#2f2f2f',
      primary: '#ff0000',
      onSurface: '#ffffff',
      onSurfaceVariant: '#aaaaaa',
      border: '#3f3f3f'
    },
    light: {
      background: '#ffffff',
      surface: '#f9f9f9',
      surfaceVariant: '#f0f0f0',
      primary: '#ff0000',
      onSurface: '#0f0f0f',
      onSurfaceVariant: '#606060',
      border: '#e0e0e0'
    }
  };

  const currentTheme = themes[theme];

  useEffect(() => {
    loadImage();
    // Generate default title from filename
    const path = fileInput?.path || fileData?.path;
    if (path) {
      const filename = (window as any).api?.path?.basename(path) || path.split('/').pop() || '';
      const name = filename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
      setVideoTitle(name.replace(/[-_]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()));
    }
  }, [fileInput, fileData]);

  const loadImage = async () => {
    try {
      setLoading(true);
      setError(null);

      let imageDataUrl: string;
      let mimeType: string;

      // Use new API if available (much simpler!)
      if (fileInput) {
        console.log('Using new API to load image:', fileInput.path);
        try {
          const imageBuffer = (window as any).api.fs.readFileSync(fileInput.path);
          const base64Data = imageBuffer.toString('base64');
          mimeType = fileInput.mimetype;
          imageDataUrl = `data:${mimeType};base64,${base64Data}`;
          console.log('Successfully loaded image with new API');
        } catch (error) {
          console.error('Failed to read image file with new API:', error);
          throw new Error(`Failed to read image file: ${error}`);
        }
      } else if (fileData) {
        console.log('Using legacy API to load image');
        // Legacy API: Use pre-provided content (keep existing complex logic for backward compatibility)
        let imageData = fileData.content;

        // If it's already a data URL, use it directly
        if (imageData.startsWith('data:')) {
          setImageUrl(imageData);
          setLoading(false);
          return;
        }

        // Step 1: Try to decode URL-encoded data if present
        let processedData = imageData;
        if (imageData.includes('%')) {
          try {
            processedData = decodeURIComponent(imageData);
            console.log('Detected and decoded URL-encoded data');
          } catch (decodeErr) {
            console.warn('Failed to decode URL-encoded data, using original');
            processedData = imageData;
          }
        }

        // Step 2: Check for UTF-8 corruption (replacement characters)
        const hasUTF8Corruption = processedData.includes('') || processedData.includes('\uFFFD');
        if (hasUTF8Corruption) {
          console.warn('Detected UTF-8 corruption in image data - attempting to work with Vizor file system API');

          // Try to get the original file content if window.api is available
          if (window.api && window.api.fs.readFileSync && fileData.path) {
            try {
              console.log('Attempting to re-read file with proper binary handling...');
              const binaryContent = await window.api.fs.readFileSync(fileData.path, { encoding: 'base64' });
              if (binaryContent && typeof binaryContent === 'string') {
                processedData = binaryContent;
                console.log('Successfully re-read file as proper base64');
              }
            } catch (apiErr) {
              console.warn('Could not re-read file via API:', apiErr);
            }
          }
        }

        // Clean up the base64 string - remove any whitespace or newlines
        const cleanBase64 = processedData.replace(/\s/g, '');

        // Get MIME type, defaulting based on file extension if not provided
        mimeType = fileData.mimetype;
        if (!mimeType && fileData.analysis?.filename) {
          const extension = fileData.analysis.filename.toLowerCase().split('.').pop();
          const mimeMap: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'webp': 'image/webp',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml'
          };
          mimeType = mimeMap[extension || ''] || 'image/jpeg';
        }
        mimeType = mimeType || 'image/jpeg';

        // Create data URL from base64 content
        imageDataUrl = `data:${mimeType};base64,${cleanBase64}`;
      } else {
        throw new Error('No file input provided');
      }

      // Test if the image can be loaded
      const testImage = new Image();

      const imageLoadPromise = new Promise<void>((resolve, reject) => {
        testImage.onload = () => {
          console.log('Image loaded successfully:', {
            width: testImage.width,
            height: testImage.height,
            mimeType
          });
          setImageUrl(imageDataUrl);
          resolve();
        };

        testImage.onerror = (errorEvent) => {
          console.error('Image load failed:', errorEvent);
          console.error('Failed data URL preview:', imageDataUrl.substring(0, 100) + '...');
          reject(new Error('Image failed to load. The file may be corrupted, not a valid image format, or the base64 data may be malformed.'));
        };
      });

      // Set src and wait for load/error
      testImage.src = imageDataUrl;
      await imageLoadPromise;

    } catch (err) {
      console.error('Image processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: string) => {
    // Keep the user's format or provide example formatting
    return num || '1.2K';
  };

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        background: currentTheme.background,
        color: currentTheme.onSurface,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📺</div>
        <div style={{ fontSize: '1.2rem' }}>Loading thumbnail preview...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        background: currentTheme.background,
        color: currentTheme.onSurface,
        minHeight: '100vh'
      }}>
        <div style={{
          padding: '2rem',
          background: currentTheme.surface,
          borderRadius: '12px',
          border: `2px solid ${currentTheme.primary}`,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{
            margin: '0 0 1rem 0',
            color: currentTheme.primary,
            fontSize: '1.5rem'
          }}>
            Image Loading Error
          </h2>
          <div style={{
            fontSize: '1rem',
            marginBottom: '1.5rem',
            color: currentTheme.onSurfaceVariant,
            lineHeight: '1.5'
          }}>
            {error}
          </div>

          {/* File Info for debugging */}
          <div style={{
            background: currentTheme.surfaceVariant,
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: currentTheme.onSurface }}>File Information:</h4>
            <div style={{ fontSize: '0.9rem', color: currentTheme.onSurfaceVariant }}>
              <div>📁 <strong>Filename:</strong> {fileData?.analysis?.filename || 'Unknown'}</div>
              <div>🎨 <strong>MIME Type:</strong> {fileData?.mimetype || 'Unknown'}</div>
              <div>📊 <strong>Size:</strong> {fileData?.analysis?.size ? `${(fileData.analysis.size / 1024).toFixed(1)} KB` : 'Unknown'}</div>
              <div>📝 <strong>Content Length:</strong> {fileData?.content.length} characters</div>
              <div>🔍 <strong>Content Preview:</strong> {fileData?.content.substring(0, 50)}...</div>
            </div>
          </div>

          <div style={{
            background: currentTheme.surfaceVariant,
            borderRadius: '8px',
            padding: '1rem',
            textAlign: 'left'
          }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: currentTheme.onSurface }}>Troubleshooting Tips:</h4>
            <ul style={{
              margin: 0,
              paddingLeft: '1.5rem',
              fontSize: '0.9rem',
              color: currentTheme.onSurfaceVariant
            }}>
              <li>Ensure the file is a valid image format (JPG, PNG, GIF, WebP)</li>
              <li>Check that the file isn't corrupted</li>
              <li>Verify the file size is under 10MB</li>
              <li>Try with a different image file</li>
              <li>Make sure the image has the correct file extension</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const ThumbnailCard = ({ size }: { size: 'small' | 'medium' | 'large' }) => {
    const sizes = {
      small: { width: '168px', height: '94px' },
      medium: { width: '360px', height: '202px' },
      large: { width: '480px', height: '270px' }
    };

    const textSizes = {
      small: { title: '12px', channel: '11px', meta: '11px' },
      medium: { title: '14px', channel: '13px', meta: '12px' },
      large: { title: '16px', channel: '14px', meta: '13px' }
    };

    return (
      <div style={{
        display: 'flex',
        flexDirection: layout === 'grid' ? 'column' : 'row',
        gap: layout === 'grid' ? '8px' : '12px',
        maxWidth: layout === 'grid' ? sizes[size].width : '100%'
      }}>
        {/* Thumbnail */}
        <div style={{
          position: 'relative',
          width: sizes[size].width,
          height: sizes[size].height,
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: currentTheme.surfaceVariant,
          flexShrink: 0
        }}>
          <img
            src={imageUrl}
            alt="Video thumbnail"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              // Fallback to a placeholder when image fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `
                <div style="
                  width: 100%;
                  height: 100%;
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  background: ${currentTheme.surfaceVariant};
                  color: ${currentTheme.onSurfaceVariant};
                  font-size: 2rem;
                ">
                  <div>🖼️</div>
                  <div style="font-size: 0.8rem; margin-top: 0.5rem;">Image Error</div>
                </div>
              `;
            }}
          />
          {/* Duration badge */}
          <div style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '2px 4px',
            borderRadius: '2px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            {videoDuration}
          </div>
        </div>

        {/* Video details */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* Title */}
          <div style={{
            fontSize: textSizes[size].title,
            fontWeight: '500',
            color: currentTheme.onSurface,
            lineHeight: '1.4',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: layout === 'grid' ? 2 : 1,
            WebkitBoxOrient: 'vertical' as any
          }}>
            {videoTitle || 'Your Video Title'}
          </div>

          {/* Channel name */}
          <div style={{
            fontSize: textSizes[size].channel,
            color: currentTheme.onSurfaceVariant,
            fontWeight: '400'
          }}>
            {channelName}
          </div>

          {/* View count and time */}
          <div style={{
            fontSize: textSizes[size].meta,
            color: currentTheme.onSurfaceVariant,
            fontWeight: '400'
          }}>
            {formatNumber(viewCount)} views • {timeAgo}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      background: currentTheme.background,
      color: currentTheme.onSurface,
      minHeight: '100vh',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        padding: '1.5rem',
        background: currentTheme.surface,
        borderRadius: '12px',
        border: `1px solid ${currentTheme.border}`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.8rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            📺 YouTube Thumbnail Preview
          </h1>

          {/* Theme & Layout Controls */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              style={{
                background: theme === 'dark' ? '#ffffff20' : '#00000020',
                color: currentTheme.onSurface,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={() => setLayout(layout === 'grid' ? 'list' : 'grid')}
              style={{
                background: currentTheme.surfaceVariant,
                color: currentTheme.onSurface,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {layout === 'grid' ? '📋 List' : '▦ Grid'}
            </button>
          </div>
        </div>

        {/* File Info */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          marginBottom: '1.5rem',
          color: currentTheme.onSurfaceVariant
        }}>
          <div>📁 <strong>{fileData?.analysis?.filename || 'thumbnail.jpg'}</strong></div>
          <div>📊 {fileData?.analysis?.size ? `${(fileData.analysis.size / 1024).toFixed(1)} KB` : 'Unknown size'}</div>
          <div>🎨 {fileData?.mimetype}</div>
        </div>

        {/* Customization Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Video Title
            </label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Enter your video title..."
              style={{
                width: '100%',
                background: currentTheme.surfaceVariant,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                padding: '0.75rem',
                color: currentTheme.onSurface,
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Channel Name
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Your channel name..."
              style={{
                width: '100%',
                background: currentTheme.surfaceVariant,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                padding: '0.75rem',
                color: currentTheme.onSurface,
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              View Count
            </label>
            <input
              type="text"
              value={viewCount}
              onChange={(e) => setViewCount(e.target.value)}
              placeholder="e.g., 1.2K, 15K, 1M..."
              style={{
                width: '100%',
                background: currentTheme.surfaceVariant,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                padding: '0.75rem',
                color: currentTheme.onSurface,
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Video Duration
            </label>
            <input
              type="text"
              value={videoDuration}
              onChange={(e) => setVideoDuration(e.target.value)}
              placeholder="e.g., 10:24, 1:23:45..."
              style={{
                width: '100%',
                background: currentTheme.surfaceVariant,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                padding: '0.75rem',
                color: currentTheme.onSurface,
                fontSize: '0.9rem'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}>
              Upload Time
            </label>
            <input
              type="text"
              value={timeAgo}
              onChange={(e) => setTimeAgo(e.target.value)}
              placeholder="e.g., 2 hours ago, 3 days ago..."
              style={{
                width: '100%',
                background: currentTheme.surfaceVariant,
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                padding: '0.75rem',
                color: currentTheme.onSurface,
                fontSize: '0.9rem'
              }}
            />
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div style={{
        display: 'grid',
        gap: '2rem'
      }}>
        {/* Desktop Grid View */}
        <div style={{
          padding: '1.5rem',
          background: currentTheme.surface,
          borderRadius: '12px',
          border: `1px solid ${currentTheme.border}`
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>
            Desktop Grid View
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: '1rem',
            justifyItems: 'start'
          }}>
            <ThumbnailCard size="medium" />
          </div>
        </div>

        {/* Mobile View */}
        <div style={{
          padding: '1.5rem',
          background: currentTheme.surface,
          borderRadius: '12px',
          border: `1px solid ${currentTheme.border}`
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>
            Mobile View
          </h3>
          <div style={{
            maxWidth: '400px'
          }}>
            <ThumbnailCard size="small" />
          </div>
        </div>

        {/* Large Preview */}
        <div style={{
          padding: '1.5rem',
          background: currentTheme.surface,
          borderRadius: '12px',
          border: `1px solid ${currentTheme.border}`
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>
            Large Preview
          </h3>
          <div style={{
            maxWidth: '600px'
          }}>
            <ThumbnailCard size="large" />
          </div>
        </div>

        {/* List View */}
        <div style={{
          padding: '1.5rem',
          background: currentTheme.surface,
          borderRadius: '12px',
          border: `1px solid ${currentTheme.border}`
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            fontSize: '1.2rem',
            fontWeight: '600'
          }}>
            List View
          </h3>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxWidth: '800px'
          }}>
            {/* Simulate list layout */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{
                position: 'relative',
                width: '168px',
                height: '94px',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: currentTheme.surfaceVariant,
                flexShrink: 0
              }}>
                <img
                  src={imageUrl}
                  alt="Video thumbnail"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    // Fallback to a placeholder when image fails to load
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div style="
                        width: 100%;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        background: ${currentTheme.surfaceVariant};
                        color: ${currentTheme.onSurfaceVariant};
                        font-size: 2rem;
                      ">
                        <div>🖼️</div>
                        <div style="font-size: 0.8rem; margin-top: 0.5rem;">Image Error</div>
                      </div>
                    `;
                  }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {videoDuration}
                </div>
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                flex: 1
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: currentTheme.onSurface,
                  lineHeight: '1.4'
                }}>
                  {videoTitle || 'Your Video Title'}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: currentTheme.onSurfaceVariant
                }}>
                  {channelName}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: currentTheme.onSurfaceVariant
                }}>
                  {formatNumber(viewCount)} views • {timeAgo}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tips Section */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        background: currentTheme.surfaceVariant,
        borderRadius: '12px',
        border: `1px solid ${currentTheme.border}`
      }}>
        <h3 style={{
          margin: '0 0 1rem 0',
          fontSize: '1.1rem',
          fontWeight: '600'
        }}>
          💡 Thumbnail Tips
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          fontSize: '0.9rem',
          color: currentTheme.onSurfaceVariant
        }}>
          <div>• Use high contrast colors and bold text</div>
          <div>• Keep important elements away from duration badge</div>
          <div>• Test readability at small sizes</div>
          <div>• Include faces or expressions when possible</div>
          <div>• Use 1280x720 resolution (16:9 aspect ratio)</div>
          <div>• Avoid clutter - focus on one main element</div>
        </div>
      </div>
    </div>
  );
};

// Export the component for Vizor to load
export default YouTubeThumbnailPreview;

// Global registration for IIFE bundle
if (typeof window !== 'undefined') {
  // Support both new and legacy loader patterns
  if ((window as any).__LOAD_APP__) {
    (window as any).__LOAD_APP__(YouTubeThumbnailPreview);
  }
  if ((window as any).__LOAD_APP__) {
    (window as any).__LOAD_APP__(YouTubeThumbnailPreview);
  }
}