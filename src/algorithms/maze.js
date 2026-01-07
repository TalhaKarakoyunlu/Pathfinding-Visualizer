function key(row, col) {
  return `${row}-${col}`
}

function randomEven(min, max) {
  // Returns an even integer in [min, max], or null if none exists.
  const start = min % 2 === 0 ? min : min + 1
  if (start > max) return null
  const count = Math.floor((max - start) / 2) + 1
  return start + 2 * Math.floor(Math.random() * count)
}

function randomOdd(min, max) {
  // Returns an odd integer in [min, max], or null if none exists.
  const start = min % 2 === 1 ? min : min + 1
  if (start > max) return null
  const count = Math.floor((max - start) / 2) + 1
  return start + 2 * Math.floor(Math.random() * count)
}

function chooseOrientation(width, height) {
  if (width < height) return 'horizontal'
  if (height < width) return 'vertical'
  return Math.random() < 0.5 ? 'horizontal' : 'vertical'
}

/**
 * Recursive Division Maze generator.
 *
 * This produces a maze-like set of walls by repeatedly dividing a region with a
 * straight wall and leaving one opening (a "passage") through that wall.
 *
 * Output:
 * - Set of "row-col" keys to mark as walls.
 */
export function generateRecursiveDivisionMaze({
  rows,
  cols,
  start,
  finish,
  addBorder = true,
}) {
  const walls = new Set()
  const protectedNodes = new Set([key(start.row, start.col), key(finish.row, finish.col)])

  function addWall(row, col) {
    const k = key(row, col)
    if (protectedNodes.has(k)) return
    walls.add(k)
  }

  // Optional border walls (classic look). Start/finish are protected anyway.
  if (addBorder) {
    for (let r = 0; r < rows; r++) {
      addWall(r, 0)
      addWall(r, cols - 1)
    }
    for (let c = 0; c < cols; c++) {
      addWall(0, c)
      addWall(rows - 1, c)
    }
  }

  function divide(minRow, maxRow, minCol, maxCol, orientation) {
    const width = maxCol - minCol + 1
    const height = maxRow - minRow + 1

    // If the region is too small to divide, stop.
    if (width < 3 || height < 3) return

    const nextOrientation = chooseOrientation(width, height)

    if (orientation === 'horizontal') {
      // Wall row must be between minRow+1 and maxRow-1.
      const wallRow = randomEven(minRow + 1, maxRow - 1) ?? Math.floor((minRow + maxRow) / 2)
      const passageCol = randomOdd(minCol, maxCol) ?? Math.floor((minCol + maxCol) / 2)

      for (let c = minCol; c <= maxCol; c++) {
        if (c === passageCol) continue
        addWall(wallRow, c)
      }

      divide(minRow, wallRow - 1, minCol, maxCol, nextOrientation)
      divide(wallRow + 1, maxRow, minCol, maxCol, nextOrientation)
      return
    }

    // vertical
    const wallCol = randomEven(minCol + 1, maxCol - 1) ?? Math.floor((minCol + maxCol) / 2)
    const passageRow = randomOdd(minRow, maxRow) ?? Math.floor((minRow + maxRow) / 2)

    for (let r = minRow; r <= maxRow; r++) {
      if (r === passageRow) continue
      addWall(r, wallCol)
    }

    divide(minRow, maxRow, minCol, wallCol - 1, nextOrientation)
    divide(minRow, maxRow, wallCol + 1, maxCol, nextOrientation)
  }

  // Divide the interior region (excluding border).
  divide(1, rows - 2, 1, cols - 2, chooseOrientation(cols, rows))

  return walls
}


