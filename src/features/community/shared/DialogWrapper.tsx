'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ReactNode } from 'react';

interface DialogWrapperProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const DialogWrapper: React.FC<DialogWrapperProps> = ({
  children,
  isOpen,
  onClose,
  className = 'bg-gray-800/95 text-white',
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent
      className={` ${className} border border-cyan-500/20 font-medium tracking-normal antialiased shadow-lg shadow-cyan-500/10 backdrop-blur-none [&_h3]:text-white [&_input]:text-white [&_label]:text-white/90 [&_p]:text-white/90 [&_select]:text-white [&_span]:text-white/90 [&_textarea]:text-white`}
      style={{
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility',
      }}
    >
      {children}
    </DialogContent>
  </Dialog>
);
