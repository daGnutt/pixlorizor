import { rgbaToHex } from '../utils/colorUtils';
import type { RgbaColor } from '../types';

export function pickColor(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
): string {
  const pixel = ctx.getImageData(px, py, 1, 1).data;
  const rgba: RgbaColor = [pixel[0], pixel[1], pixel[2], pixel[3]];
  return rgbaToHex(rgba);
}
