export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number // in ms, 0 means no auto-dismiss
  action?: {
    label: string
    onClick: () => void
  }
}

export type ToastListener = (toasts: Toast[]) => void

class ToastService {
  private toasts: Toast[] = []
  private listeners: Set<ToastListener> = new Set()
  private idCounter = 0

  // Add a toast
  show(
    message: string,
    type: Toast['type'] = 'info',
    duration: number = 5000,
    action?: Toast['action']
  ): string {
    const id = `toast-${++this.idCounter}`
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      action
    }

    this.toasts.push(toast)
    this.notifyListeners()

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id)
      }, duration)
    }

    return id
  }

  // Convenience methods
  success(message: string, duration?: number, action?: Toast['action']): string {
    return this.show(message, 'success', duration, action)
  }

  error(message: string, duration?: number, action?: Toast['action']): string {
    return this.show(message, 'error', duration, action)
  }

  warning(message: string, duration?: number, action?: Toast['action']): string {
    return this.show(message, 'warning', duration, action)
  }

  info(message: string, duration?: number, action?: Toast['action']): string {
    return this.show(message, 'info', duration, action)
  }

  // Dismiss a specific toast
  dismiss(id: string): void {
    const index = this.toasts.findIndex(toast => toast.id === id)
    if (index !== -1) {
      this.toasts.splice(index, 1)
      this.notifyListeners()
    }
  }

  // Clear all toasts
  clear(): void {
    this.toasts = []
    this.notifyListeners()
  }

  // Subscribe to toast updates
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener)

    // Send current state immediately
    listener(this.toasts)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.toasts]))
  }

  // Get current toasts (for debugging)
  getToasts(): Toast[] {
    return [...this.toasts]
  }
}

// Create singleton instance
export const toastService = new ToastService()

// Make it globally available
;(window as any).toastService = toastService