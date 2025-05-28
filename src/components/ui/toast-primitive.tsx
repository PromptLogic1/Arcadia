'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  onClose?: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  title,
  description,
  variant = 'default',
  onClose,
}) => {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'flex items-start gap-4 rounded-lg p-4',
        'bg-gray-800/95 backdrop-blur-sm',
        'border transition-all duration-200',
        variant === 'destructive'
          ? 'border-red-500/30 text-red-400'
          : 'border-cyan-500/30 text-cyan-400'
      )}
    >
      <div className="flex flex-col gap-1">
        {title && <h3 className="font-semibold">{title}</h3>}
        {description && <p className="text-sm opacity-90">{description}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={cn(
            'ml-auto p-1 opacity-70 transition-opacity hover:opacity-100',
            'rounded-md hover:bg-gray-700/50'
          )}
        >
          ✕
        </button>
      )}
    </div>
  );
};
