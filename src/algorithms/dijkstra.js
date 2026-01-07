/**
 * Dijkstra's algorithm (unweighted grid => each edge weight = 1).
 * Returns the nodes in the order they were visited (for animation).
 *
 * Inputs:
 * - grid: 2D array of node objects
 * - startNode: node object
 * - finishNode: node object
 *
 * Output:
 * - visitedNodesInOrder: node[]
 */
export function dijkstra(grid, startNode, finishNode) {
  const visitedNodesInOrder = []

  startNode.distance = 0
  const unvisitedNodes = getAllNodes(grid)

  while (unvisitedNodes.length) {
    unvisitedNodes.sort((a, b) => a.distance - b.distance)
    const closestNode = unvisitedNodes.shift()

    if (!closestNode) break
    if (closestNode.isWall) continue

    // If the closest node is still at Infinity, we are trapped.
    if (closestNode.distance === Infinity) return visitedNodesInOrder

    closestNode.isVisited = true
    visitedNodesInOrder.push(closestNode)

    if (closestNode === finishNode) return visitedNodesInOrder
    updateUnvisitedNeighbors(closestNode, grid)
  }

  return visitedNodesInOrder
}

/**
 * Backtracks from finish node using `.previousNode`.
 * Output includes both start and finish if reachable.
 */
export function getNodesInShortestPathOrder(finishNode) {
  const nodesInShortestPathOrder = []
  let currentNode = finishNode
  while (currentNode) {
    nodesInShortestPathOrder.unshift(currentNode)
    currentNode = currentNode.previousNode
  }
  return nodesInShortestPathOrder
}

function updateUnvisitedNeighbors(node, grid) {
  const unvisitedNeighbors = getUnvisitedNeighbors(node, grid)
  for (const neighbor of unvisitedNeighbors) {
    const candidateDistance = node.distance + 1
    // Only relax if we found a strictly shorter path.
    if (candidateDistance < neighbor.distance) {
      neighbor.distance = candidateDistance
      neighbor.previousNode = node
    }
  }
}

function getUnvisitedNeighbors(node, grid) {
  const neighbors = []
  const { col, row } = node

  if (row > 0) neighbors.push(grid[row - 1][col])
  if (row < grid.length - 1) neighbors.push(grid[row + 1][col])
  if (col > 0) neighbors.push(grid[row][col - 1])
  if (col < grid[0].length - 1) neighbors.push(grid[row][col + 1])

  return neighbors.filter((neighbor) => !neighbor.isVisited)
}

function getAllNodes(grid) {
  const nodes = []
  for (const row of grid) {
    for (const node of row) {
      nodes.push(node)
    }
  }
  return nodes
}


