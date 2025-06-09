import React, { useEffect, useState } from 'react'
import { Toast as ToastType } from '../services/ToastService'
import './Toast.css'

interface ToastProps {
  toast: ToastType
  onDismiss: (id: string) => void
  index: number
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss, index }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsLeaving(true)
    // Wait for exit animation before actually dismissing
    setTimeout(() => {
      onDismiss(toast.id)
    }, 300)
  }

  const handleAction = () => {
    if (toast.action) {
      toast.action.onClick()
      handleDismiss()
    }
  }

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return '✓'
      case 'error':
        return '✕'
      case 'warning':
        return '⚠'
      case 'info':
      default:
        return 'ℹ'
    }
  }

  return (
    <div
      className={`toast toast--${toast.type} ${
        isVisible && !isLeaving ? 'toast--visible' : ''
      } ${isLeaving ? 'toast--leaving' : ''}`}
      style={{
        '--toast-index': index
      } as React.CSSProperties}
    >
      <div className="toast__icon">
        {getIcon()}
      </div>

      <div className="toast__content">
        <div className="toast__message">
          {toast.message}
        </div>

        {toast.action && (
          <button
            className="toast__action"
            onClick={handleAction}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        className="toast__close"
        onClick={handleDismiss}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

export default Toast