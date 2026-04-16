/**
 * Starting from (x0, y0) moving in direction (dx, dy), returns the last
 * integer pixel coordinate that still lies within the canvas bounds
 * [0, width-1] × [0, height-1].
 *
 * If (x0, y0) is already out of bounds the result is clamped to the nearest
 * boundary pixel.  If dx === 0 && dy === 0, (x0, y0) is returned unchanged.
 */
export function findEdgeIntersection(
  x0: number,
  y0: number,
  dx: number,
  dy: number,
  width: number,
  height: number,
): [number, number] {
  if (dx === 0 && dy === 0) {
    return [
      Math.max(0, Math.min(width - 1, x0)),
      Math.max(0, Math.min(height - 1, y0)),
    ];
  }

  // Find the largest t >= 0 such that (x0 + t*dx, y0 + t*dy) is still in bounds.
  let tMax = Infinity;

  if (dx > 0) tMax = Math.min(tMax, (width - 1 - x0) / dx);
  else if (dx < 0) tMax = Math.min(tMax, (0 - x0) / dx); // dx < 0 → positive t

  if (dy > 0) tMax = Math.min(tMax, (height - 1 - y0) / dy);
  else if (dy < 0) tMax = Math.min(tMax, (0 - y0) / dy);

  // tMax may be < 0 if (x0,y0) is already outside in the given direction
  const t = Math.max(0, tMax);

  return [
    Math.max(0, Math.min(width - 1, Math.round(x0 + t * dx))),
    Math.max(0, Math.min(height - 1, Math.round(y0 + t * dy))),
  ];
}
