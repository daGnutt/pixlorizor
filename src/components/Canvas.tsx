import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import type { Tool } from '../types';
import { applyPencil } from '../tools/pencil';
import { applyEraser } from '../tools/eraser';
import { applyFill } from '../tools/fill';
import { pickColor } from '../tools/picker';
import { hexToRgba } from '../utils/colorUtils';
import { findEdgeIntersection } from '../utils/canvasGeometry';
import { explode } from '../utils/particles';
import type { HistoryHandle } from '../hooks/useHistory';

interface Props {
  width: number;
  height: number;
  zoom: number;
  activeTool: Tool;
  activeColor: string;
  palette: string[];
  showGrid: boolean;
  glitterbombs: boolean;
  history: HistoryHandle;
  onColorPicked: (color: string) => void;
  onSnapshot?: () => void;
}

export interface CanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  loadImageData: (img: HTMLImageElement) => void;
  replaceColor: (oldHex: string, newHex: string) => void;
  eraseColor: (hex: string) => void;
}

const PixelCanvas = forwardRef<CanvasHandle, Props>(function PixelCanvas(
  { width, height, zoom, activeTool, activeColor, palette, showGrid, glitterbombs, history, onColorPicked, onSnapshot },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPixel = useRef<[number, number] | null>(null);
  const secondLastPixel = useRef<[number, number] | null>(null);
  const pendingEntryPixel = useRef<[number, number] | null>(null);
  const waitingForEntry = useRef(false);
  const isShiftHeld = useRef(false);
  const shiftAnchor = useRef<[number, number] | null>(null);
  const workingSnapshot = useRef<ImageData | null>(null);
  const [paintGlow, setPaintGlow] = useState<{ px: number; py: number } | null>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    loadImageData: (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      // Snapshot is taken by App.tsx after the palette is extracted
    },
    replaceColor: (oldHex: string, newHex: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const [or, og, ob] = hexToRgba(oldHex);
      const [nr, ng, nb] = hexToRgba(newHex);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === or && data[i + 1] === og && data[i + 2] === ob && data[i + 3] !== 0) {
          data[i] = nr; data[i + 1] = ng; data[i + 2] = nb;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      // Snapshot is taken by App.tsx with the updated palette
    },
    eraseColor: (hex: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const [er, eg, eb] = hexToRgba(hex);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === er && data[i + 1] === eg && data[i + 2] === eb && data[i + 3] !== 0) {
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      // Snapshot is taken by App.tsx with the updated palette
    },
  }));

  // Draw grid overlay
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const ctx = grid.getContext('2d')!;
    ctx.clearRect(0, 0, grid.width, grid.height);
    if (!showGrid) return;
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color').trim() || 'rgba(255,255,255,0.12)';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * zoom, 0);
      ctx.lineTo(x * zoom, height * zoom);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * zoom);
      ctx.lineTo(width * zoom, y * zoom);
      ctx.stroke();
    }
  }, [showGrid, width, height, zoom]);

  // Snap (px, py) to the nearest 45°-aligned direction from anchor (ax, ay)
  const constrainToStraightLine = useCallback((
    ax: number, ay: number, px: number, py: number,
  ): [number, number] => {
    const dx = px - ax;
    const dy = py - ay;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    if (adx === 0 && ady === 0) return [px, py];
    const angle = Math.atan2(ady, adx);
    if (angle < Math.PI / 8) return [px, ay];                              // horizontal
    if (angle > 3 * Math.PI / 8) return [ax, py];                         // vertical
    const d = Math.min(adx, ady);                                          // 45° diagonal
    return [ax + Math.sign(dx) * d, ay + Math.sign(dy) * d];
  }, []);

  // Track Shift key; when pressed mid-stroke, anchor the straight-line start
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return;
      isShiftHeld.current = true;
      if (isDrawing.current && lastPixel.current) {
        shiftAnchor.current = lastPixel.current;
        const canvas = canvasRef.current;
        if (canvas) {
          workingSnapshot.current = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return;
      isShiftHeld.current = false;
      shiftAnchor.current = null;
      workingSnapshot.current = null;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const toScreenPos = useCallback((px: number, py: number): [number, number] => {
    const canvas = canvasRef.current;
    if (!canvas) return [px * zoom, py * zoom];
    const rect = canvas.getBoundingClientRect();
    return [rect.left + px * zoom + zoom / 2, rect.top + py * zoom + zoom / 2];
  }, [zoom]);

  const getPixelCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const px = Math.floor((e.clientX - rect.left) / zoom);
    const py = Math.floor((e.clientY - rect.top) / zoom);
    return [px, py] as [number, number];
  }, [zoom]);

  const drawAt = useCallback((px: number, py: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (px < 0 || px >= width || py < 0 || py >= height) return;
    const ctx = canvas.getContext('2d')!;

    switch (activeTool) {
      case 'pencil': {
        applyPencil(ctx, px, py, activeColor);
        if (glitterbombs) {
          const [sx, sy] = toScreenPos(px, py);
          explode(sx, sy, 10, [activeColor]);
        }
        break;
      }
      case 'eraser': applyEraser(ctx, px, py); break;
      default: break;
    }
  }, [activeTool, activeColor, width, height, glitterbombs]);

  const drawBresenhamSegment = useCallback((
    ctx: CanvasRenderingContext2D,
    from: [number, number],
    to: [number, number],
  ) => {
    let [x0, y0] = from;
    const [x1, y1] = to;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
        if (activeTool === 'pencil') {
          applyPencil(ctx, x0, y0, activeColor);
          if (glitterbombs) {
            const [sx2, sy2] = toScreenPos(x0, y0);
            explode(sx2, sy2, 5, [activeColor]);
          }
        } else if (activeTool === 'eraser') {
          applyEraser(ctx, x0, y0);
        }
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }, [activeTool, activeColor, width, height, glitterbombs, toScreenPos]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const [px, py] = getPixelCoords(e);

    if (activeTool === 'fill') {
      applyFill(ctx, px, py, activeColor, width, height);
      if (glitterbombs) {
        const [sx, sy] = toScreenPos(px, py);
        explode(sx, sy, 28, [activeColor]);
      }
      history.snapshot(canvas, palette);
      onSnapshot?.();
      return;
    }

    if (activeTool === 'picker') {
      const color = pickColor(ctx, px, py);
      onColorPicked(color);
      return;
    }

    isDrawing.current = true;
    secondLastPixel.current = null;
    pendingEntryPixel.current = null;
    waitingForEntry.current = false;
    lastPixel.current = [px, py];
    if (isShiftHeld.current) {
      shiftAnchor.current = [px, py];
      workingSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } else {
      shiftAnchor.current = null;
      workingSnapshot.current = null;
    }
    setPaintGlow({ px, py });
    drawAt(px, py);
  }, [activeTool, activeColor, palette, width, height, glitterbombs, getPixelCoords, drawAt, toScreenPos, history, onColorPicked, onSnapshot]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const [px, py] = getPixelCoords(e);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    // Shift held — restore snapshot and draw a straight constrained line
    if (isShiftHeld.current && shiftAnchor.current && workingSnapshot.current) {
      ctx.putImageData(workingSnapshot.current, 0, 0);
      const [ex, ey] = constrainToStraightLine(
        shiftAnchor.current[0], shiftAnchor.current[1], px, py,
      );
      drawBresenhamSegment(ctx, shiftAnchor.current, [ex, ey]);
      lastPixel.current = [ex, ey];
      if (ex >= 0 && ex < width && ey >= 0 && ey < height) {
        setPaintGlow({ px: ex, py: ey });
      }
      return;
    }

    if (waitingForEntry.current) {
      // Phase 1: first move after leaving — buffer as P1, wait for P2
      pendingEntryPixel.current = [px, py];
      waitingForEntry.current = false;
      return;
    }

    if (pendingEntryPixel.current) {
      // Phase 2: second move after leaving — P1 and P2 are from separate mousemove
      // events so they are guaranteed to differ, giving a reliable entry direction.
      const P1 = pendingEntryPixel.current;
      const P2: [number, number] = [px, py];
      const entryEdge = findEdgeIntersection(
        P1[0], P1[1],
        P1[0] - P2[0], P1[1] - P2[1],
        width, height,
      );
      drawBresenhamSegment(ctx, entryEdge, P1);
      drawBresenhamSegment(ctx, P1, P2);
      pendingEntryPixel.current = null;
      secondLastPixel.current = P1;
      lastPixel.current = P2;
    } else {
      // Phase 3: normal Bresenham stroke
      const last = lastPixel.current;
      if (last) {
        drawBresenhamSegment(ctx, last, [px, py]);
        secondLastPixel.current = last;
        lastPixel.current = [px, py];
      }
    }

    if (px >= 0 && px < width && py >= 0 && py < height) {
      setPaintGlow({ px, py });
    }
  }, [width, height, getPixelCoords, drawBresenhamSegment, constrainToStraightLine]);

  const onMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPixel.current = null;
    secondLastPixel.current = null;
    pendingEntryPixel.current = null;
    waitingForEntry.current = false;
    setPaintGlow(null);
    const canvas = canvasRef.current;
    if (canvas) { history.snapshot(canvas, palette); onSnapshot?.(); }
  }, [history, palette, onSnapshot]);

  // Stop drawing when mouse button is released anywhere outside the canvas
  useEffect(() => {
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, [onMouseUp]);

  const cursorStyle = {
    pencil: 'crosshair',
    eraser: 'cell',
    fill: 'default',
    picker: 'crosshair',
  }[activeTool];

  const displayW = width * zoom;
  const displayH = height * zoom;

  return (
    <div
      className="relative border border-[var(--border-color)] shadow-lg"
      style={{ width: displayW, height: displayH }}
    >
      {/* Checkerboard background to show transparency */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-conic-gradient(var(--checker-1) 0% 25%, var(--checker-2) 0% 50%)',
          backgroundSize: `${zoom * 2}px ${zoom * 2}px`,
        }}
      />
      {/* Pixel canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          position: 'absolute',
          inset: 0,
          width: displayW,
          height: displayH,
          imageRendering: 'pixelated',
          cursor: cursorStyle,
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={(e) => {
          setPaintGlow(null);
          if (!isDrawing.current) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d')!;
          const last = lastPixel.current;
          const secondLast = secondLastPixel.current;
          if (last && secondLast) {
            // Extrapolate exit edge from direction secondLast → last
            const exitEdge = findEdgeIntersection(
              secondLast[0], secondLast[1],
              last[0] - secondLast[0], last[1] - secondLast[1],
              width, height,
            );
            drawBresenhamSegment(ctx, last, exitEdge);
          } else if (last) {
            // Only one point known — use the exit event position as direction hint
            const [ex, ey] = getPixelCoords(e);
            const exitEdge = findEdgeIntersection(
              last[0], last[1],
              ex - last[0], ey - last[1],
              width, height,
            );
            drawBresenhamSegment(ctx, last, exitEdge);
          }
          secondLastPixel.current = null;
          pendingEntryPixel.current = null;
          waitingForEntry.current = true;
        }}
      />
      {/* Grid overlay canvas */}
      <canvas
        ref={gridRef}
        width={displayW}
        height={displayH}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      />
      {/* Paint halo — glowing overlay on the pixel being painted */}
      {paintGlow && (activeTool === 'pencil' || activeTool === 'eraser') && (
        <div
          className="paint-halo"
          style={{
            left: paintGlow.px * zoom,
            top: paintGlow.py * zoom,
            width: zoom,
            height: zoom,
          }}
        />
      )}
    </div>
  );
});

export default PixelCanvas;
