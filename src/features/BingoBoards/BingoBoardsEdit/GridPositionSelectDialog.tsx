import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { generateGridPositions, gridPositionToIndex } from "../utils/gridHelpers"
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
  const positions = generateGridPositions(gridSize)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-gray-900 text-gray-100">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-cyan-400">
            Select Grid Position
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-2" style={{ 
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))` 
        }}>
          {positions.map((pos) => {
            const [rowStr, colStr] = pos.split('-')
            const row = Number(rowStr)
            const col = Number(colStr)
            
            if (isNaN(row) || isNaN(col)) return null
            
            const index = gridPositionToIndex(row, col, gridSize)
            const isTaken = takenPositions.includes(index)

            return (
              <Button
                key={pos}
                onClick={() => onSelect(index)}
                disabled={isTaken}
                className={cn(
                  "aspect-square p-0 text-sm break-words",
                  isTaken ? "bg-gray-700" : "bg-cyan-500/20 hover:bg-cyan-500/40"
                )}
              >
                {pos}
              </Button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
} 