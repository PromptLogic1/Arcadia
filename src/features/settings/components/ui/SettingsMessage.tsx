import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MessageType } from '../constants';

interface SettingsMessageProps {
  message: {
    text: string;
    type: MessageType;
  };
  className?: string;
}

export function SettingsMessage({ message, className }: SettingsMessageProps) {
  const getMessageStyles = (type: MessageType) => {
    switch (type) {
      case 'success':
        return {
          container: 'border-green-500/20 bg-green-500/10',
          icon: 'text-green-400',
          text: 'text-green-400',
        };
      case 'error':
        return {
          container: 'border-red-500/20 bg-red-500/10',
          icon: 'text-red-400',
          text: 'text-red-400',
        };
      case 'info':
        return {
          container: 'border-blue-500/20 bg-blue-500/10',
          icon: 'text-blue-400',
          text: 'text-blue-400',
        };
      default:
        return {
          container: 'border-gray-500/20 bg-gray-500/10',
          icon: 'text-gray-400',
          text: 'text-gray-400',
        };
    }
  };

  const styles = getMessageStyles(message.type);

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg p-4',
        styles.container,
        className
      )}
    >
      <Info className={cn('mt-0.5 h-5 w-5 flex-shrink-0', styles.icon)} />
      <p className={cn('text-sm', styles.text)}>{message.text}</p>
    </div>
  );
}
