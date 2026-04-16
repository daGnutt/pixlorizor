import React from 'react';
import type { Tool } from '../types';

interface Props {
  activeTool: Tool;
  showGrid: boolean;
  zoom: number;
  onToolChange: (tool: Tool) => void;
  onToggleGrid: () => void;
  onZoomChange: (zoom: number) => void;
}

const EraserIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polygon points="3,14 9,4 17,9 11,19" fill="#f472b6" stroke="currentColor" strokeWidth="1.2" />
    <polygon points="3,14 9,4 12,6 6,16" fill="#fbcfe8" stroke="currentColor" strokeWidth="0" />
    <line x1="3" y1="14" x2="11" y2="19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

type ToolDef = { id: Tool; label: string; icon: React.ReactNode; key: string };

const TOOLS: ToolDef[] = [
  { id: 'pencil', label: 'Pencil', icon: '✏️', key: 'P' },
  { id: 'eraser', label: 'Eraser', icon: <EraserIcon />, key: 'E' },
  { id: 'fill',   label: 'Fill',   icon: '🪣', key: 'F' },
  { id: 'picker', label: 'Picker', icon: '💧', key: 'C' },
];

export default function Toolbar({
  activeTool,
  showGrid,
  zoom,
  onToolChange,
  onToggleGrid,
  onZoomChange,
}: Props) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 bg-[var(--bg-panel)] border-r border-[var(--border-color)] w-14 shrink-0">
      {TOOLS.map(t => (
        <button
          key={t.id}
          title={`${t.label} (${t.key})`}
          onClick={() => onToolChange(t.id)}
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
        onClick={onToggleGrid}
        className={`tool-btn w-10 h-10 rounded text-xs font-bold
          ${showGrid
            ? 'tool-btn-active bg-[var(--accent)] text-white'
            : 'bg-[var(--bg-button)] text-[var(--text-muted)] hover:bg-[var(--bg-button-hover)]'}`}
      >
        ⊞
      </button>

      <hr className="w-8 border-[var(--border-color)] my-1" />

      {/* Zoom */}
      <span className="text-xs text-[var(--text-muted)]">{zoom}×</span>
      <input
        type="range"
        min={1}
        max={64}
        value={zoom}
        onChange={e => onZoomChange(Number(e.target.value))}
        className="w-10 accent-[var(--accent)]"
        style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 80 }}
        title={`Zoom: ${zoom}×`}
      />
    </div>
  );
}
