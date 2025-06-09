import React, { useEffect, useState } from 'react'
import { Toast as ToastType, toastService } from '../services/ToastService'
import Toast from './Toast'
import './ToastContainer.css'

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastType[]>([])

  useEffect(() => {
    // Subscribe to toast updates
    const unsubscribe = toastService.subscribe((updatedToasts) => {
      setToasts(updatedToasts)
    })

    return unsubscribe
  }, [])

  const handleDismiss = (id: string) => {
    toastService.dismiss(id)
  }

  if (toasts.length === 0) {
    return null
  }

  return (
    <div className="toast-container">
      {toasts.map((toast, index) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={handleDismiss}
          index={index}
        />
      ))}
    </div>
  )
}

export default ToastContainer