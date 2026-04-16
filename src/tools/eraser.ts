export function applyEraser(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
) {
  ctx.clearRect(px, py, 1, 1);
}
