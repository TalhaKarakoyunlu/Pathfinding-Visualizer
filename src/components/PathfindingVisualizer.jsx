import { useEffect, useMemo, useRef, useState } from 'react'
import Node from './Node.jsx'
import './PathfindingVisualizer.css'
import { dijkstra, getNodesInShortestPathOrder } from '../algorithms/dijkstra.js'
import { bfs } from '../algorithms/bfs.js'
import { astar } from '../algorithms/astar.js'
import { greedyBestFirst } from '../algorithms/greedyBestFirst.js'
import { dfs } from '../algorithms/dfs.js'
import {
  generateRecursiveBacktrackerMaze,
  generateRecursiveDivisionMaze,
  generateRandomizedPrimsMaze,
} from '../algorithms/maze.js'

const DEFAULT_ROWS = 20
const DEFAULT_COLS = 50
const CELL_SIZE_PX = 22

const MIN_ROWS = 5
const MAX_ROWS = 60
const MIN_COLS = 10
const MAX_COLS = 120

const HISTORY_STORAGE_KEY = 'pfv_history_v1'
const MAX_HISTORY_ENTRIES = 12

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

function formatMs(ms) {
  if (!Number.isFinite(ms)) return '-'
  if (ms < 10) return `${ms.toFixed(2)}ms`
  if (ms < 100) return `${ms.toFixed(1)}ms`
  return `${Math.round(ms)}ms`
}

function getDefaultEndpoints(rows, cols) {
  const row = clamp(Math.floor(rows / 2), 0, rows - 1)
  const startCol = clamp(5, 0, cols - 1)
  const finishCol = clamp(cols - 6, 0, cols - 1)

  // If the grid is tiny, ensure start and finish don't overlap.
  const start = { row, col: startCol }
  const finish =
    finishCol === startCol ? { row, col: clamp(cols - 1, 0, cols - 1) } : { row, col: finishCol }

  return { start, finish }
}

function clampPos(pos, rows, cols) {
  return {
    row: clamp(pos.row, 0, rows - 1),
    col: clamp(pos.col, 0, cols - 1),
  }
}

function wallKey(row, col) {
  return `${row}-${col}`
}

function createNode(col, row, start, finish) {
  return {
    col,
    row,
    isStart: row === start.row && col === start.col,
    isFinish: row === finish.row && col === finish.col,
    distance: Infinity,
    isVisited: false,
    isWall: false,
    previousNode: null,
  }
}

function buildInitialGrid(rows, cols, start, finish) {
  const grid = []
  for (let row = 0; row < rows; row++) {
    const currentRow = []
    for (let col = 0; col < cols; col++) {
      currentRow.push(createNode(col, row, start, finish))
    }
    grid.push(currentRow)
  }
  return grid
}

function cloneGridForAlgorithm(grid) {
  // Algorithm mutates nodes (distance/isVisited/previousNode), so clone.
  return grid.map((row) =>
    row.map((node) => ({
      ...node,
      distance: Infinity,
      fScore: Infinity,
      isVisited: false,
      previousNode: null,
    })),
  )
}

function baseNodeClass(isStart, isFinish, isWall) {
  if (isStart) return 'node node-start'
  if (isFinish) return 'node node-finish'
  if (isWall) return 'node node-wall'
  return 'node'
}

