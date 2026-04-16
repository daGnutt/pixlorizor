export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  color: string; size: number;
  rotation: number; rotSpeed: number;
  shape: 'square' | 'diamond' | 'circle' | 'star';
}

export const GLITTER_COLORS = [
  '#e94560', '#7c5cfc', '#00d4ff', '#ffd700',
  '#ff69b4', '#ffffff', '#ff8c42', '#a8ff78',
];

type Emitter = (x: number, y: number, count: number, colors: string[]) => void;
let _emitter: Emitter | null = null;

export function registerEmitter(fn: Emitter) {
  _emitter = fn;
}

export function explode(x: number, y: number, count = 28, colors = GLITTER_COLORS) {
  _emitter?.(x, y, count, colors);
}
