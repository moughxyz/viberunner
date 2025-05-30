import React, { useEffect, useRef } from 'react';
import { ipcRenderer } from 'electron';

interface VisualizerLoaderProps {
  visualizerId: string;
  fileData: {
    path: string;
    mimetype: string;
    content: string;
  };
}

const VisualizerLoader: React.FC<VisualizerLoaderProps> = ({ visualizerId, fileData }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadVisualizer = async () => {
      try {
        // Load the visualizer's main component
        const visualizer = await ipcRenderer.invoke('load-visualizer', visualizerId);

        // Create a new script element to load the visualizer's bundle
        const script = document.createElement('script');
        script.src = `file://${visualizer.path}/dist/bundle.js`;
        script.type = 'module';

        // Set up the visualizer's props
        const props = {
          fileData,
          container: containerRef.current
        };

        // When the script loads, it will call this function
        (window as any).__LOAD_VISUALIZER__ = (VisualizerComponent: any) => {
          if (containerRef.current) {
            const root = document.createElement('div');
            containerRef.current.appendChild(root);

            // Render the visualizer component
            const ReactDOM = require('react-dom');
            ReactDOM.render(
              <VisualizerComponent {...props} />,
              root
            );
          }
        };

        // Add the script to the document
        document.head.appendChild(script);

        return () => {
          // Cleanup
          document.head.removeChild(script);
          delete (window as any).__LOAD_VISUALIZER__;
        };
      } catch (error) {
        console.error('Failed to load visualizer:', error);
      }
    };

    loadVisualizer();
  }, [visualizerId, fileData]);

  return <div ref={containerRef} className="visualizer-root" />;
};

export default VisualizerLoader;