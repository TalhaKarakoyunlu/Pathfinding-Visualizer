/**
 * Breadth-first search for an unweighted grid.
 * Returns visited nodes in the order they were visited (for animation).
 *
 * Inputs:
 * - grid: 2D array of node objects
 * - startNode: node object
 * - finishNode: node object
 *
 * Output:
 * - visitedNodesInOrder: node[]
 */
export function bfs(grid, startNode, finishNode) {
  const visitedNodesInOrder = []
  const queue = []

  startNode.isVisited = true
  startNode.distance = 0
  queue.push(startNode)

  while (queue.length) {
    const node = queue.shift()
    if (!node) break
    if (node.isWall) continue

    visitedNodesInOrder.push(node)
    if (node === finishNode) return visitedNodesInOrder

    for (const neighbor of getUnvisitedNeighbors(node, grid)) {
      if (neighbor.isWall) continue
      neighbor.isVisited = true
      neighbor.distance = node.distance + 1
      neighbor.previousNode = node
      queue.push(neighbor)
    }
  }

  return visitedNodesInOrder
}

function getUnvisitedNeighbors(node, grid) {
  const neighbors = []
  const { col, row } = node

  if (row > 0) neighbors.push(grid[row - 1][col])
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col])
  if (col > 0) neighbors.push(grid[row][col - 1])
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1])

  return neighbors.filter((n) => !n.isVisited)
}


