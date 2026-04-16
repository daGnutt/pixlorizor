import { useReducer, useRef, useCallback, useEffect, useState } from 'react';
import type { AppState, AppAction, CanvasSize } from './types';
import NewCanvasDialog from './components/NewCanvasDialog';
import PixelCanvas, { type CanvasHandle } from './components/Canvas';
import Toolbar from './components/Toolbar';
import ColorPicker from './components/ColorPicker';
import TopBar from './components/TopBar';
import ParticleOverlay from './components/ParticleOverlay';
import { useHistory } from './hooks/useHistory';
import { exportPng } from './utils/exportPng';
import { extractPalette } from './utils/colorUtils';

const DEFAULT_PALETTE = ['#e94560', '#ffffff', '#000000', '#ff9900', '#00c9a7', '#5e60ce'];

const initialState: AppState = {
  canvasSize: null,
  activeTool: 'pencil',
  activeColor: '#e94560',
  palette: DEFAULT_PALETTE,
  showGrid: true,
  zoom: 16,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_CANVAS_SIZE': return { ...state, canvasSize: action.size };
    case 'SET_TOOL': return { ...state, activeTool: action.tool };
    case 'SET_COLOR': return { ...state, activeColor: action.color };
    case 'ADD_TO_PALETTE':
      if (state.palette.includes(action.color)) return state;
      return { ...state, palette: [...state.palette, action.color] };
    case 'REMOVE_FROM_PALETTE':
      return { ...state, palette: state.palette.filter((_, i) => i !== action.index) };
    case 'UPDATE_PALETTE_COLOR': {
      const { index, oldColor, newColor } = action;
      if (newColor === oldColor) return state;
      if (state.palette.includes(newColor)) return state; // keep uniqueness
      const palette = state.palette.map((c, i) => i === index ? newColor : c);
      const activeColor = state.activeColor === oldColor ? newColor : state.activeColor;
      return { ...state, palette, activeColor };
    }
    case 'SET_PALETTE':
      return { ...state, palette: action.palette };
    case 'TOGGLE_GRID': return { ...state, showGrid: !state.showGrid };
    case 'SET_ZOOM': return { ...state, zoom: action.zoom };
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showNewDialog, setShowNewDialog] = useState(true);
  const [canvasKey, setCanvasKey] = useState(0);
  const [, setHistoryVersion] = useState(0);
  const canvasRef = useRef<CanvasHandle>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const history = useHistory();

  const forceHistoryRefresh = useCallback(() => setHistoryVersion(v => v + 1), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          const canvas = canvasRef.current?.getCanvas();
          if (canvas) {
            const palette = history.undo(canvas);
            if (palette) dispatch({ type: 'SET_PALETTE', palette });
            forceHistoryRefresh();
          }
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
          e.preventDefault();
          const canvas = canvasRef.current?.getCanvas();
          if (canvas) {
            const palette = history.redo(canvas);
            if (palette) dispatch({ type: 'SET_PALETTE', palette });
            forceHistoryRefresh();
          }
        }
        return;
      }

      switch (e.key.toUpperCase()) {
        case 'P': dispatch({ type: 'SET_TOOL', tool: 'pencil' }); break;
        case 'E': dispatch({ type: 'SET_TOOL', tool: 'eraser' }); break;
        case 'F': dispatch({ type: 'SET_TOOL', tool: 'fill' }); break;
        case 'C': dispatch({ type: 'SET_TOOL', tool: 'picker' }); break;
        case 'G': dispatch({ type: 'TOGGLE_GRID' }); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [history, forceHistoryRefresh]);

  const handleNewCanvas = useCallback((size: CanvasSize) => {
    dispatch({ type: 'SET_CANVAS_SIZE', size });
    dispatch({ type: 'SET_PALETTE', palette: DEFAULT_PALETTE });
    dispatch({ type: 'SET_COLOR', color: DEFAULT_PALETTE[0] });
    history.clear();
    setShowNewDialog(false);
    setCanvasKey(k => k + 1);
    setTimeout(() => {
      const canvas = canvasRef.current?.getCanvas();
      if (canvas) history.snapshot(canvas, DEFAULT_PALETTE);
    }, 0);
  }, [history]);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) {
      const palette = history.undo(canvas);
      if (palette) dispatch({ type: 'SET_PALETTE', palette });
      forceHistoryRefresh();
    }
  }, [history, forceHistoryRefresh]);

  const handleRedo = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) {
      const palette = history.redo(canvas);
      if (palette) dispatch({ type: 'SET_PALETTE', palette });
      forceHistoryRefresh();
    }
  }, [history, forceHistoryRefresh]);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) exportPng(canvas);
  }, []);

  const handleRemoveFromPalette = useCallback((index: number) => {
    const color = state.palette[index];
    const newPalette = state.palette.filter((_, i) => i !== index);
    canvasRef.current?.eraseColor(color);
    dispatch({ type: 'REMOVE_FROM_PALETTE', index });
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) { history.snapshot(canvas, newPalette); forceHistoryRefresh(); }
  }, [state.palette, history, forceHistoryRefresh]);

  const handlePaletteColorEdit = useCallback((index: number, newColor: string) => {
    const oldColor = state.palette[index];
    if (newColor === oldColor) return;
    const newPalette = state.palette.map((c, i) => i === index ? newColor : c);
    canvasRef.current?.replaceColor(oldColor, newColor);
    dispatch({ type: 'UPDATE_PALETTE_COLOR', index, oldColor, newColor });
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) { history.snapshot(canvas, newPalette); forceHistoryRefresh(); }
  }, [state.palette, history, forceHistoryRefresh]);

  const handleImportClick = useCallback(() => {
    importInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const newSize: CanvasSize = { width: img.naturalWidth, height: img.naturalHeight };
      dispatch({ type: 'SET_CANVAS_SIZE', size: newSize });
      history.clear();
      setShowNewDialog(false);
      setTimeout(() => {
        canvasRef.current?.loadImageData(img);
        URL.revokeObjectURL(url);
        const canvas = canvasRef.current?.getCanvas();
        if (canvas) {
          const palette = extractPalette(canvas);
          dispatch({ type: 'SET_PALETTE', palette });
          dispatch({ type: 'SET_COLOR', color: palette[0] ?? DEFAULT_PALETTE[0] });
          history.snapshot(canvas, palette);
        }
      }, 0);
    };
    img.src = url;
  }, [history]);

  const clampedZoom = Math.max(1, state.zoom);

  return (
    <div className="flex flex-col w-full h-full">
      <ParticleOverlay />
      <TopBar
        canUndo={history.canUndo()}
        canRedo={history.canRedo()}
        onNew={() => setShowNewDialog(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onExport={handleExport}
        onImport={handleImportClick}
      />
      <input
        ref={importInputRef}
        type="file"
        accept="image/png"
        className="hidden"
        onChange={handleImportFile}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          activeTool={state.activeTool}
          showGrid={state.showGrid}
          zoom={clampedZoom}
          onToolChange={t => dispatch({ type: 'SET_TOOL', tool: t })}
          onToggleGrid={() => dispatch({ type: 'TOGGLE_GRID' })}
          onZoomChange={z => dispatch({ type: 'SET_ZOOM', zoom: z })}
        />

        <div className="flex-1 overflow-auto bg-[var(--canvas-bg)]">
          <div className="min-w-full min-h-full flex items-center justify-center p-4">
          {state.canvasSize ? (
            <PixelCanvas
              key={canvasKey}
              ref={canvasRef}
              width={state.canvasSize.width}
              height={state.canvasSize.height}
              zoom={clampedZoom}
              activeTool={state.activeTool}
              activeColor={state.activeColor}
              palette={state.palette}
              showGrid={state.showGrid}
              history={history}
              onColorPicked={color => dispatch({ type: 'SET_COLOR', color })}
              onSnapshot={forceHistoryRefresh}
            />
          ) : (
            <p className="text-[var(--text-subtle)] text-sm">Create a new canvas to start painting.</p>
          )}
          </div>
        </div>
      </div>

      <ColorPicker
        activeColor={state.activeColor}
        palette={state.palette}
        onColorChange={c => {
          dispatch({ type: 'SET_COLOR', color: c });
          if (!state.palette.includes(c)) dispatch({ type: 'ADD_TO_PALETTE', color: c });
        }}
        onAddToPalette={() => dispatch({ type: 'ADD_TO_PALETTE', color: state.activeColor })}
        onPaletteColorClick={c => dispatch({ type: 'SET_COLOR', color: c })}
        onRemoveFromPalette={handleRemoveFromPalette}
        onPaletteColorEdit={handlePaletteColorEdit}
      />

      {showNewDialog && (
        <NewCanvasDialog
          onConfirm={handleNewCanvas}
          onCancel={state.canvasSize ? () => setShowNewDialog(false) : undefined}
        />
      )}
    </div>
  );
}

