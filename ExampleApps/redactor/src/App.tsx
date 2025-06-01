import React, { useEffect, useRef, useState, useCallback } from 'react';

// TypeScript declarations for global APIs
declare global {
  interface Window {
    registerCleanup?: (tabId: string, cleanup: () => void) => void;
    api?: {
      fs: {
        readFileSync: (path: string) => Buffer;
      };
    };
    __LOAD_VISUALIZER__?: (component: any) => void;
  }
}

interface RedactorProps {
  fileInput: {
    path: string;      // Full file path
    mimetype: string;  // Detected MIME type
  };
  container: HTMLElement; // Mount point
  tabId: string;          // Unique tab identifier for cleanup
  appId: string;          // App identifier for preferences access

  // Legacy support (deprecated - use fileInput instead)
  fileData?: {
    path: string;
    mimetype: string;
    content: string;   // Empty - read files directly
    analysis: object;  // Minimal metadata
  };
}

type RedactionMode = 'black' | 'blur' | 'pixelate';

interface Point {
  x: number;
  y: number;
}

interface RedactionOperation {
  point: Point;
  mode: RedactionMode;
  brushSize: number;
}

const Redactor: React.FC<RedactorProps> = ({ fileInput, fileData, tabId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [redactionMode, setRedactionMode] = useState<RedactionMode>('black');
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [redactionHistory, setRedactionHistory] = useState<RedactionOperation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Use the new fileInput prop, fallback to legacy fileData if needed
  const filePath = fileInput?.path || fileData?.path;
  const mimeType = fileInput?.mimetype || fileData?.mimetype;

  // Register cleanup for this tab
  useEffect(() => {
    if (typeof window !== 'undefined' && window.registerCleanup && tabId) {
      const cleanup = () => {
        console.log('Redactor: Cleaning up resources for tab', tabId);
        setImageLoaded(false);
        setOriginalImage(null);
        setRedactionHistory([]);
      };

      window.registerCleanup(tabId, cleanup);
      return cleanup;
    }
  }, [tabId]);

  // Calculate optimal image size based on window size
  const calculateOptimalSize = useCallback((imgWidth: number, imgHeight: number) => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Reserve space for controls and padding
    const availableWidth = Math.min(windowWidth - 40, windowWidth * 0.95);
    const availableHeight = Math.min(windowHeight - 180, windowHeight * 0.8);

    // Calculate scale to fit while maintaining aspect ratio
    const scaleX = availableWidth / imgWidth;
    const scaleY = availableHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size

    return {
      width: Math.floor(imgWidth * scale),
      height: Math.floor(imgHeight * scale)
    };
  }, []);

  // Load and setup image
  useEffect(() => {
    if (!filePath) {
      setLoadError('No file path provided');
      setIsLoading(false);
      return;
    }

    const img = new Image();

    img.onerror = () => {
      setLoadError('Failed to load image');
      setIsLoading(false);
    };

    img.onload = () => {
      setOriginalImage(img);
      setImageLoaded(true);
      setIsLoading(false);
      setLoadError(null);
    };

    try {
      if (typeof window !== 'undefined' && window.api) {
        const imageBuffer = window.api.fs.readFileSync(filePath);
        const base64Data = imageBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Data}`;
        img.src = dataUrl;
      } else {
        setLoadError('Node.js API not available');
        setIsLoading(false);
      }
    } catch (error) {
      setLoadError('Failed to read image file');
      setIsLoading(false);
    }
  }, [filePath, mimeType]);

  // Initialize canvas when image loads
  useEffect(() => {
    if (!imageLoaded || !originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate and set canvas size
    const { width, height } = calculateOptimalSize(originalImage.width, originalImage.height);
    canvas.width = width;
    canvas.height = height;

    // Draw image
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(originalImage, 0, 0, width, height);

    console.log('Canvas initialized:', { width, height });
  }, [imageLoaded, originalImage, calculateOptimalSize]);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const applyRedaction = useCallback((point: Point) => {
    const canvas = canvasRef.current;
    if (!canvas || !originalImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const radius = brushSize / 2;

    // Track operation
    setRedactionHistory(prev => [...prev, { point, mode: redactionMode, brushSize }]);

    // Apply redaction
    ctx.save();
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
    ctx.clip();

    switch (redactionMode) {
      case 'black':
        ctx.fillStyle = '#000000';
        ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
        break;

      case 'blur':
        // Simple blur implementation
        const imageData = ctx.getImageData(point.x - radius, point.y - radius, radius * 2, radius * 2);
        const blurredData = blurImageData(imageData, 5);
        ctx.putImageData(blurredData, point.x - radius, point.y - radius);
        break;

      case 'pixelate':
        // Simple pixelation
        const pixelData = ctx.getImageData(point.x - radius, point.y - radius, radius * 2, radius * 2);
        const pixelatedData = pixelateImageData(pixelData, 8);
        ctx.putImageData(pixelatedData, point.x - radius, point.y - radius);
        break;
    }

    ctx.restore();
  }, [brushSize, redactionMode, originalImage]);

  // Simple blur function
  const blurImageData = (imageData: ImageData, radius: number) => {
    // Simple box blur
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
              const idx = (ny * width + nx) * 4;
              r += imageData.data[idx];
              g += imageData.data[idx + 1];
              b += imageData.data[idx + 2];
              a += imageData.data[idx + 3];
              count++;
            }
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
        data[idx + 3] = a / count;
      }
    }

    return new ImageData(data, width, height);
  };

  // Simple pixelation function
  const pixelateImageData = (imageData: ImageData, pixelSize: number) => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y += pixelSize) {
      for (let x = 0; x < width; x += pixelSize) {
        // Get average color of pixel block
        let r = 0, g = 0, b = 0, a = 0, count = 0;

        for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
          for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            r += imageData.data[idx];
            g += imageData.data[idx + 1];
            b += imageData.data[idx + 2];
            a += imageData.data[idx + 3];
            count++;
          }
        }

        r /= count;
        g /= count;
        b /= count;
        a /= count;

        // Apply average color to entire block
        for (let dy = 0; dy < pixelSize && y + dy < height; dy++) {
          for (let dx = 0; dx < pixelSize && x + dx < width; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = a;
          }
        }
      }
    }

    return new ImageData(data, width, height);
  };

  const drawLine = useCallback((from: Point, to: Point) => {
    const distance = Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2);
    const steps = Math.ceil(distance / (brushSize / 4));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t
      };
      applyRedaction(point);
    }
  }, [brushSize, applyRedaction]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;
    setIsDrawing(true);
    const point = getCanvasCoordinates(e);
    setLastPoint(point);
    applyRedaction(point);
  }, [imageLoaded, getCanvasCoordinates, applyRedaction]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPoint || !imageLoaded) return;
    const point = getCanvasCoordinates(e);
    drawLine(lastPoint, point);
    setLastPoint(point);
  }, [isDrawing, lastPoint, imageLoaded, getCanvasCoordinates, drawLine]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setLastPoint(null);
  }, []);

  const resetImage = useCallback(() => {
    if (!canvasRef.current || !originalImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Redraw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0, canvas.width, canvas.height);
    setRedactionHistory([]);
  }, [originalImage]);

  const downloadRedactedImage = useCallback(() => {
    if (!canvasRef.current || !originalImage) return;

    // Create a high-resolution canvas at original image size
    const highResCanvas = document.createElement('canvas');
    const highResCtx = highResCanvas.getContext('2d');
    if (!highResCtx) return;

    // Set to original image dimensions
    highResCanvas.width = originalImage.width;
    highResCanvas.height = originalImage.height;

    // Draw original image at full resolution
    highResCtx.imageSmoothingEnabled = true;
    highResCtx.imageSmoothingQuality = 'high';
    highResCtx.drawImage(originalImage, 0, 0);

    // Calculate scale factors from display canvas to original image
    const displayCanvas = canvasRef.current;
    const scaleX = originalImage.width / displayCanvas.width;
    const scaleY = originalImage.height / displayCanvas.height;

    // Reapply all redactions at high resolution
    redactionHistory.forEach(operation => {
      const scaledPoint = {
        x: operation.point.x * scaleX,
        y: operation.point.y * scaleY
      };
      const scaledRadius = (operation.brushSize * Math.min(scaleX, scaleY)) / 2;

      highResCtx.save();
      highResCtx.beginPath();
      highResCtx.arc(scaledPoint.x, scaledPoint.y, scaledRadius, 0, 2 * Math.PI);
      highResCtx.clip();

      switch (operation.mode) {
        case 'black':
          highResCtx.fillStyle = '#000000';
          highResCtx.fillRect(scaledPoint.x - scaledRadius, scaledPoint.y - scaledRadius, scaledRadius * 2, scaledRadius * 2);
          break;

        case 'blur':
          const imageData = highResCtx.getImageData(scaledPoint.x - scaledRadius, scaledPoint.y - scaledRadius, scaledRadius * 2, scaledRadius * 2);
          const blurredData = blurImageData(imageData, Math.floor(scaledRadius / 10));
          highResCtx.putImageData(blurredData, scaledPoint.x - scaledRadius, scaledPoint.y - scaledRadius);
          break;

        case 'pixelate':
          const pixelData = highResCtx.getImageData(scaledPoint.x - scaledRadius, scaledPoint.y - scaledRadius, scaledRadius * 2, scaledRadius * 2);
          const pixelatedData = pixelateImageData(pixelData, Math.max(8, Math.floor(scaledRadius / 8)));
          highResCtx.putImageData(pixelatedData, scaledPoint.x - scaledRadius, scaledPoint.y - scaledRadius);
          break;
      }

      highResCtx.restore();
    });

    const link = document.createElement('a');
    link.download = `redacted_${filePath?.split('/').pop() || 'image'}.png`;
    link.href = highResCanvas.toDataURL('image/png', 1.0);
    link.click();
  }, [filePath, originalImage, redactionHistory, blurImageData, pixelateImageData]);

  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column' as const,
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden'
    },
    header: {
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
      padding: '16px 24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      zIndex: 10
    },
    controls: {
      display: 'flex',
      alignItems: 'center',
      gap: '24px',
      flexWrap: 'wrap' as const,
      justifyContent: 'center'
    },
    controlGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '600' as const,
      color: '#374151',
      marginRight: '8px'
    },
    select: {
      padding: '8px 12px',
      borderRadius: '8px',
      border: '2px solid #e5e7eb',
      background: 'white',
      fontSize: '14px',
      fontWeight: '500' as const,
      color: '#374151',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      outline: 'none'
    },
    slider: {
      width: '120px',
      height: '6px',
      borderRadius: '3px',
      background: '#e5e7eb',
      outline: 'none',
      cursor: 'pointer'
    },
    button: {
      padding: '10px 20px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '14px',
      fontWeight: '600' as const,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      outline: 'none'
    },
    resetButton: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white'
    },
    downloadButton: {
      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      color: 'white'
    },
    mainContent: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflow: 'auto'
    },
    canvasContainer: {
      position: 'relative' as const,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      background: 'white',
      border: '4px solid rgba(255, 255, 255, 0.8)'
    },
    canvas: {
      display: 'block',
      cursor: 'crosshair',
      maxWidth: '100%',
      maxHeight: '100%'
    },
    instructions: {
      position: 'absolute' as const,
      bottom: '-50px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: '14px',
      textAlign: 'center' as const,
      background: 'rgba(0, 0, 0, 0.5)',
      padding: '8px 16px',
      borderRadius: '20px',
      backdropFilter: 'blur(10px)'
    },
    loadingContainer: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    loadingSpinner: {
      width: '40px',
      height: '40px',
      border: '4px solid rgba(255, 255, 255, 0.3)',
      borderTop: '4px solid white',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px'
    },
    loadingText: {
      fontSize: '18px',
      fontWeight: '500' as const
    }
  };

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={styles.loadingSpinner}></div>
        <div style={styles.loadingText}>Loading your image...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ fontSize: '18px', fontWeight: '500', color: '#ef4444' }}>
          {loadError}. Please try again.
        </div>
      </div>
    );
  }

  if (!imageLoaded) {
    return (
      <div style={styles.loadingContainer}>
        <div style={{ fontSize: '18px', fontWeight: '500', color: '#ef4444' }}>
          Failed to load image. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.controls}>
          <div style={styles.controlGroup}>
            <label style={styles.label}>Mode:</label>
            <select
              value={redactionMode}
              onChange={(e) => setRedactionMode(e.target.value as RedactionMode)}
              style={{
                ...styles.select,
                borderColor: redactionMode === 'black' ? '#ef4444' :
                           redactionMode === 'blur' ? '#3b82f6' : '#f59e0b'
              }}
            >
              <option value="black">● Black Out</option>
              <option value="blur">◐ Blur</option>
              <option value="pixelate">⬛ Pixelate</option>
            </select>
          </div>

          <div style={styles.controlGroup}>
            <label style={styles.label}>Brush: {brushSize}px</label>
            <input
              type="range"
              min="5"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              style={styles.slider}
            />
          </div>

          <button
            onClick={resetImage}
            style={{...styles.button, ...styles.resetButton}}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }}
          >
            ↺ Reset
          </button>

          <button
            onClick={downloadRedactedImage}
            style={{...styles.button, ...styles.downloadButton}}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
            }}
          >
            ⬇ Download
          </button>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.canvasContainer}>
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={styles.canvas}
          />
          <div style={styles.instructions}>
            Click and drag to redact areas • {redactionHistory.length} redaction{redactionHistory.length !== 1 ? 's' : ''} applied
          </div>
        </div>
      </div>
    </div>
  );
};

// Make the component available globally when the script loads
if (typeof window !== 'undefined') {
  (window as any).RedactorComponent = Redactor;

  if ((window as any).__LOAD_VISUALIZER__) {
    (window as any).__LOAD_VISUALIZER__(Redactor);
  }
}

export default Redactor;