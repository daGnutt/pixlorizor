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
      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors
        ${disabled
          ? 'text-gray-600 cursor-not-allowed'
          : 'text-gray-200 hover:bg-[#0f3460]'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-[#16213e] border-b border-[#0f3460] shrink-0">
      <span className="text-[#e94560] font-bold text-lg mr-4 select-none">Pixlorizor</span>
      {btn('New', onNew, false, 'New canvas')}
      <div className="w-px h-5 bg-[#0f3460] mx-1" />
      {btn('Undo', onUndo, !canUndo, 'Undo (Ctrl+Z)')}
      {btn('Redo', onRedo, !canRedo, 'Redo (Ctrl+Y)')}
      <div className="w-px h-5 bg-[#0f3460] mx-1" />
      {btn('Import PNG', onImport, false, 'Open a PNG file')}
      {btn('Export PNG', onExport, false, 'Download as PNG')}
    </div>
  );
}
