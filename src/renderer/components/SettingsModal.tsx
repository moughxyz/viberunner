import React from "react"

interface SettingsModalProps {
  isVisible: boolean
  onClose: () => void
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isVisible,
  onClose,
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
          <div className="setting-group"></div>
        </div>
      </div>
    </div>
  )
}

export default SettingsModal
