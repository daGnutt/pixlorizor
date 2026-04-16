import { useReducer, useRef, useCallback, useEffect, useState } from 'react';
import type { AppState, AppAction, CanvasSize } from './types';
import NewCanvasDialog from './components/NewCanvasDialog';
import PixelCanvas, { type CanvasHandle } from './components/Canvas';
import Toolbar from './components/Toolbar';
import ColorPicker from './components/ColorPicker';
import TopBar from './components/TopBar';
import { useHistory } from './hooks/useHistory';
import { exportPng } from './utils/exportPng';

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
    case 'TOGGLE_GRID': return { ...state, showGrid: !state.showGrid };
    case 'SET_ZOOM': return { ...state, zoom: action.zoom };
    default: return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [showNewDialog, setShowNewDialog] = useState(true);
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
          if (canvas) { history.undo(canvas); forceHistoryRefresh(); }
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
          e.preventDefault();
          const canvas = canvasRef.current?.getCanvas();
          if (canvas) { history.redo(canvas); forceHistoryRefresh(); }
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
    history.clear();
    setShowNewDialog(false);
    setTimeout(() => {
      const canvas = canvasRef.current?.getCanvas();
      if (canvas) history.snapshot(canvas);
    }, 0);
  }, [history]);

  const handleUndo = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) { history.undo(canvas); forceHistoryRefresh(); }
  }, [history, forceHistoryRefresh]);

  const handleRedo = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) { history.redo(canvas); forceHistoryRefresh(); }
  }, [history, forceHistoryRefresh]);

  const handleExport = useCallback(() => {
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) exportPng(canvas);
  }, []);

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
      }, 0);
    };
    img.src = url;
  }, [history]);

  const clampedZoom = Math.max(1, Math.min(
    state.zoom,
    state.canvasSize
      ? Math.floor(Math.min(
          (window.innerWidth - 80) / state.canvasSize.width,
          (window.innerHeight - 120) / state.canvasSize.height,
        ))
      : state.zoom,
  ));

  return (
    <div className="flex flex-col w-full h-full">
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

        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0d1117] p-4">
          {state.canvasSize ? (
            <PixelCanvas
              ref={canvasRef}
              width={state.canvasSize.width}
              height={state.canvasSize.height}
              zoom={clampedZoom}
              activeTool={state.activeTool}
              activeColor={state.activeColor}
              showGrid={state.showGrid}
              history={history}
              onColorPicked={color => dispatch({ type: 'SET_COLOR', color })}
            />
          ) : (
            <p className="text-gray-600 text-sm">Create a new canvas to start painting.</p>
          )}
        </div>
      </div>

      <ColorPicker
        activeColor={state.activeColor}
        palette={state.palette}
        onColorChange={c => dispatch({ type: 'SET_COLOR', color: c })}
        onAddToPalette={() => dispatch({ type: 'ADD_TO_PALETTE', color: state.activeColor })}
        onPaletteColorClick={c => dispatch({ type: 'SET_COLOR', color: c })}
        onRemoveFromPalette={i => dispatch({ type: 'REMOVE_FROM_PALETTE', index: i })}
      />

      {showNewDialog && (
        <NewCanvasDialog onConfirm={handleNewCanvas} />
      )}
    </div>
  );
}

