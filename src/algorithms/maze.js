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

function ensureEndpointOpenings(walls, rows, cols, pos) {
  // Maze generators often wall the border. If start/finish is on an edge/corner,
  // it can become isolated. This guarantees a small "gate" into the maze.
  const { row, col } = pos
  const del = (r, c) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return
    walls.delete(key(r, c))
  }

  del(row, col)

  // Open a cell inward from each border the endpoint touches.
  if (row === 0) del(1, col)
  if (row === rows - 1) del(rows - 2, col)
  if (col === 0) del(row, 1)
  if (col === cols - 1) del(row, cols - 2)

  // Corners need an extra diagonal interior cell so the "gate" actually reaches the interior.
  if (row === 0 && col === 0) del(1, 1)
  if (row === 0 && col === cols - 1) del(1, cols - 2)
  if (row === rows - 1 && col === 0) del(rows - 2, 1)
  if (row === rows - 1 && col === cols - 1) del(rows - 2, cols - 2)
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

  // Ensure endpoints aren't isolated when placed on borders/corners.
  ensureEndpointOpenings(walls, rows, cols, start)
  ensureEndpointOpenings(walls, rows, cols, finish)

  return walls
}

/**
 * Recursive Backtracker (DFS) Maze generator.
 *
 * This generates a "perfect maze" by carving passages through an initially-walled grid.
 * We use an odd-cell carving approach:
 * - Consider cells at odd (row, col) as maze cells.
 * - Carve passages by stepping 2 cells at a time and removing the wall between.
 *
 * Output:
 * - Set of "row-col" keys to mark as walls.
 */
export function generateRecursiveBacktrackerMaze({ rows, cols, start, finish, addBorder = true }) {
  const walls = new Set()
  const protectedNodes = new Set([key(start.row, start.col), key(finish.row, finish.col)])

  function inBounds(r, c) {
    return r >= 0 && r < rows && c >= 0 && c < cols
  }

  function isInterior(r, c) {
    return r > 0 && r < rows - 1 && c > 0 && c < cols - 1
  }

  function setWall(r, c) {
    const k = key(r, c)
    if (protectedNodes.has(k)) return
    walls.add(k)
  }

  function clearWall(r, c) {
    walls.delete(key(r, c))
  }

  // Start with everything walled; optionally leave border walled (default).
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (addBorder && (r === 0 || c === 0 || r === rows - 1 || c === cols - 1)) {
        setWall(r, c)
      } else {
        setWall(r, c)
      }
    }
  }

  // Choose a random odd interior cell as a starting point.
  const startRow = randomOdd(1, rows - 2) ?? 1
  const startCol = randomOdd(1, cols - 2) ?? 1

  const visitedCells = new Set()
  function cellKey(r, c) {
    return `${r}-${c}`
  }

  function markVisited(r, c) {
    visitedCells.add(cellKey(r, c))
  }

  function isVisited(r, c) {
    return visitedCells.has(cellKey(r, c))
  }

  // Carve initial cell.
  clearWall(startRow, startCol)
  markVisited(startRow, startCol)

  const stack = [{ r: startRow, c: startCol }]
  const directions = [
    { dr: -2, dc: 0 },
    { dr: 2, dc: 0 },
    { dr: 0, dc: -2 },
    { dr: 0, dc: 2 },
  ]

  while (stack.length) {
    const current = stack[stack.length - 1]
    const { r, c } = current

    const neighbors = []
    for (const { dr, dc } of directions) {
      const nr = r + dr
      const nc = c + dc
      if (!inBounds(nr, nc) || !isInterior(nr, nc)) continue
      if (nr % 2 === 0 || nc % 2 === 0) continue
      if (isVisited(nr, nc)) continue
      neighbors.push({ r: nr, c: nc })
    }

    if (!neighbors.length) {
      stack.pop()
      continue
    }

    const next = neighbors[Math.floor(Math.random() * neighbors.length)]
    const wallR = Math.floor((r + next.r) / 2)
    const wallC = Math.floor((c + next.c) / 2)

    clearWall(wallR, wallC)
    clearWall(next.r, next.c)
    markVisited(next.r, next.c)
    stack.push(next)
  }

  // Ensure endpoints are open.
  clearWall(start.row, start.col)
  clearWall(finish.row, finish.col)

  // Connect endpoints to the nearest carved cell (avoids isolating endpoints when they
  // land on even coordinates).
  const openCells = []
  for (let r = 1; r < rows - 1; r++) {
    for (let c = 1; c < cols - 1; c++) {
      if (!walls.has(key(r, c))) openCells.push({ r, c })
    }
  }

  function nearestOpen(from) {
    let best = null
    let bestDist = Infinity
    for (const cell of openCells) {
      const d = Math.abs(from.row - cell.r) + Math.abs(from.col - cell.c)
      if (d < bestDist) {
        bestDist = d
        best = cell
      }
    }
    return best
  }

  function carveLine(from, to) {
    if (!to) return
    let r = from.row
    let c = from.col

    while (r !== to.r) {
      r += r < to.r ? 1 : -1
      if (inBounds(r, c) && isInterior(r, c)) clearWall(r, c)
    }
    while (c !== to.c) {
      c += c < to.c ? 1 : -1
      if (inBounds(r, c) && isInterior(r, c)) clearWall(r, c)
    }
  }

  carveLine(start, nearestOpen(start))
  carveLine(finish, nearestOpen(finish))

  // Ensure endpoints aren't isolated when placed on borders/corners.
  ensureEndpointOpenings(walls, rows, cols, start)
  ensureEndpointOpenings(walls, rows, cols, finish)

  return walls
}


