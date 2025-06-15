'use client';

import { createWithEqualityFn } from 'zustand/traditional';

interface ToastState {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastStore {
  toast: ToastState | null;
  showToast: (toast: ToastState) => void;
  hideToast: () => void;
}

export const useToast = createWithEqualityFn<ToastStore>(set => ({
  toast: null,
  showToast: toast => set({ toast }),
  hideToast: () => set({ toast: null }),
}));
