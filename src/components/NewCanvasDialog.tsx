import React, { useState } from 'react';
import type { CanvasSize } from '../types';

const PRESETS: CanvasSize[] = [
  { width: 16, height: 16 },
  { width: 32, height: 32 },
  { width: 64, height: 64 },
];

interface Props {
  onConfirm: (size: CanvasSize) => void;
}

export default function NewCanvasDialog({ onConfirm }: Props) {
  const [w, setW] = useState(32);
  const [h, setH] = useState(32);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const width = Math.max(1, Math.min(512, w));
    const height = Math.max(1, Math.min(512, h));
    onConfirm({ width, height });
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="bg-[#16213e] border border-[#0f3460] rounded-xl p-8 w-80 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-6">New Canvas</h2>

        <p className="text-sm text-gray-400 mb-3">Presets</p>
        <div className="flex gap-2 mb-6">
          {PRESETS.map(p => (
            <button
              key={`${p.width}x${p.height}`}
              onClick={() => { setW(p.width); setH(p.height); }}
              className={`flex-1 py-2 rounded text-sm font-medium border transition-colors
                ${w === p.width && h === p.height
                  ? 'bg-[#e94560] border-[#e94560] text-white'
                  : 'border-[#0f3460] text-gray-300 hover:border-[#e94560]'}`}
            >
              {p.width}×{p.height}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <p className="text-sm text-gray-400 mb-3">Custom size</p>
          <div className="flex gap-3 mb-6">
            <label className="flex-1">
              <span className="block text-xs text-gray-400 mb-1">Width</span>
              <input
                type="number"
                min={1}
                max={512}
                value={w}
                onChange={e => setW(Number(e.target.value))}
                className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e94560]"
              />
            </label>
            <label className="flex-1">
              <span className="block text-xs text-gray-400 mb-1">Height</span>
              <input
                type="number"
                min={1}
                max={512}
                value={h}
                onChange={e => setH(Number(e.target.value))}
                className="w-full bg-[#0f3460] border border-[#1a4a7a] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#e94560]"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-[#e94560] hover:bg-[#c73652] text-white rounded font-medium transition-colors"
          >
            Create Canvas
          </button>
        </form>
      </div>
    </div>
  );
}
