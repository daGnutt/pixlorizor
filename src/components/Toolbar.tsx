import React, { useRef } from 'react';
import type { Tool } from '../types';
import { explode, GLITTER_COLORS } from '../utils/particles';

interface Props {
  activeTool: Tool;
  showGrid: boolean;
  zoom: number;
  glitterbombs: boolean;
  onToolChange: (tool: Tool) => void;
  onToggleGrid: () => void;
  onZoomChange: (zoom: number) => void;
  onToggleGlitterbombs: () => void;
}

const EraserIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="3,14 9,4 17,9 11,19" fill="#f472b6" stroke="currentColor" strokeWidth="1.2" />
    <polygon points="3,14 9,4 12,6 6,16" fill="#fbcfe8" stroke="currentColor" strokeWidth="0" />
    <line x1="3" y1="14" x2="11" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PipetteIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10.5" y="3" width="3" height="7" rx="1" transform="rotate(45 10.5 3)" fill="currentColor" opacity="0.85" />
    <line x1="5.5" y1="14.5" x2="3" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="14.5" cy="4.5" r="2.2" fill="currentColor" opacity="0.7" />
    <path d="M4.5 15.5 Q3.5 16.8 4.5 17.5 Q5.5 16.8 4.5 15.5Z" fill="currentColor" opacity="0.9" />
  </svg>
);

type ToolDef = { id: Tool; label: string; icon: React.ReactNode; key: string };

const TOOLS: ToolDef[] = [
  { id: 'pencil', label: 'Pencil', icon: '✏️', key: 'P' },
  { id: 'eraser', label: 'Eraser', icon: <EraserIcon />, key: 'E' },
  { id: 'fill',   label: 'Fill',   icon: '🪣', key: 'F' },
  { id: 'picker', label: 'Picker', icon: <PipetteIcon />, key: 'C' },
];

const TOOL_COLORS: Record<Tool, string[]> = {
  pencil:  ['#e94560', '#ff8c42', '#ffd700', '#ffffff'],
  eraser:  ['#888888', '#aaaaaa', '#cccccc', '#ffffff'],
  fill:    ['#00d4ff', '#7c5cfc', '#e94560', '#ffd700'],
  picker:  ['#00d4ff', '#a8ff78', '#ffffff', '#7c5cfc'],
};

export default function Toolbar({
  activeTool,
  showGrid,
  zoom,
  glitterbombs,
  onToolChange,
  onToggleGrid,
  onZoomChange,
  onToggleGlitterbombs,
}: Props) {
  const zoomInputRef = useRef<HTMLInputElement>(null);

  const handleToolClick = (t: ToolDef, e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (glitterbombs) explode(rect.left + rect.width / 2, rect.top + rect.height / 2, 32, TOOL_COLORS[t.id]);
    onToolChange(t.id);
  };

  const handleGridToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (glitterbombs) explode(rect.left + rect.width / 2, rect.top + rect.height / 2, 22, ['#7c5cfc', '#00d4ff', '#e94560', '#ffd700']);
    onToggleGrid();
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = Number(e.target.value);
    const delta = Math.abs(newZoom - zoom);
    if (glitterbombs && delta > 0 && zoomInputRef.current) {
      const rect = zoomInputRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const count = Math.min(8 + delta * 2, 50);
      explode(cx, cy, count, GLITTER_COLORS);
    }
    onZoomChange(newZoom);
  };

  return (
    <div className="flex flex-col items-center gap-1 p-2 bg-[var(--bg-panel)] border-r border-[var(--border-color)] w-14 shrink-0">
      {TOOLS.map(t => (
        <button
          key={t.id}
          title={`${t.label} (${t.key})`}
          onClick={e => handleToolClick(t, e)}
          className={`tool-btn w-10 h-10 rounded text-lg flex items-center justify-center
            ${activeTool === t.id
              ? 'tool-btn-active bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-button)] text-[var(--text-muted)] hover:bg-[var(--bg-button-hover)]'}`}
        >
          {t.icon}
        </button>
      ))}

      <hr className="w-8 border-[var(--border-color)] my-1" />

      {/* Grid toggle */}
      <button
        title="Toggle grid (G)"
        onClick={handleGridToggle}
        className={`tool-btn w-10 h-10 rounded text-xs font-bold
          ${showGrid
            ? 'tool-btn-active bg-[var(--accent)] text-white'
            : 'bg-[var(--bg-button)] text-[var(--text-muted)] hover:bg-[var(--bg-button-hover)]'}`}
      >
        ⊞
      </button>

      <hr className="w-8 border-[var(--border-color)] my-1" />

      {/* Glitterbombs toggle */}
      <button
        title="Toggle glitterbombs"
        onClick={onToggleGlitterbombs}
        className={`tool-btn w-10 h-10 rounded text-lg
          ${glitterbombs
            ? 'tool-btn-active bg-[var(--accent)] text-white'
            : 'bg-[var(--bg-button)] text-[var(--text-muted)] hover:bg-[var(--bg-button-hover)]'}`}
      >
        ✨
      </button>

      <hr className="w-8 border-[var(--border-color)] my-1" />
      <span className="text-xs text-[var(--text-muted)]">{zoom}×</span>
      <input
        ref={zoomInputRef}
        type="range"
        min={1}
        max={64}
        value={zoom}
        onChange={handleZoomChange}
        className="w-10 accent-[var(--accent)]"
        style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 80 }}
        title={`Zoom: ${zoom}×`}
      />
    </div>
  );
}
