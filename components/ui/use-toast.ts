'use client'

import { create } from 'zustand'

interface ToastState {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastStore {
  toast: ToastState | null
  showToast: (toast: ToastState) => void
  hideToast: () => void
}

export const useToast = create<ToastStore>((set) => ({
  toast: null,
  showToast: (toast) => set({ toast }),
  hideToast: () => set({ toast: null })
})) 