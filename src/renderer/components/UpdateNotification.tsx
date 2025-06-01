import React, { useState, useEffect } from 'react';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface UpdateNotificationProps {
  onClose?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ onClose }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [currentVersion, setCurrentVersion] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get current version
    const getCurrentVersion = async () => {
      try {
        const result = await window.api.getAppVersion();
        if (result.success) {
          setCurrentVersion(result.version);
        }
      } catch (error) {
        console.error('Error getting app version:', error);
      }
    };

    getCurrentVersion();

    // Auto-check for updates on component mount
    checkForUpdates();
  }, []);

  const checkForUpdates = async () => {
    setChecking(true);
    setError(null);

    try {
      const result = await window.api.checkForUpdates();

      if (result.success && result.updateInfo) {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: result.updateInfo.version || 'Unknown',
          releaseDate: result.updateInfo.releaseDate,
          releaseNotes: result.updateInfo.releaseNotes
        });
        setShowModal(true);
      } else {
        setUpdateAvailable(false);
        setUpdateInfo(null);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setError(error instanceof Error ? error.message : 'Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const downloadUpdate = async () => {
    setDownloading(true);
    setError(null);

    try {
      const result = await window.api.downloadUpdate();

      if (!result.success) {
        throw new Error(result.error || 'Failed to download update');
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      setError(error instanceof Error ? error.message : 'Failed to download update');
    } finally {
      setDownloading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    if (onClose) {
      onClose();
    }
  };

  if (!showModal && !updateAvailable) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={checkForUpdates}
          disabled={checking}
          style={{
            background: checking ? '#666' : '#007acc',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: checking ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {checking ? 'Checking...' : 'Check for Updates'}
        </button>
      </div>
    );
  }

  if (!showModal) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000
    }}>
      <div style={{
        background: '#1e1e1e',
        color: 'white',
        padding: '24px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        border: '1px solid #333'
      }}>
        <h2 style={{
          margin: '0 0 16px 0',
          color: '#4CAF50',
          fontSize: '18px'
        }}>
          🎉 Update Available!
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <p style={{ margin: '4px 0' }}>
            <strong>Current Version:</strong> {currentVersion}
          </p>
          {updateInfo && (
            <p style={{ margin: '4px 0' }}>
              <strong>New Version:</strong> {updateInfo.version}
            </p>
          )}
        </div>

        {updateInfo?.releaseNotes && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: '#2a2a2a',
            borderRadius: '4px',
            border: '1px solid #444'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>Release Notes:</h4>
            <p style={{
              margin: 0,
              fontSize: '12px',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap'
            }}>
              {updateInfo.releaseNotes}
            </p>
          </div>
        )}

        {error && (
          <div style={{
            background: '#ff4444',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            marginBottom: '16px',
            fontSize: '12px'
          }}>
            Error: {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={closeModal}
            style={{
              background: 'transparent',
              color: '#ccc',
              border: '1px solid #666',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Later
          </button>

          {!downloading ? (
            <button
              onClick={downloadUpdate}
              style={{
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Download Update
            </button>
          ) : (
            <button
              disabled
              style={{
                background: '#666',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'not-allowed',
                fontSize: '12px'
              }}
            >
              Downloading...
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;