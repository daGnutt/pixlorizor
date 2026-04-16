export type Tool = 'pencil' | 'eraser' | 'fill' | 'picker';

export interface CanvasSize {
  width: number;
  height: number;
}

export type RgbaColor = [number, number, number, number];

export interface AppState {
  canvasSize: CanvasSize | null;
  activeTool: Tool;
  activeColor: string; // hex string e.g. "#ff0000"
  palette: string[];   // array of hex colors
  showGrid: boolean;
  zoom: number;        // 1..32
}

export type AppAction =
  | { type: 'SET_CANVAS_SIZE'; size: CanvasSize }
  | { type: 'SET_TOOL'; tool: Tool }
  | { type: 'SET_COLOR'; color: string }
  | { type: 'ADD_TO_PALETTE'; color: string }
  | { type: 'REMOVE_FROM_PALETTE'; index: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'SET_ZOOM'; zoom: number };