export default function PathfindingVisualizer() {
  const [numRows, setNumRows] = useState(DEFAULT_ROWS)
  const [numCols, setNumCols] = useState(DEFAULT_COLS)

  const initialEndpoints = useMemo(() => getDefaultEndpoints(DEFAULT_ROWS, DEFAULT_COLS), [])
  const [startPos, setStartPos] = useState(initialEndpoints.start)
  const [finishPos, setFinishPos] = useState(initialEndpoints.finish)
  const [grid, setGrid] = useState(() =>
    buildInitialGrid(DEFAULT_ROWS, DEFAULT_COLS, initialEndpoints.start, initialEndpoints.finish),
  )

  const [rowsInput, setRowsInput] = useState(String(DEFAULT_ROWS))
  const [colsInput, setColsInput] = useState(String(DEFAULT_COLS))

  const [mouseIsPressed, setMouseIsPressed] = useState(false)
  const [dragMode, setDragMode] = useState(null) // 'wall' | 'start' | 'finish' | null
  const [isAnimating, setIsAnimating] = useState(false)
  const [isBenchmarking, setIsBenchmarking] = useState(false)
  const [status, setStatus] = useState('Ready')
  const [hasVisualization, setHasVisualization] = useState(false)
  const [algorithm, setAlgorithm] = useState('astar') // 'astar' | 'dijkstra' | 'bfs' | 'greedy' | 'dfs'
  const [mazeType, setMazeType] = useState('backtracker') // 'backtracker' | 'division' | 'prims'
  const [visitDelayMs, setVisitDelayMs] = useState(10)
  const [lastRun, setLastRun] = useState(null)
  const [runHistory, setRunHistory] = useState([])

  const wallPaintValueRef = useRef(true)
  const timeoutsRef = useRef([])

  const controlsDisabled = isAnimating || isBenchmarking

  function scheduleTimeout(fn, delayMs) {
    const id = setTimeout(fn, delayMs)
    timeoutsRef.current.push(id)
  }

  function clearAllTimeouts() {
    for (const id of timeoutsRef.current) clearTimeout(id)
    timeoutsRef.current = []
  }

  useEffect(() => {
    return () => clearAllTimeouts()
  }, [])

  useEffect(() => {
    // Load persisted history (best-effort).
    try {
      const raw = localStorage.getItem(HISTORY_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) setRunHistory(parsed.slice(0, MAX_HISTORY_ENTRIES))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    // Persist history (best-effort).
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(runHistory.slice(0, MAX_HISTORY_ENTRIES)))
    } catch {
      // ignore
    }
  }, [runHistory])

  useEffect(() => {
    // If the user releases the mouse outside the grid/window, we still want to end the drag.
    const endDrag = () => {
      setMouseIsPressed(false)
      setDragMode(null)
    }
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('blur', endDrag)
    return () => {
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('blur', endDrag)
    }
  }, [])

  function clearVisualizationOnly() {
    clearAllTimeouts()
    // IMPORTANT:
    // We mutate node classNames directly for animation performance. React will NOT
    // necessarily restore classNames on re-render if the props are "unchanged"
    // (because React diffs against its last render, not the live DOM).
    // So clearing the visualization must always actively reset node classes.
    for (const row of grid) {
      for (const node of row) {
        const el = document.getElementById(`node-${node.row}-${node.col}`)
        if (!el) continue
        el.className = baseNodeClass(node.isStart, node.isFinish, node.isWall)
      }
    }
    setStatus('Ready')
    setIsAnimating(false)
    setHasVisualization(false)
  }

  function stopAnimation() {
    if (!isAnimating) return
    clearAllTimeouts()
    setIsAnimating(false)
    setStatus('Stopped')
    // We likely have partially-drawn visited/path classes on the DOM now.
    // Mark as "visualized" so Clear Path will definitely reset the grid.
    setHasVisualization(true)
  }

  function clearHistory() {
    setRunHistory([])
    setLastRun(null)
  }

  function setGridNodeWall(row, col, isWall) {
    setGrid((prevGrid) => {
      const nextGrid = prevGrid.slice()
      const nextRow = nextGrid[row].slice()
      const node = nextRow[col]
      if (node.isStart || node.isFinish) return prevGrid
      nextRow[col] = { ...node, isWall }
      nextGrid[row] = nextRow
      return nextGrid
    })
  }

  function moveEndpoint(endpoint, toRow, toCol) {
    setGrid((prevGrid) => {
      const nextGrid = prevGrid.map((r) => r.slice())
      const toNode = nextGrid[toRow][toCol]
      if (toNode.isWall) return prevGrid

      // Prevent start/finish overlap.
      if (endpoint === 'start' && toNode.isFinish) return prevGrid
      if (endpoint === 'finish' && toNode.isStart) return prevGrid

      const from =
        endpoint === 'start'
          ? { row: startPos.row, col: startPos.col }
          : { row: finishPos.row, col: finishPos.col }
      const fromNode = nextGrid[from.row][from.col]
      nextGrid[from.row][from.col] = {
        ...fromNode,
        isStart: endpoint === 'start' ? false : fromNode.isStart,
        isFinish: endpoint === 'finish' ? false : fromNode.isFinish,
      }

      nextGrid[toRow][toCol] = {
        ...toNode,
        isStart: endpoint === 'start',
        isFinish: endpoint === 'finish',
      }
      return nextGrid
    })

    if (endpoint === 'start') setStartPos({ row: toRow, col: toCol })
    if (endpoint === 'finish') setFinishPos({ row: toRow, col: toCol })
  }

  function handleMouseDown(row, col) {
    if (controlsDisabled) return
    if (hasVisualization) clearVisualizationOnly()
    const node = grid[row][col]
    setMouseIsPressed(true)

    if (node.isStart) {
      setDragMode('start')
      return
    }
    if (node.isFinish) {
      setDragMode('finish')
      return
    }

    // Wall paint/erase mode:
    setDragMode('wall')
    wallPaintValueRef.current = !node.isWall
    setGridNodeWall(row, col, wallPaintValueRef.current)
  }

  function handleMouseEnter(row, col) {
    if (!mouseIsPressed || controlsDisabled) return

    if (dragMode === 'wall') {
      setGridNodeWall(row, col, wallPaintValueRef.current)
      return
    }
    if (dragMode === 'start') {
      moveEndpoint('start', row, col)
      return
    }
    if (dragMode === 'finish') {
      moveEndpoint('finish', row, col)
    }
  }

  function handleMouseUp() {
    setMouseIsPressed(false)
    setDragMode(null)
  }

  function clearWalls() {
    if (controlsDisabled) return
    clearVisualizationOnly()
    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((node) => (node.isWall ? { ...node, isWall: false } : node)),
      ),
    )
  }

  function generateMaze() {
    if (controlsDisabled) return
    clearVisualizationOnly()
    setStatus('Generating maze...')

    const walls =
      mazeType === 'division'
        ? generateRecursiveDivisionMaze({
            rows: numRows,
            cols: numCols,
            start: startPos,
            finish: finishPos,
            addBorder: true,
          })
        : mazeType === 'prims'
          ? generateRandomizedPrimsMaze({
              rows: numRows,
              cols: numCols,
              start: startPos,
              finish: finishPos,
              addBorder: true,
            })
        : generateRecursiveBacktrackerMaze({
            rows: numRows,
            cols: numCols,
            start: startPos,
            finish: finishPos,
            addBorder: true,
          })

    setGrid((prevGrid) =>
      prevGrid.map((row) =>
        row.map((node) => {
          if (node.isStart || node.isFinish) return { ...node, isWall: false }
          return { ...node, isWall: walls.has(wallKey(node.row, node.col)) }
        }),
      ),
    )

    setStatus('Ready')
  }

  function applyGridSize() {
    if (controlsDisabled) return
    clearVisualizationOnly()

    const requestedRows = Number.parseInt(rowsInput, 10)
    const requestedCols = Number.parseInt(colsInput, 10)

    const nextRows = clamp(Number.isFinite(requestedRows) ? requestedRows : DEFAULT_ROWS, MIN_ROWS, MAX_ROWS)
    const nextCols = clamp(Number.isFinite(requestedCols) ? requestedCols : DEFAULT_COLS, MIN_COLS, MAX_COLS)

    // Preserve endpoints if possible, otherwise clamp into bounds.
    let nextStart = clampPos(startPos, nextRows, nextCols)
    let nextFinish = clampPos(finishPos, nextRows, nextCols)

    // Prevent overlap if clamping caused collision.
    if (nextStart.row === nextFinish.row && nextStart.col === nextFinish.col) {
      const defaults = getDefaultEndpoints(nextRows, nextCols)
      nextStart = defaults.start
      nextFinish = defaults.finish
    }

    setNumRows(nextRows)
    setNumCols(nextCols)
    setStartPos(nextStart)
    setFinishPos(nextFinish)
    setGrid(buildInitialGrid(nextRows, nextCols, nextStart, nextFinish))
    setStatus('Ready')
  }

  function resetBoard() {
    clearVisualizationOnly()
    const defaults = getDefaultEndpoints(numRows, numCols)
    setStartPos(defaults.start)
    setFinishPos(defaults.finish)
    setGrid(buildInitialGrid(numRows, numCols, defaults.start, defaults.finish))
  }

  function computeRun(algorithmKey) {
    const gridForAlgo = cloneGridForAlgorithm(grid)
    const startNode = gridForAlgo[startPos.row][startPos.col]
    const finishNode = gridForAlgo[finishPos.row][finishPos.col]

    const t0 = performance.now()
    const visitedNodesInOrder =
      algorithmKey === 'bfs'
        ? bfs(gridForAlgo, startNode, finishNode)
        : algorithmKey === 'dijkstra'
          ? dijkstra(gridForAlgo, startNode, finishNode)
          : algorithmKey === 'greedy'
            ? greedyBestFirst(gridForAlgo, startNode, finishNode)
            : algorithmKey === 'dfs'
              ? dfs(gridForAlgo, startNode, finishNode)
              : astar(gridForAlgo, startNode, finishNode)
    const t1 = performance.now()

    const nodesInShortestPathOrder = getNodesInShortestPathOrder(finishNode)
    const hasPath =
      nodesInShortestPathOrder.length > 0 &&
      nodesInShortestPathOrder[0].row === startNode.row &&
      nodesInShortestPathOrder[0].col === startNode.col &&
      nodesInShortestPathOrder[nodesInShortestPathOrder.length - 1].row === finishNode.row &&
      nodesInShortestPathOrder[nodesInShortestPathOrder.length - 1].col === finishNode.col

    return {
      computeMs: t1 - t0,
      visitedNodesInOrder,
      nodesInShortestPathOrder: hasPath ? nodesInShortestPathOrder : [],
      hasPath,
      visitedCount: visitedNodesInOrder.length,
      pathLength: hasPath ? nodesInShortestPathOrder.length : 0,
    }
  }

  function labelForAlgorithm(key) {
    if (key === 'astar') return 'A*'
    if (key === 'dijkstra') return 'Dijkstra'
    if (key === 'bfs') return 'BFS'
    if (key === 'greedy') return 'Greedy Best-First'
    if (key === 'dfs') return 'DFS'
    return key
  }

  function labelForMaze(key) {
    if (key === 'backtracker') return 'DFS Backtracker'
    if (key === 'division') return 'Recursive Division'
    if (key === 'prims') return "Prim's"
    return key
  }

  function pushHistory(entry) {
    setLastRun(entry)
    setRunHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY_ENTRIES))
  }

  function animateShortestPath(nodesInShortestPathOrder, baseDelayMs) {
    const pathDelayMs = Math.max(20, Math.round(visitDelayMs * 4))
    for (let i = 0; i < nodesInShortestPathOrder.length; i++) {
      scheduleTimeout(() => {
        const node = nodesInShortestPathOrder[i]
        if (node.isStart || node.isFinish) return
        const el = document.getElementById(`node-${node.row}-${node.col}`)
        if (!el) return
        el.className = 'node node-shortest-path'
      }, baseDelayMs + pathDelayMs * i)
    }

    scheduleTimeout(() => {
      setIsAnimating(false)
      setStatus('Done')
      setHasVisualization(true)
    }, baseDelayMs + pathDelayMs * nodesInShortestPathOrder.length + 10)
  }

  function animateVisitedNodes(visitedNodesInOrder, nodesInShortestPathOrder) {
    for (let i = 0; i <= visitedNodesInOrder.length; i++) {
      if (i === visitedNodesInOrder.length) {
        // IMPORTANT: Don't double-delay. We pass the offset into the shortest-path animator.
        animateShortestPath(nodesInShortestPathOrder, visitDelayMs * i)
        return
      }

      scheduleTimeout(() => {
        const node = visitedNodesInOrder[i]
        if (node.isStart || node.isFinish) return
        const el = document.getElementById(`node-${node.row}-${node.col}`)
        if (!el) return
        el.className = 'node node-visited'
      }, visitDelayMs * i)
    }

    setHasVisualization(true)
  }

  function visualize() {
    if (isAnimating) return

    clearVisualizationOnly()
    setIsAnimating(true)
    setStatus(`Visualizing ${labelForAlgorithm(algorithm)}...`)
    setHasVisualization(true)

    const run = computeRun(algorithm)
    const entry = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ts: new Date().toISOString(),
      algorithm,
      mazeType,
      rows: numRows,
      cols: numCols,
      computeMs: run.computeMs,
      visitedCount: run.visitedCount,
      pathLength: run.pathLength,
      result: run.hasPath ? 'path' : 'blocked',
    }
    pushHistory(entry)

    if (!run.hasPath) {
      animateVisitedNodes(run.visitedNodesInOrder, [])
      scheduleTimeout(() => {
        setIsAnimating(false)
        setStatus(`No path found (blocked). Compute: ${formatMs(entry.computeMs)}`)
        setHasVisualization(true)
      }, visitDelayMs * run.visitedNodesInOrder.length + 50)
      return
    }

    setStatus(`Visualizing ${labelForAlgorithm(algorithm)}... Compute: ${formatMs(entry.computeMs)}`)
    animateVisitedNodes(run.visitedNodesInOrder, run.nodesInShortestPathOrder)
  }

  const algorithmLabel = useMemo(
    () => labelForAlgorithm(algorithm),
    [algorithm],
  )

  function benchmarkAll() {
    if (controlsDisabled) return
    clearVisualizationOnly()
    setIsBenchmarking(true)
    setStatus('Benchmarking all algorithms...')

    const algoKeys = ['astar', 'dijkstra', 'bfs', 'greedy', 'dfs']
    const baseTs = new Date().toISOString()
    const entries = []
    for (const key of algoKeys) {
      const run = computeRun(key)
      entries.push({
        id: `${Date.now()}-${key}-${Math.random().toString(16).slice(2)}`,
        ts: baseTs,
        algorithm: key,
        mazeType,
        rows: numRows,
        cols: numCols,
        computeMs: run.computeMs,
        visitedCount: run.visitedCount,
        pathLength: run.pathLength,
        result: run.hasPath ? 'path' : 'blocked',
      })
    }

    setRunHistory((prev) => [...entries, ...prev].slice(0, MAX_HISTORY_ENTRIES))
    setLastRun(entries[0] ?? null)
    setIsBenchmarking(false)
    setStatus('Ready')
  }

  return (
    <div className="pv">
      <header className="pv-header">
        <div className="pv-title">
          <h1>Pathfinding Visualizer</h1>
          <p className="pv-subtitle">
            Drag to draw walls. Drag the start (green) and finish (red) nodes.
          </p>
        </div>

        <div className="pv-controls">
          <label className="pv-field">
            <span className="pv-fieldLabel">Algorithm</span>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value)}
              disabled={controlsDisabled}
            >
              <option value="astar">A*</option>
              <option value="dijkstra">Dijkstra</option>
              <option value="bfs">BFS (unweighted)</option>
              <option value="greedy">Greedy Best-First</option>
              <option value="dfs">DFS</option>
            </select>
          </label>

          <label className="pv-field">
            <span className="pv-fieldLabel">Maze</span>
            <select
              value={mazeType}
              onChange={(e) => setMazeType(e.target.value)}
              disabled={controlsDisabled}
            >
              <option value="backtracker">DFS Backtracker</option>
              <option value="division">Recursive Division</option>
              <option value="prims">Randomized Prim's</option>
            </select>
          </label>

          <label className="pv-field pv-field--wide">
            <span className="pv-fieldLabel">Speed</span>
            <input
              type="range"
              min="5"
              max="40"
              step="1"
              value={visitDelayMs}
              onChange={(e) => setVisitDelayMs(Number(e.target.value))}
              disabled={controlsDisabled}
            />
            <span className="pv-fieldValue">{visitDelayMs}ms</span>
          </label>

          <label className="pv-field pv-field--wide">
            <span className="pv-fieldLabel">Grid</span>
            <input
              className="pv-input"
              type="number"
              min={MIN_ROWS}
              max={MAX_ROWS}
              value={rowsInput}
              onChange={(e) => setRowsInput(e.target.value)}
              disabled={controlsDisabled}
              aria-label="Grid rows"
            />
            <span className="pv-fieldLabel">x</span>
            <input
              className="pv-input"
              type="number"
              min={MIN_COLS}
              max={MAX_COLS}
              value={colsInput}
              onChange={(e) => setColsInput(e.target.value)}
              disabled={controlsDisabled}
              aria-label="Grid columns"
            />
            <button onClick={applyGridSize} disabled={controlsDisabled}>
              Apply
            </button>
          </label>

          <button onClick={isAnimating ? stopAnimation : visualize}>
            {isAnimating ? 'Stop' : `Visualize ${algorithmLabel}`}
          </button>
          <button onClick={benchmarkAll} disabled={controlsDisabled}>
            Benchmark All
          </button>
          <button onClick={generateMaze} disabled={controlsDisabled}>
            Generate Maze
          </button>
          <button onClick={clearWalls} disabled={controlsDisabled}>
            Clear Walls
          </button>
          <button onClick={clearVisualizationOnly} disabled={controlsDisabled}>
            Clear Path
          </button>
          <button onClick={clearHistory} disabled={controlsDisabled}>
            Clear History
          </button>
          <button onClick={resetBoard} disabled={controlsDisabled}>
            Reset Board
          </button>
        </div>
      </header>

      <div className="pv-status" aria-live="polite">
        <span className="pv-status-label">Status:</span> {status}
        {lastRun ? (
          <div className="pv-runline">
            Last run: <strong>{labelForAlgorithm(lastRun.algorithm)}</strong> on{' '}
            <strong>{labelForMaze(lastRun.mazeType)}</strong> — compute{' '}
            <strong>{formatMs(lastRun.computeMs)}</strong> · visited{' '}
            <strong>{lastRun.visitedCount}</strong> · path{' '}
            <strong>{lastRun.pathLength}</strong> · result{' '}
            <strong>{lastRun.result}</strong>
          </div>
        ) : null}
      </div>

      <section className="pv-history">
        <div className="pv-historyHeader">
          <div className="pv-historyTitle">Recent benchmarks</div>
          <div className="pv-historyHint">Compute time only (animation excluded).</div>
        </div>
        {runHistory.length ? (
          <div className="pv-tableWrap">
            <table className="pv-table">
              <thead>
                <tr>
                  <th>Algorithm</th>
                  <th>Maze</th>
                  <th>Grid</th>
                  <th>Compute</th>
                  <th>Visited</th>
                  <th>Path</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {runHistory.map((r) => (
                  <tr key={r.id}>
                    <td>{labelForAlgorithm(r.algorithm)}</td>
                    <td>{labelForMaze(r.mazeType)}</td>
                    <td>
                      {r.rows}×{r.cols}
                    </td>
                    <td>{formatMs(r.computeMs)}</td>
                    <td>{r.visitedCount}</td>
                    <td>{r.pathLength}</td>
                    <td>{r.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="pv-historyEmpty">Run “Benchmark All” to compare algorithm runtimes.</div>
        )}
      </section>

      <div className="pv-legend">
        <div className="pv-legend-item">
          <span className="pv-swatch node node-start" /> Start
        </div>
        <div className="pv-legend-item">
          <span className="pv-swatch node node-finish" /> Finish
        </div>
        <div className="pv-legend-item">
          <span className="pv-swatch node node-wall" /> Wall
        </div>
        <div className="pv-legend-item">
          <span className="pv-swatch node node-visited" /> Visited
        </div>
        <div className="pv-legend-item">
          <span className="pv-swatch node node-shortest-path" /> Shortest Path
        </div>
      </div>

      <div
        className="pv-gridWrap"
        onMouseLeave={handleMouseUp}
        onMouseUp={handleMouseUp}
      >
        <div
          className="pv-grid"
          style={{ gridTemplateColumns: `repeat(${numCols}, ${CELL_SIZE_PX}px)` }}
        >
          {grid.map((row) =>
            row.map((node) => (
              <Node
                key={`${node.row}-${node.col}`}
                row={node.row}
                col={node.col}
                isStart={node.isStart}
                isFinish={node.isFinish}
                isWall={node.isWall}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
                onMouseUp={handleMouseUp}
              />
            )),
          )}
        </div>
      </div>
    </div>
  )
}


