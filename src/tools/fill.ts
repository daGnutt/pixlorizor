import { hexToRgba, colorsMatch } from '../utils/colorUtils';
import type { RgbaColor } from '../types';

export function applyFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColor: string,
  width: number,
  height: number,
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const idx = (x: number, y: number) => (y * width + x) * 4;
  const getPixel = (x: number, y: number): RgbaColor => {
    const i = idx(x, y);
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const setPixel = (x: number, y: number, color: RgbaColor) => {
    const i = idx(x, y);
    [data[i], data[i + 1], data[i + 2], data[i + 3]] = color;
  };

  const targetColor = getPixel(startX, startY);
  const fill = hexToRgba(fillColor);

  if (colorsMatch(targetColor, fill)) return;

  const queue: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(width * height);

  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[y * width + x]) continue;
    if (!colorsMatch(getPixel(x, y), targetColor)) continue;

    visited[y * width + x] = 1;
    setPixel(x, y, fill);

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Returns the pixel coordinates that a flood-fill from (startX, startY) would cover,
 * without modifying any canvas. Used by the layered drawing engine.
 */
export function getFloodFillPixels(
  composite: ImageData,
  startX: number,
  startY: number,
  width: number,
  height: number,
): [number, number][] {
  const data = composite.data;
  const idx = (x: number, y: number) => (y * width + x) * 4;
  const getPixel = (x: number, y: number): RgbaColor => {
    const i = idx(x, y);
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };

  const targetColor = getPixel(startX, startY);
  const result: [number, number][] = [];
  const queue: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(width * height);

  while (queue.length > 0) {
    const [x, y] = queue.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    if (visited[y * width + x]) continue;
    if (!colorsMatch(getPixel(x, y), targetColor)) continue;

    visited[y * width + x] = 1;
    result.push([x, y]);

    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return result;
}
