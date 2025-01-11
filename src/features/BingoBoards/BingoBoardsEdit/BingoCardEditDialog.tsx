import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Info } from "lucide-react"
import { useState } from "react"
import type { BingoCard } from "@/src/store/types/bingocard.types"

interface BingoCardEditDialogProps {
  card: BingoCard
  index: number
  isOpen: boolean
  onClose: () => void
  onSave: (index: number, content: string) => void
}

export function BingoCardEditDialog({ 
  card, 
  index,
  isOpen, 
  onClose,
  onSave 
}: BingoCardEditDialogProps) {
  const [content, setContent] = useState(card.card_content)
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async () => {
    try {
      setIsSaving(true)
      await onSave(index, content)
      onClose()
    } catch (error) {
      console.error('Failed to submit card:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 text-gray-100">
        <DialogHeader>
          <DialogTitle>
            {card.id === "" ? "Create New Card" : "Edit Card"}
          </DialogTitle>
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-2 mt-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-400">
              Changes or Creation will be handled when you click &ldquo;Save Changes&rdquo; on the board editor.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter card content..."
            className="min-h-[200px] bg-gray-800/50 border-cyan-500/20"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
          >
            {isSaving ? 'Submitting...' : 'Submit'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 