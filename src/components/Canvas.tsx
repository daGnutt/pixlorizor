import React, { useRef, useEffect, useCallback, forwardRef, useImperativeHandle, useState } from 'react';
import type { Tool, LayerEntry } from '../types';
import { getFloodFillPixels } from '../tools/fill';
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
  getLayers: () => LayerEntry[];
  setLayers: (entries: LayerEntry[]) => void;
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
  const layersRef = useRef<Map<string, ImageData>>(new Map());
  // Keep a ref to the current palette for use inside non-reactive callbacks
  const paletteRef = useRef<string[]>(palette);

  const isDrawing = useRef(false);
  const lastPixel = useRef<[number, number] | null>(null);
  const secondLastPixel = useRef<[number, number] | null>(null);
  const pendingEntryPixel = useRef<[number, number] | null>(null);
  const waitingForEntry = useRef(false);
  const isShiftHeld = useRef(false);
  const shiftAnchor = useRef<[number, number] | null>(null);
  const workingSnapshot = useRef<Map<string, ImageData> | null>(null);
  const [paintGlow, setPaintGlow] = useState<{ px: number; py: number } | null>(null);

  // ─── Layer helpers ────────────────────────────────────────────────────────

  const getOrCreateLayer = useCallback((color: string): ImageData => {
    const existing = layersRef.current.get(color);
    if (existing) return existing;
    const blank = new ImageData(width, height);
    layersRef.current.set(color, blank);
    return blank;
  }, [width, height]);

  const compositeLayers = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const result = new ImageData(width, height);
    for (const color of paletteRef.current) {
      const layer = layersRef.current.get(color);
      if (!layer) continue;
      const src = layer.data;
      const dst = result.data;
      for (let i = 0; i < dst.length; i += 4) {
        if (src[i + 3] > 0) {
          dst[i]     = src[i];
          dst[i + 1] = src[i + 1];
          dst[i + 2] = src[i + 2];
          dst[i + 3] = src[i + 3];
        }
      }
    }
    ctx.putImageData(result, 0, 0);
  }, [width, height]);

  // Sync palette ref and re-composite whenever palette order changes
  useEffect(() => {
    paletteRef.current = palette;
    compositeLayers();
  }, [palette, compositeLayers]);

  // Write one pixel to a layer's raw ImageData (no recomposite — caller must call compositeLayers)
  const setLayerPixel = useCallback((color: string, px: number, py: number) => {
    const layer = getOrCreateLayer(color);
    const [r, g, b] = hexToRgba(color);
    const i = (py * width + px) * 4;
    layer.data[i]     = r;
    layer.data[i + 1] = g;
    layer.data[i + 2] = b;
    layer.data[i + 3] = 255;
  }, [getOrCreateLayer, width]);

  // Clear one pixel from a layer's raw ImageData
  const clearLayerPixel = useCallback((color: string, px: number, py: number) => {
    const layer = layersRef.current.get(color);
    if (!layer) return;
    const i = (py * width + px) * 4;
    layer.data[i] = layer.data[i + 1] = layer.data[i + 2] = layer.data[i + 3] = 0;
  }, [width]);

  // ─── CanvasHandle ─────────────────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,

    getLayers: (): LayerEntry[] =>
      paletteRef.current.map(color => ({
        color,
        imageData: layersRef.current.get(color) ?? new ImageData(width, height),
      })),

    setLayers: (entries: LayerEntry[]) => {
      layersRef.current = new Map(entries.map(e => [e.color, e.imageData]));
      compositeLayers();
    },

    loadImageData: (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      // Draw image to a temp canvas to read pixels
      const tmp = document.createElement('canvas');
      tmp.width = width;
      tmp.height = height;
      const tctx = tmp.getContext('2d')!;
      tctx.drawImage(img, 0, 0);
      const { data } = tctx.getImageData(0, 0, width, height);
      // Rebuild layers from flat image — each pixel goes into its colour's layer
      layersRef.current = new Map();
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        let layer = layersRef.current.get(hex);
        if (!layer) {
          layer = new ImageData(width, height);
          layersRef.current.set(hex, layer);
        }
        const pi = i; // same index
        layer.data[pi]     = r;
        layer.data[pi + 1] = g;
        layer.data[pi + 2] = b;
        layer.data[pi + 3] = 255;
      }
      compositeLayers();
      // Snapshot taken by App.tsx after palette is extracted
    },

    replaceColor: (oldHex: string, newHex: string) => {
      const layer = layersRef.current.get(oldHex);
      if (layer) {
        // Re-colour every pixel in the layer
        const [nr, ng, nb] = hexToRgba(newHex);
        for (let i = 0; i < layer.data.length; i += 4) {
          if (layer.data[i + 3] > 0) {
            layer.data[i]     = nr;
            layer.data[i + 1] = ng;
            layer.data[i + 2] = nb;
          }
        }
        layersRef.current.delete(oldHex);
        layersRef.current.set(newHex, layer);
      }
      compositeLayers();
      // Snapshot taken by App.tsx with the updated palette
    },

    eraseColor: (hex: string) => {
      layersRef.current.delete(hex);
      compositeLayers();
      // Snapshot taken by App.tsx with the updated palette
    },
  }));

  // ─── Grid overlay ─────────────────────────────────────────────────────────

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

  // ─── Shift key tracking ───────────────────────────────────────────────────

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Shift') return;
      isShiftHeld.current = true;
      if (isDrawing.current && lastPixel.current) {
        shiftAnchor.current = lastPixel.current;
        // Deep-copy current layers as working snapshot
        const snap = new Map<string, ImageData>();
        for (const [color, layer] of layersRef.current) {
          snap.set(color, new ImageData(new Uint8ClampedArray(layer.data), layer.width, layer.height));
        }
        workingSnapshot.current = snap;
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

  // ─── Single-pixel draw ────────────────────────────────────────────────────

  const drawAt = useCallback((px: number, py: number) => {
    if (px < 0 || px >= width || py < 0 || py >= height) return;

    switch (activeTool) {
      case 'pencil': {
        setLayerPixel(activeColor, px, py);
        compositeLayers();
        if (glitterbombs) {
          const [sx, sy] = toScreenPos(px, py);
          explode(sx, sy, Math.max(1, Math.round(10 * zoom / 16)), [activeColor]);
        }
        break;
      }
      case 'eraser': {
        // Erase from the active colour's layer; underlying layers are revealed
        clearLayerPixel(activeColor, px, py);
        compositeLayers();
        break;
      }
      default: break;
    }
  }, [activeTool, activeColor, zoom, width, height, glitterbombs, setLayerPixel, clearLayerPixel, compositeLayers, toScreenPos]);

  // ─── Bresenham segment ────────────────────────────────────────────────────

  const drawBresenhamSegment = useCallback((
    from: [number, number],
    to: [number, number],
    emitGlitter = true,
  ) => {
    let [x0, y0] = from;
    const [x1, y1] = to;
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      if (x0 >= 0 && x0 < width && y0 >= 0 && y0 < height) {
        if (activeTool === 'pencil') {
          setLayerPixel(activeColor, x0, y0);
          if (emitGlitter && glitterbombs) {
            const [sx2, sy2] = toScreenPos(x0, y0);
            explode(sx2, sy2, Math.max(1, Math.round(5 * zoom / 16)), [activeColor]);
          }
        } else if (activeTool === 'eraser') {
          clearLayerPixel(activeColor, x0, y0);
        }
      }
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    compositeLayers();
  }, [activeTool, activeColor, zoom, width, height, glitterbombs, setLayerPixel, clearLayerPixel, compositeLayers, toScreenPos]);

  // ─── Mouse events ─────────────────────────────────────────────────────────

  const onMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const [px, py] = getPixelCoords(e);

    if (activeTool === 'fill') {
      const composite = ctx.getImageData(0, 0, width, height);
      const pixels = getFloodFillPixels(composite, px, py, width, height);
      const [r, g, b] = hexToRgba(activeColor);
      const layer = getOrCreateLayer(activeColor);
      for (const [fx, fy] of pixels) {
        const i = (fy * width + fx) * 4;
        layer.data[i]     = r;
        layer.data[i + 1] = g;
        layer.data[i + 2] = b;
        layer.data[i + 3] = 255;
      }
      compositeLayers();
      if (glitterbombs) {
        const [sx, sy] = toScreenPos(px, py);
        explode(sx, sy, Math.max(8, Math.round(28 * zoom / 16)), [activeColor]);
      }
      const layers = paletteRef.current.map(color => ({
        color,
        imageData: layersRef.current.get(color) ?? new ImageData(width, height),
      }));
      history.snapshot(layers, paletteRef.current);
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
      const snap = new Map<string, ImageData>();
      for (const [color, layer] of layersRef.current) {
        snap.set(color, new ImageData(new Uint8ClampedArray(layer.data), layer.width, layer.height));
      }
      workingSnapshot.current = snap;
    } else {
      shiftAnchor.current = null;
      workingSnapshot.current = null;
    }
    setPaintGlow({ px, py });
    drawAt(px, py);
  }, [activeTool, activeColor, width, height, glitterbombs, getPixelCoords, drawAt, toScreenPos, history, onColorPicked, onSnapshot, getOrCreateLayer, compositeLayers]);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const [px, py] = getPixelCoords(e);

    // Shift held — restore layer snapshot and draw straight line to current position
    if (isShiftHeld.current && shiftAnchor.current && workingSnapshot.current) {
      // Restore layers from snapshot
      for (const [color, snap] of workingSnapshot.current) {
        const layer = layersRef.current.get(color);
        if (layer) layer.data.set(snap.data);
        else layersRef.current.set(color, new ImageData(new Uint8ClampedArray(snap.data), snap.width, snap.height));
      }
      drawBresenhamSegment(shiftAnchor.current, [px, py], false); // no glitter during preview
      lastPixel.current = [px, py];
      if (px >= 0 && px < width && py >= 0 && py < height) {
        setPaintGlow({ px, py });
      }
      return;
    }

    if (waitingForEntry.current) {
      pendingEntryPixel.current = [px, py];
      waitingForEntry.current = false;
      return;
    }

    if (pendingEntryPixel.current) {
      const P1 = pendingEntryPixel.current;
      const P2: [number, number] = [px, py];
      const entryEdge = findEdgeIntersection(
        P1[0], P1[1],
        P1[0] - P2[0], P1[1] - P2[1],
        width, height,
      );
      drawBresenhamSegment(entryEdge, P1);
      drawBresenhamSegment(P1, P2);
      pendingEntryPixel.current = null;
      secondLastPixel.current = P1;
      lastPixel.current = P2;
    } else {
      const last = lastPixel.current;
      if (last) {
        drawBresenhamSegment(last, [px, py]);
        secondLastPixel.current = last;
        lastPixel.current = [px, py];
      }
    }

    if (px >= 0 && px < width && py >= 0 && py < height) {
      setPaintGlow({ px, py });
    }
  }, [width, height, getPixelCoords, drawBresenhamSegment]);

  const onMouseUp = useCallback(() => {
    if (!isDrawing.current) return;
    const committedAnchor = shiftAnchor.current;
    const committedEnd = lastPixel.current;
    isDrawing.current = false;
    lastPixel.current = null;
    secondLastPixel.current = null;
    pendingEntryPixel.current = null;
    waitingForEntry.current = false;
    setPaintGlow(null);
    const layers = paletteRef.current.map(color => ({
      color,
      imageData: layersRef.current.get(color) ?? new ImageData(width, height),
    }));
    history.snapshot(layers, paletteRef.current);
    onSnapshot?.();
    // Emit glitter burst along the committed shift-line
    if (glitterbombs && committedAnchor && committedEnd) {
      const dx = committedEnd[0] - committedAnchor[0];
      const dy = committedEnd[1] - committedAnchor[1];
      const len = Math.sqrt(dx * dx + dy * dy);
      const steps = Math.max(1, Math.min(5, Math.floor(len / 4)));
      for (let i = 0; i <= steps; i++) {
        const t = steps > 0 ? i / steps : 0;
        const bx = Math.round(committedAnchor[0] + dx * t);
        const by = Math.round(committedAnchor[1] + dy * t);
        const [sx, sy] = toScreenPos(bx, by);
        explode(sx, sy, Math.max(1, Math.round(8 * zoom / 16)), [activeColor]);
      }
    }
  }, [history, width, height, glitterbombs, zoom, activeColor, toScreenPos, onSnapshot]);

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
      {/* Pixel canvas — shows the composited result of all layers */}
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
          const last = lastPixel.current;
          const secondLast = secondLastPixel.current;
          if (last && secondLast) {
            const exitEdge = findEdgeIntersection(
              secondLast[0], secondLast[1],
              last[0] - secondLast[0], last[1] - secondLast[1],
              width, height,
            );
            drawBresenhamSegment(last, exitEdge);
          } else if (last) {
            const [ex, ey] = getPixelCoords(e);
            const exitEdge = findEdgeIntersection(
              last[0], last[1],
              ex - last[0], ey - last[1],
              width, height,
            );
            drawBresenhamSegment(last, exitEdge);
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
      {/* Paint halo */}
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

