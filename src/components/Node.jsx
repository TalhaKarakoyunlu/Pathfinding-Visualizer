import './Node.css'

/**
 * Presentational node cell for the grid.
 * NOTE: visited/path animations are applied via DOM class changes for performance.
 */
export default function Node({
  row,
  col,
  isStart,
  isFinish,
  isWall,
  onMouseDown,
  onMouseEnter,
  onMouseUp,
}) {
  const extraClassName = isStart
    ? 'node-start'
    : isFinish
      ? 'node-finish'
      : isWall
        ? 'node-wall'
        : ''

  return (
    <div
      id={`node-${row}-${col}`}
      className={`node ${extraClassName}`}
      onMouseDown={() => onMouseDown(row, col)}
      onMouseEnter={() => onMouseEnter(row, col)}
      onMouseUp={onMouseUp}
    />
  )
}


