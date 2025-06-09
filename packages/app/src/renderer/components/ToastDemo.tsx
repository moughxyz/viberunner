import React from 'react'
import { toastService } from '../services/ToastService'
import './ToastDemo.css'

const ToastDemo: React.FC = () => {
  const showSuccessToast = () => {
    toastService.success('Operation completed successfully!')
  }

  const showErrorToast = () => {
    toastService.error('Something went wrong. Please try again.')
  }

  const showWarningToast = () => {
    toastService.warning('This action cannot be undone.')
  }

  const showInfoToast = () => {
    toastService.info('New feature available in settings.')
  }

  const showToastWithAction = () => {
    toastService.success('File saved successfully!', 10000, {
      label: 'View File',
      onClick: () => {
        toastService.info('Opening file...')
      }
    })
  }

  const showPersistentToast = () => {
    toastService.info('This toast will stay until dismissed', 0)
  }

  const showMultipleToasts = () => {
    toastService.success('First toast')
    setTimeout(() => toastService.warning('Second toast'), 500)
    setTimeout(() => toastService.error('Third toast'), 1000)
    setTimeout(() => toastService.info('Fourth toast'), 1500)
  }

  const clearAllToasts = () => {
    toastService.clear()
  }

  return (
    <div className="toast-demo">
      <h3>Toast Demo</h3>
      <div className="toast-demo__buttons">
        <button onClick={showSuccessToast} className="toast-demo__button toast-demo__button--success">
          Success Toast
        </button>
        <button onClick={showErrorToast} className="toast-demo__button toast-demo__button--error">
          Error Toast
        </button>
        <button onClick={showWarningToast} className="toast-demo__button toast-demo__button--warning">
          Warning Toast
        </button>
        <button onClick={showInfoToast} className="toast-demo__button toast-demo__button--info">
          Info Toast
        </button>
        <button onClick={showToastWithAction} className="toast-demo__button">
          Toast with Action
        </button>
        <button onClick={showPersistentToast} className="toast-demo__button">
          Persistent Toast
        </button>
        <button onClick={showMultipleToasts} className="toast-demo__button">
          Multiple Toasts
        </button>
        <button onClick={clearAllToasts} className="toast-demo__button toast-demo__button--clear">
          Clear All
        </button>
      </div>
    </div>
  )
}

export default ToastDemo