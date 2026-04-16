import { useCallback, useRef } from 'react';

export interface HistoryHandle {
  snapshot: (canvas: HTMLCanvasElement) => void;
  undo: (canvas: HTMLCanvasElement) => void;
  redo: (canvas: HTMLCanvasElement) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

const MAX_HISTORY = 50;

export function useHistory(): HistoryHandle {
  const stack = useRef<ImageData[]>([]);
  const cursor = useRef<number>(-1);

  const snapshot = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d')!;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Drop any redo entries ahead of cursor
    stack.current = stack.current.slice(0, cursor.current + 1);
    stack.current.push(data);
    if (stack.current.length > MAX_HISTORY) {
      stack.current.shift();
    }
    cursor.current = stack.current.length - 1;
  }, []);

  const undo = useCallback((canvas: HTMLCanvasElement) => {
    if (cursor.current <= 0) return;
    cursor.current -= 1;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(stack.current[cursor.current], 0, 0);
  }, []);

  const redo = useCallback((canvas: HTMLCanvasElement) => {
    if (cursor.current >= stack.current.length - 1) return;
    cursor.current += 1;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(stack.current[cursor.current], 0, 0);
  }, []);

  const canUndo = useCallback(() => cursor.current > 0, []);
  const canRedo = useCallback(() => cursor.current < stack.current.length - 1, []);

  const clear = useCallback(() => {
    stack.current = [];
    cursor.current = -1;
  }, []);

  return { snapshot, undo, redo, canUndo, canRedo, clear };
}
