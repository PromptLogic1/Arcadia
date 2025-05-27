import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface GridPositionSelectDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (index: number) => void
  gridSize: number
  takenPositions: number[]
}

export function GridPositionSelectDialog({
  isOpen,
  onClose,
  onSelect,
  gridSize,
  takenPositions,
}: GridPositionSelectDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-cyan-500/20">
        <DialogHeader>
          <DialogTitle>Select Grid Position</DialogTitle>
          <DialogDescription className="text-gray-400">
            Choose where to place the card in the grid. 
            {takenPositions.length > 0 && (
              <span className="text-cyan-400"> Positions with cyan borders are currently occupied.</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div 
          className="grid gap-2 p-4"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            width: 'fit-content',
            margin: '0 auto'
          }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, index) => (
            <Button
              key={index}
              onClick={() => onSelect(index)}
              className={cn(
                "w-12 h-12 p-0 font-mono text-sm",
                "bg-gray-800/50 hover:bg-gray-800/70",
                takenPositions.includes(index)
                  ? "border-2 border-cyan-500/50"
                  : "border border-gray-600/20"
              )}
            >
              {`${Math.floor(index / gridSize) + 1}-${(index % gridSize) + 1}`}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
} 