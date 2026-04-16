import React, { useState } from 'react';
import type { CanvasSize } from '../types';

const PRESETS: CanvasSize[] = [
  { width: 16, height: 16 },
  { width: 32, height: 32 },
  { width: 64, height: 64 },
];

interface Props {
  onConfirm: (size: CanvasSize) => void;
  onCancel?: () => void;
}

export default function NewCanvasDialog({ onConfirm, onCancel }: Props) {
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
      <div className="bg-[var(--bg-panel)] border border-[var(--border-color)] rounded-xl p-8 w-80 shadow-2xl">
        <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">New Canvas</h2>

        <form onSubmit={submit}>
          <p className="text-sm text-[var(--text-muted)] mb-3">Presets</p>
          <div className="flex gap-2 mb-6">
            {PRESETS.map(p => (
              <button
                key={`${p.width}x${p.height}`}
                type="button"
                onClick={() => { setW(p.width); setH(p.height); }}
                className={`flex-1 py-2 rounded text-sm font-medium border transition-colors
                  ${w === p.width && h === p.height
                    ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                    : 'border-[var(--border-color)] text-[var(--text-primary)] hover:border-[var(--accent)]'}`}
              >
                {p.width}×{p.height}
              </button>
            ))}
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-3">Custom size</p>
          <div className="flex gap-3 mb-6">
            <label className="flex-1">
              <span className="block text-xs text-[var(--text-muted)] mb-1">Width</span>
              <input
                type="number"
                min={1}
                max={512}
                value={w}
                onChange={e => setW(Number(e.target.value))}
                className="w-full bg-[var(--bg-button)] border border-[var(--bg-button-hover)] rounded px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </label>
            <label className="flex-1">
              <span className="block text-xs text-[var(--text-muted)] mb-1">Height</span>
              <input
                type="number"
                min={1}
                max={512}
                value={h}
                onChange={e => setH(Number(e.target.value))}
                className="w-full bg-[var(--bg-button)] border border-[var(--bg-button-hover)] rounded px-3 py-2 text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </label>
          </div>
          <div className={`flex gap-3 ${onCancel ? 'flex-row' : ''}`}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 bg-[var(--bg-button)] hover:bg-[var(--bg-button-hover)] text-[var(--text-primary)] rounded font-medium transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              autoFocus
              type="submit"
              className={`py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded font-medium transition-colors ${onCancel ? 'flex-1' : 'w-full'}`}
            >
              Create Canvas
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
