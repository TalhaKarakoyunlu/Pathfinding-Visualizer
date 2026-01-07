/**
 * Depth-first search on a grid.
 *
 * DFS is NOT guaranteed to find the shortest path.
 * It is still useful for comparison with BFS/Dijkstra/A*.
 *
 * Output:
 * - visitedNodesInOrder: node[]
 */
export function dfs(grid, startNode, finishNode) {
  const visitedNodesInOrder = []
  const stack = [startNode]

  startNode.isVisited = true
  startNode.distance = 0

  while (stack.length) {
    const node = stack.pop()
    if (!node) break
    if (node.isWall) continue

    visitedNodesInOrder.push(node)
    if (node === finishNode) return visitedNodesInOrder

    // Push neighbors in reverse order to get a consistent traversal preference.
    const neighbors = getUnvisitedNeighbors(node, grid)
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i]
      if (neighbor.isWall) continue
      neighbor.isVisited = true
      neighbor.distance = node.distance + 1
      neighbor.previousNode = node
      stack.push(neighbor)
    }
  }

  return visitedNodesInOrder
}

function getUnvisitedNeighbors(node, grid) {
  const neighbors = []
  const { col, row } = node

  // Order: Up, Right, Down, Left
  if (row > 0) neighbors.push(grid[row - 1][col])
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1])
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col])
  if (col > 0) neighbors.push(grid[row][col - 1])

  return neighbors.filter((n) => !n.isVisited)
}


