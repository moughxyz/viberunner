import React from "react"
import { UpdateNotificationRef } from "./UpdateNotification"

interface SettingsModalProps {
  isVisible: boolean
  onClose: () => void
  updateNotificationRef: React.RefObject<UpdateNotificationRef>
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isVisible,
  onClose,
  updateNotificationRef,
}) => {
  if (!isVisible) return null

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h3>Settings</h3>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>
        <div className="settings-content">
          <div className="setting-group">
            <label>Updates</label>
            <p className="setting-description">
              Check for the latest version of Viberunner
            </p>
            <div className="setting-actions">
              <button
                className="btn btn-outline"
                onClick={() =>
                  updateNotificationRef.current?.checkForUpdates()
                }
              >
                Check for Updates
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal