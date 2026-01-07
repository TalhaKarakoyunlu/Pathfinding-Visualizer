function manhattan(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
}

/**
 * A* pathfinding for an unweighted grid (each move cost = 1).
 * Returns visited nodes in the order they were expanded (for animation).
 *
 * Notes:
 * - Uses Manhattan distance heuristic (no diagonals).
 * - Mutates nodes: `distance` (gScore), `fScore`, `isVisited`, `previousNode`.
 */
export function astar(grid, startNode, finishNode) {
  const visitedNodesInOrder = []

  startNode.distance = 0
  startNode.fScore = manhattan(startNode, finishNode)

  const openSet = [startNode]

  while (openSet.length) {
    openSet.sort((a, b) => (a.fScore ?? Infinity) - (b.fScore ?? Infinity))
    const current = openSet.shift()
    if (!current) break

    if (current.isWall) continue
    if (current.isVisited) continue

    current.isVisited = true
    visitedNodesInOrder.push(current)

    if (current === finishNode) return visitedNodesInOrder

    for (const neighbor of getNeighbors(current, grid)) {
      if (neighbor.isWall || neighbor.isVisited) continue

      const tentativeG = current.distance + 1
      if (tentativeG < neighbor.distance) {
        neighbor.distance = tentativeG
        neighbor.previousNode = current
        neighbor.fScore = tentativeG + manhattan(neighbor, finishNode)

        if (!openSet.includes(neighbor)) openSet.push(neighbor)
      }
    }
  }

  return visitedNodesInOrder
}

function getNeighbors(node, grid) {
  const neighbors = []
  const { col, row } = node

  if (row > 0) neighbors.push(grid[row - 1][col])
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col])
  if (col > 0) neighbors.push(grid[row][col - 1])
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1])

  return neighbors
}


