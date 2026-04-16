import { useCallback, useRef } from 'react';

interface HistoryEntry {
  imageData: ImageData;
  palette: string[];
}

export interface HistoryHandle {
  snapshot: (canvas: HTMLCanvasElement, palette: string[]) => void;
  undo: (canvas: HTMLCanvasElement) => string[] | null;
  redo: (canvas: HTMLCanvasElement) => string[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

const MAX_HISTORY = 50;

export function useHistory(): HistoryHandle {
  const stack = useRef<HistoryEntry[]>([]);
  const cursor = useRef<number>(-1);

  const snapshot = useCallback((canvas: HTMLCanvasElement, palette: string[]) => {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Drop any redo entries ahead of cursor
    stack.current = stack.current.slice(0, cursor.current + 1);
    stack.current.push({ imageData, palette });
    if (stack.current.length > MAX_HISTORY) {
      stack.current.shift();
    }
    cursor.current = stack.current.length - 1;
  }, []);

  const undo = useCallback((canvas: HTMLCanvasElement): string[] | null => {
    if (cursor.current <= 0) return null;
    cursor.current -= 1;
    const entry = stack.current[cursor.current];
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(entry.imageData, 0, 0);
    return entry.palette;
  }, []);

  const redo = useCallback((canvas: HTMLCanvasElement): string[] | null => {
    if (cursor.current >= stack.current.length - 1) return null;
    cursor.current += 1;
    const entry = stack.current[cursor.current];
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(entry.imageData, 0, 0);
    return entry.palette;
  }, []);

  const canUndo = useCallback(() => cursor.current > 0, []);
  const canRedo = useCallback(() => cursor.current < stack.current.length - 1, []);

  const clear = useCallback(() => {
    stack.current = [];
    cursor.current = -1;
  }, []);

  return { snapshot, undo, redo, canUndo, canRedo, clear };
}
