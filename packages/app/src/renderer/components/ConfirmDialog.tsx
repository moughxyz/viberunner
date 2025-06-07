import React from "react"
import "./ConfirmDialog.css"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  message: string
  warningMessage?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  warningMessage,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  variant = 'info'
}) => {
  if (!isOpen) return null

  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog-header">
          <h3 className="confirm-dialog-title">{title}</h3>
        </div>

        <div className="confirm-dialog-content">
          <p className="confirm-dialog-message">{message}</p>
          {warningMessage && (
            <p className={`confirm-dialog-warning ${variant}`}>{warningMessage}</p>
          )}
        </div>

        <div className="confirm-dialog-actions">
          <button
            className={`confirm-dialog-btn confirm-btn ${variant}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button
            className="confirm-dialog-btn cancel-btn"
            onClick={onCancel}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog