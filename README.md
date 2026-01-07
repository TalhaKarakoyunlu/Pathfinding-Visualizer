# Interactive Pathfinding Visualizer (React)

An interactive grid-based pathfinding visualizer built with React. Use it to compare algorithms, generate mazes, and understand how shortest paths are explored step-by-step.

## Features

- **Interactive grid**
  - Click + drag to draw/erase **walls**
  - Drag **Start** (green) and **Finish** (red)
  - Adjustable **grid size** (rows × columns)
- **Pathfinding algorithms**
  - **A\*** (Manhattan heuristic, 4-directional movement)
  - **Dijkstra** (unweighted grid = cost 1 per step)
  - **BFS** (unweighted shortest path)
- **Visualization**
  - Step-by-step visited nodes animation
  - Shortest path highlight
  - Speed control + Stop
- **Maze generation**
  - **DFS Recursive Backtracker** (classic perfect-maze style)
  - **Recursive Division**

## Run locally

Install:

```bash
npm install
```

Start dev server:

```bash
npm run dev
```

Then open the printed local URL (usually `http://127.0.0.1:5173/`).

## Controls (quick guide)

- **Algorithm**: choose A\* / Dijkstra / BFS
- **Maze**: choose DFS Backtracker / Recursive Division, then click **Generate Maze**
- **Speed**: controls animation delay per visited node
- **Grid**: set rows/cols and click **Apply**
- **Clear Walls**: removes all walls
- **Clear Path**: removes visited/path visualization (keeps walls)
- **Reset Board**: resets endpoints and clears walls/path for the current grid size

## Project structure

- `src/components/PathfindingVisualizer.jsx`: main UI + grid state + animation
- `src/components/Node.jsx`: presentational node cell
- `src/algorithms/dijkstra.js`: pure algorithm implementation + backtracking helper
- `src/algorithms/astar.js`: A* implementation (Manhattan heuristic)
- `src/algorithms/bfs.js`: BFS implementation
- `src/algorithms/maze.js`: maze generators (recursive division + DFS backtracker)
- `src/components/*.css`: visual styles for grid and animations
