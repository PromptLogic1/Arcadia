'use client'

import { Dialog, DialogContent } from "@/components/ui/dialog"
import type { ReactNode } from "react"

interface DialogWrapperProps {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  className?: string
}

export const DialogWrapper: React.FC<DialogWrapperProps> = ({
  children,
  isOpen,
  onClose,
  className = "bg-gray-800/95 text-white"
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent 
      className={`
        ${className} 
        backdrop-blur-none 
        border 
        border-cyan-500/20 
        shadow-lg 
        shadow-cyan-500/10
        antialiased
        font-medium
        tracking-normal
        [&_p]:text-white/90
        [&_span]:text-white/90
        [&_h3]:text-white
        [&_label]:text-white/90
        [&_input]:text-white
        [&_textarea]:text-white
        [&_select]:text-white
      `}
      style={{ 
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility'
      }}
    >
      {children}
    </DialogContent>
  </Dialog>
) 