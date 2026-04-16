interface Props {
  activeColor: string;
  palette: string[];
  onColorChange: (color: string) => void;
  onAddToPalette: () => void;
  onPaletteColorClick: (color: string) => void;
  onRemoveFromPalette: (index: number) => void;
}

export default function ColorPicker({
  activeColor,
  palette,
  onColorChange,
  onAddToPalette,
  onPaletteColorClick,
  onRemoveFromPalette,
}: Props) {
  return (
    <div className="flex flex-col gap-3 p-3 bg-[var(--bg-panel)] border-t border-[var(--border-color)]">
      {/* Active color — click to open colour picker and edit the selected palette chip */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-[var(--text-muted)] shrink-0">Color</label>
        <input
          type="color"
          value={activeColor}
          onChange={e => onColorChange(e.target.value)}
          className="color-input-glow w-10 h-10 rounded cursor-pointer border-2 border-[var(--border-color)] bg-transparent"
          title="Click to edit active colour"
        />
        <span className="text-xs font-mono text-[var(--text-primary)] uppercase">{activeColor}</span>
        <button
          onClick={onAddToPalette}
          title="Add a new random colour to the palette"
          className="ml-auto text-xs px-2 py-1 bg-[var(--bg-button)] hover:bg-[var(--bg-button-hover)] rounded text-[var(--text-muted)] transition-colors"
        >
          + Palette
        </button>
      </div>

      {/* Palette */}
      {palette.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {palette.map((color, i) => (
            <div key={i} className="relative group">
              <button
                title={`${color} — click to select`}
                onClick={() => onPaletteColorClick(color)}
                onContextMenu={e => { e.preventDefault(); onRemoveFromPalette(i); }}
                className={`swatch-btn w-7 h-7 rounded border-2 block
                  ${color === activeColor ? 'border-white' : 'border-[var(--border-color)]'}`}
                style={{ background: color, ['--swatch-color' as string]: color }}
              />
              <button
                title="Remove from palette"
                onClick={() => onRemoveFromPalette(i)}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--bg-button)] text-[var(--text-primary)] text-[10px] font-bold leading-none items-center justify-center hidden group-hover:flex hover:bg-red-500 hover:text-white transition-colors z-20"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {palette.length === 0 && (
        <p className="text-xs text-[var(--text-subtle)]">No palette colours yet. Add some!</p>
      )}
    </div>
  );
}
