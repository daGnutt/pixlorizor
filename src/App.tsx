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
  glitterbombs: true,
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
    case 'TOGGLE_GLITTERBOMBS': return { ...state, glitterbombs: !state.glitterbombs };
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
          const entry = history.undo();
          if (entry) {
            canvasRef.current?.setLayers(entry.layers);
            dispatch({ type: 'SET_PALETTE', palette: entry.palette });
            forceHistoryRefresh();
          }
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
          e.preventDefault();
          const entry = history.redo();
          if (entry) {
            canvasRef.current?.setLayers(entry.layers);
            dispatch({ type: 'SET_PALETTE', palette: entry.palette });
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
      const layers = canvasRef.current?.getLayers() ?? DEFAULT_PALETTE.map(color => ({ color, imageData: new ImageData(size.width, size.height) }));
      history.snapshot(layers, DEFAULT_PALETTE);
    }, 0);
  }, [history]);

  const handleUndo = useCallback(() => {
    const entry = history.undo();
    if (entry) {
      canvasRef.current?.setLayers(entry.layers);
      dispatch({ type: 'SET_PALETTE', palette: entry.palette });
      forceHistoryRefresh();
    }
  }, [history, forceHistoryRefresh]);

  const handleRedo = useCallback(() => {
    const entry = history.redo();
    if (entry) {
      canvasRef.current?.setLayers(entry.layers);
      dispatch({ type: 'SET_PALETTE', palette: entry.palette });
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
    const layers = canvasRef.current?.getLayers() ?? newPalette.map(c => ({ color: c, imageData: new ImageData(state.canvasSize!.width, state.canvasSize!.height) }));
    history.snapshot(layers, newPalette);
    forceHistoryRefresh();
  }, [state.palette, state.canvasSize, history, forceHistoryRefresh]);

  const handlePaletteColorEdit = useCallback((index: number, newColor: string) => {
    const oldColor = state.palette[index];
    if (newColor === oldColor) return;
    const newPalette = state.palette.map((c, i) => i === index ? newColor : c);
    canvasRef.current?.replaceColor(oldColor, newColor);
    dispatch({ type: 'UPDATE_PALETTE_COLOR', index, oldColor, newColor });
    const layers = canvasRef.current?.getLayers() ?? newPalette.map(c => ({ color: c, imageData: new ImageData(state.canvasSize!.width, state.canvasSize!.height) }));
    history.snapshot(layers, newPalette);
    forceHistoryRefresh();
  }, [state.palette, state.canvasSize, history, forceHistoryRefresh]);

  const handleReorderPalette = useCallback((from: number, to: number) => {
    if (from === to) return;
    const newPalette = [...state.palette];
    const [moved] = newPalette.splice(from, 1);
    newPalette.splice(to, 0, moved);
    dispatch({ type: 'SET_PALETTE', palette: newPalette });
    const layers = canvasRef.current?.getLayers() ?? newPalette.map(c => ({ color: c, imageData: new ImageData(state.canvasSize!.width, state.canvasSize!.height) }));
    history.snapshot(layers, newPalette);
    forceHistoryRefresh();
  }, [state.palette, state.canvasSize, history, forceHistoryRefresh]);

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
          const layers = canvasRef.current?.getLayers() ?? palette.map(color => ({ color, imageData: new ImageData(newSize.width, newSize.height) }));
          history.snapshot(layers, palette);
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
        glitterbombs={state.glitterbombs}
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
          glitterbombs={state.glitterbombs}
          onToolChange={t => dispatch({ type: 'SET_TOOL', tool: t })}
          onToggleGrid={() => dispatch({ type: 'TOGGLE_GRID' })}
          onZoomChange={z => dispatch({ type: 'SET_ZOOM', zoom: z })}
          onToggleGlitterbombs={() => dispatch({ type: 'TOGGLE_GLITTERBOMBS' })}
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
              glitterbombs={state.glitterbombs}
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
          const paletteIndex = state.palette.indexOf(state.activeColor);
          if (paletteIndex !== -1) {
            handlePaletteColorEdit(paletteIndex, c);
          } else {
            dispatch({ type: 'SET_COLOR', color: c });
          }
        }}
        onAddToPalette={() => {
          const randomColor = '#' + Math.floor(Math.random() * 0xFFFFFF).toString(16).padStart(6, '0');
          dispatch({ type: 'ADD_TO_PALETTE', color: randomColor });
          dispatch({ type: 'SET_COLOR', color: randomColor });
        }}
        onPaletteColorClick={c => dispatch({ type: 'SET_COLOR', color: c })}
        onRemoveFromPalette={handleRemoveFromPalette}
        onReorderPalette={handleReorderPalette}
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

