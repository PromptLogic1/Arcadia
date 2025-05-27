export const gridPositionToIndex = (row: number, col: number, gridSize: number): number => {
  return (row - 1) * gridSize + (col - 1)
}

export const indexToGridPosition = (index: number, gridSize: number): { row: number; col: number } => {
  const row = Math.floor(index / gridSize) + 1
  const col = (index % gridSize) + 1
  return { row, col }
}

export const generateGridPositions = (gridSize: number): string[] => {
  const positions: string[] = []
  for (let row = 1; row <= gridSize; row++) {
    for (let col = 1; col <= gridSize; col++) {
      positions.push(`${row}-${col}`)
    }
  }
  return positions
} 