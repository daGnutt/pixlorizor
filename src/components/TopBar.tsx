import React from 'react';
import { explode, GLITTER_COLORS } from '../utils/particles';

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onNew: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onImport: () => void;
}

const PixelLogoIcon = () => (
  <svg width="22" height="22" viewBox="0 0 4 4" style={{ imageRendering: 'pixelated' }} aria-hidden>
    <rect x="0" y="0" width="1" height="1" fill="#e94560" />
    <rect x="1" y="0" width="1" height="1" fill="#7c5cfc" />
    <rect x="2" y="0" width="1" height="1" fill="#00d4ff" />
    <rect x="3" y="0" width="1" height="1" fill="#ffd700" />
    <rect x="0" y="1" width="1" height="1" fill="#7c5cfc" />
    <rect x="1" y="1" width="1" height="1" fill="#e94560" />
    <rect x="2" y="1" width="1" height="1" fill="#ffd700" />
    <rect x="3" y="1" width="1" height="1" fill="#00d4ff" />
    <rect x="0" y="2" width="1" height="1" fill="#00d4ff" />
    <rect x="1" y="2" width="1" height="1" fill="#ffd700" />
    <rect x="2" y="2" width="1" height="1" fill="#e94560" />
    <rect x="3" y="2" width="1" height="1" fill="#7c5cfc" />
    <rect x="0" y="3" width="1" height="1" fill="#ffd700" />
    <rect x="1" y="3" width="1" height="1" fill="#00d4ff" />
    <rect x="2" y="3" width="1" height="1" fill="#7c5cfc" />
    <rect x="3" y="3" width="1" height="1" fill="#e94560" />
  </svg>
);

export default function TopBar({ canUndo, canRedo, onNew, onUndo, onRedo, onExport, onImport }: Props) {
  const handleLogoClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    explode(rect.left + rect.width / 2, rect.top + rect.height / 2, 50, GLITTER_COLORS);
  };

  const btn = (label: string, onClick: () => void, disabled = false, title?: string) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`topbar-btn px-3 py-1.5 rounded text-sm font-medium
        ${disabled
          ? 'text-[var(--text-subtle)] cursor-not-allowed'
          : 'text-[var(--text-primary)] hover:bg-[var(--bg-button)]'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-[var(--bg-panel)] border-b border-[var(--border-color)] shrink-0">
      <div className="logo-container mr-4" onClick={handleLogoClick} title="Pixlorizor ✨">
        <span className="logo-icon"><PixelLogoIcon /></span>
        <span className="logo-text">Pixlorizor</span>
      </div>
      {btn('New', onNew, false, 'New canvas')}
      <div className="w-px h-5 bg-[var(--border-color)] mx-1" />
      {btn('Undo', onUndo, !canUndo, 'Undo (Ctrl+Z)')}
      {btn('Redo', onRedo, !canRedo, 'Redo (Ctrl+Y)')}
      <div className="w-px h-5 bg-[var(--border-color)] mx-1" />
      {btn('Import PNG', onImport, false, 'Open a PNG file')}
      {btn('Export PNG', onExport, false, 'Download as PNG')}
    </div>
  );
}
