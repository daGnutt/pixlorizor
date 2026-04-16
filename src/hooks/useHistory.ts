import { useCallback, useRef } from 'react';
import type { LayerEntry } from '../types';

interface HistoryEntry {
  layers: LayerEntry[];   // deep copies of all layer ImageData values
  palette: string[];
}

export interface HistoryHandle {
  snapshot: (layers: LayerEntry[], palette: string[]) => void;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

const MAX_HISTORY = 50;

function deepCopyLayers(layers: LayerEntry[]): LayerEntry[] {
  return layers.map(({ color, imageData }) => ({
    color,
    imageData: new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height),
  }));
}

export function useHistory(): HistoryHandle {
  const stack = useRef<HistoryEntry[]>([]);
  const cursor = useRef<number>(-1);

  const snapshot = useCallback((layers: LayerEntry[], palette: string[]) => {
    stack.current = stack.current.slice(0, cursor.current + 1);
    stack.current.push({ layers: deepCopyLayers(layers), palette });
    if (stack.current.length > MAX_HISTORY) {
      stack.current.shift();
    }
    cursor.current = stack.current.length - 1;
  }, []);

  const undo = useCallback((): HistoryEntry | null => {
    if (cursor.current <= 0) return null;
    cursor.current -= 1;
    return stack.current[cursor.current];
  }, []);

  const redo = useCallback((): HistoryEntry | null => {
    if (cursor.current >= stack.current.length - 1) return null;
    cursor.current += 1;
    return stack.current[cursor.current];
  }, []);

  const canUndo = useCallback(() => cursor.current > 0, []);
  const canRedo = useCallback(() => cursor.current < stack.current.length - 1, []);

  const clear = useCallback(() => {
    stack.current = [];
    cursor.current = -1;
  }, []);

  return { snapshot, undo, redo, canUndo, canRedo, clear };
}
