# Interactive Pathfinding Visualizer (React)

An interactive grid-based pathfinding visualizer with:

- Click + drag to draw **walls**
- Drag **Start** (green) and **Finish** (red)
- **Dijkstra** visualization (visited nodes) + shortest path highlight
- Controls: visualize, clear walls, clear path, reset board

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

## Project structure

- `src/components/PathfindingVisualizer.jsx`: main UI + grid state + animation
- `src/components/Node.jsx`: presentational node cell
- `src/algorithms/dijkstra.js`: pure algorithm implementation + backtracking helper
- `src/components/*.css`: visual styles for grid and animations
