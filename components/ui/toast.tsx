'use client'

import { useToast } from './use-toast'
import { Toast as ToastPrimitive } from './toast-primitive'

export interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export const ToastComponent = () => {
  const { toast, hideToast } = useToast()

  if (!toast) return null

  return (
    <ToastPrimitive
      title={toast.title}
      description={toast.description}
      variant={toast.variant}
      onClose={hideToast}
    />
  )
}

export const toast = (props: ToastProps) => {
  const store = useToast.getState()
  store.showToast(props)
} 