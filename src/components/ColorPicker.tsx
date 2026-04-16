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
    <div className="flex flex-col gap-3 p-3 bg-[#16213e] border-t border-[#0f3460]">
      {/* Active color */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-gray-400 shrink-0">Color</label>
        <input
          type="color"
          value={activeColor}
          onChange={e => onColorChange(e.target.value)}
          className="w-10 h-10 rounded cursor-pointer border-2 border-[#0f3460] bg-transparent"
          title="Active color"
        />
        <span className="text-xs font-mono text-gray-300 uppercase">{activeColor}</span>
        <button
          onClick={onAddToPalette}
          title="Add to palette"
          className="ml-auto text-xs px-2 py-1 bg-[#0f3460] hover:bg-[#1a4a7a] rounded text-gray-300 transition-colors"
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
                title={color}
                onClick={() => onPaletteColorClick(color)}
                onContextMenu={e => { e.preventDefault(); onRemoveFromPalette(i); }}
                className={`w-7 h-7 rounded border-2 transition-colors block
                  ${color === activeColor ? 'border-white' : 'border-transparent hover:border-gray-400'}`}
                style={{ background: color }}
              />
              <button
                title="Remove from palette"
                onClick={() => onRemoveFromPalette(i)}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gray-700 text-white text-[9px] leading-none items-center justify-center hidden group-hover:flex hover:bg-red-500 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {palette.length === 0 && (
        <p className="text-xs text-gray-600">No palette colors yet. Add some!</p>
      )}
    </div>
  );
}
