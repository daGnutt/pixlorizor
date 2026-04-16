import type { Tool } from '../types';

interface Props {
  activeTool: Tool;
  showGrid: boolean;
  zoom: number;
  onToolChange: (tool: Tool) => void;
  onToggleGrid: () => void;
  onZoomChange: (zoom: number) => void;
}

const TOOLS: { id: Tool; label: string; icon: string; key: string }[] = [
  { id: 'pencil', label: 'Pencil', icon: '✏️', key: 'P' },
  { id: 'eraser', label: 'Eraser', icon: '⬜', key: 'E' },
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
    <div className="flex flex-col items-center gap-1 p-2 bg-[#16213e] border-r border-[#0f3460] w-14 shrink-0">
      {TOOLS.map(t => (
        <button
          key={t.id}
          title={`${t.label} (${t.key})`}
          onClick={() => onToolChange(t.id)}
          className={`w-10 h-10 rounded text-lg transition-colors flex items-center justify-center
            ${activeTool === t.id
              ? 'bg-[#e94560] text-white'
              : 'bg-[#0f3460] text-gray-300 hover:bg-[#1a4a7a]'}`}
        >
          {t.icon}
        </button>
      ))}

      <hr className="w-8 border-[#0f3460] my-1" />

      {/* Grid toggle */}
      <button
        title="Toggle grid (G)"
        onClick={onToggleGrid}
        className={`w-10 h-10 rounded text-xs font-bold transition-colors
          ${showGrid
            ? 'bg-[#e94560] text-white'
            : 'bg-[#0f3460] text-gray-300 hover:bg-[#1a4a7a]'}`}
      >
        ⊞
      </button>

      <hr className="w-8 border-[#0f3460] my-1" />

      {/* Zoom */}
      <span className="text-xs text-gray-400">{zoom}×</span>
      <input
        type="range"
        min={1}
        max={32}
        value={zoom}
        onChange={e => onZoomChange(Number(e.target.value))}
        className="w-10 accent-[#e94560]"
        style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 80 }}
        title={`Zoom: ${zoom}×`}
      />
    </div>
  );
}
