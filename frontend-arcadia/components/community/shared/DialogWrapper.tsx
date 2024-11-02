import { Dialog, DialogContent } from "@/components/ui/dialog"
import { ReactNode } from "react"

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
  className = "bg-gray-800 text-cyan-100"
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className={className}>
      {children}
    </DialogContent>
  </Dialog>
) 