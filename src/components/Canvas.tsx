import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import type { Tool } from '../types';
import { applyPencil } from '../tools/pencil';
import { applyEraser } from '../tools/eraser';
import { applyFill } from '../tools/fill';
import { pickColor } from '../tools/picker';
import type { HistoryHandle } from '../hooks/useHistory';

interface Props {
  width: number;
  height: number;
  zoom: number;
  activeTool: Tool;
  activeColor: string;
  showGrid: boolean;
  history: HistoryHandle;
  onColorPicked: (color: string) => void;
  onSnapshot?: () => void;
}

export interface CanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  loadImageData: (img: HTMLImageElement) => void;
}

const PixelCanvas = forwardRef<CanvasHandle, Props>(function PixelCanvas(
  { width, height, zoom, activeTool, activeColor, showGrid, history, onColorPicked, onSnapshot },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPixel = useRef<[number, number] | null>(null);
  const [paintGlow, setPaintGlow] = useState<{ px: number; py: number } | null>(null);

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    loadImageData: (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      history.snapshot(canvas);
      onSnapshot?.();
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
      case 'pencil': applyPencil(ctx, px, py, activeColor); break;
      case 'eraser': applyEraser(ctx, px, py); break;
      default: break;
    }
  }, [activeTool, activeColor, width, height]);

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const [px, py] = getPixelCoords(e);

    if (activeTool === 'fill') {
      applyFill(ctx, px, py, activeColor, width, height);
      history.snapshot(canvas);
      onSnapshot?.();
      return;
    }

    if (activeTool === 'picker') {
      const color = pickColor(ctx, px, py);
      onColorPicked(color);
      return;
    }

    isDrawing.current = true;
    lastPixel.current = [px, py];
    setPaintGlow({ px, py });
    drawAt(px, py);
  }, [activeTool, activeColor, width, height, getPixelCoords, drawAt, history, onColorPicked, onSnapshot]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const [px, py] = getPixelCoords(e);
    const last = lastPixel.current;

    // Bresenham's line between last and current pixel to avoid gaps
    if (last) {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d')!;
      let [x0, y0] = last;
      const [x1, y1] = [px, py];
      const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      while (true) {
        if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
          if (activeTool === 'pencil') applyPencil(ctx, x0, y0, activeColor);
          else if (activeTool === 'eraser') applyEraser(ctx, x0, y0);
        }
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
      }
    }
    lastPixel.current = [px, py];
    setPaintGlow({ px, py });
  }, [activeTool, activeColor, width, height, getPixelCoords]);

  const onMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPixel.current = null;
    setPaintGlow(null);
    const canvas = canvasRef.current;
    if (canvas) { history.snapshot(canvas); onSnapshot?.(); }
  }, [history, onSnapshot]);

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
        onMouseLeave={onMouseUp}
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
