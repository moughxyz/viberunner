import React, { useEffect, useRef } from 'react';

interface ImageInverterProps {
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
  };
}

const ImageInverter: React.FC<ImageInverterProps> = ({ fileInput, fileData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const invertImage = async () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let imageDataUrl: string;

      // Use new API if available, fallback to legacy
      if (fileInput) {
        // New API: Read image file directly using Node.js
        try {
          const imageBuffer = (window as any).api.fs.readFileSync(fileInput.path);
          const base64Data = imageBuffer.toString('base64');
          imageDataUrl = `data:${fileInput.mimetype};base64,${base64Data}`;
        } catch (error) {
          console.error('Failed to read image file:', error);
          return;
        }
      } else if (fileData) {
        // Legacy API: Use pre-provided content
        imageDataUrl = `data:${fileData.mimetype};base64,${fileData.content}`;
      } else {
        console.error('No file input provided');
        return;
      }

      // Create an image element
      const img = new Image();
      img.src = imageDataUrl;

      // Wait for the image to load
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Invert colors
      for (let i = 0; i < data.length; i += 4) {
        data[i] = 255 - data[i];     // red
        data[i + 1] = 255 - data[i + 1]; // green
        data[i + 2] = 255 - data[i + 2]; // blue
        // alpha channel (i + 3) remains unchanged
      }

      // Put the inverted image data back
      ctx.putImageData(imageData, 0, 0);
    };

    invertImage();
  }, [fileInput, fileData]);

  // Get file info for display
  const filePath = fileInput?.path || fileData?.path || '';
  const fileName = filePath ? (window as any).api?.path?.basename(filePath) || filePath.split('/').pop() : 'Unknown';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      backgroundColor: '#f0f0f0',
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      gap: '10px'
    }}>
      <div style={{
        fontSize: '14px',
        color: '#666',
        fontWeight: '500'
      }}>
        Inverted: {fileName}
      </div>
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          maxHeight: '80vh',
          objectFit: 'contain',
          border: '1px solid #ddd',
          borderRadius: '4px'
        }}
      />
    </div>
  );
};

// Make the component available globally when the script loads
if (typeof window !== 'undefined') {
  (window as any).ImageInverterComponent = ImageInverter;

  // Support both new and legacy loader patterns
  if ((window as any).__LOAD_APP__) {
    (window as any).__LOAD_APP__(ImageInverter);
  }
  if ((window as any).__LOAD_APP__) {
    (window as any).__LOAD_APP__(ImageInverter);
  }
}

export default ImageInverter;