import { hexToRgba } from '../utils/colorUtils';

export function applyPencil(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  color: string,
) {
  const [r, g, b] = hexToRgba(color);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(px, py, 1, 1);
}
