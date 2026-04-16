interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onNew: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onImport: () => void;
}

export default function TopBar({ canUndo, canRedo, onNew, onUndo, onRedo, onExport, onImport }: Props) {
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
      <span className="text-[var(--accent)] font-bold text-lg mr-4 select-none">Pixlorizor</span>
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
