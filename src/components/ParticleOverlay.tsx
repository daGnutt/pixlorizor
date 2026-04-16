import { useEffect, useRef, useCallback } from 'react';
import { registerEmitter } from '../utils/particles';
import type { Particle } from '../utils/particles';

const MAX_PARTICLES = 800;

function drawStar(ctx: CanvasRenderingContext2D, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const outer = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const inner = outer + Math.PI / 5;
    if (i === 0) ctx.moveTo(Math.cos(outer) * size, Math.sin(outer) * size);
    else ctx.lineTo(Math.cos(outer) * size, Math.sin(outer) * size);
    ctx.lineTo(Math.cos(inner) * (size * 0.42), Math.sin(inner) * (size * 0.42));
  }
  ctx.closePath();
  ctx.fill();
}

export default function ParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);

  const addParticles = useCallback((x: number, y: number, count: number, colors: string[]) => {
    for (let i = 0; i < count; i++) {
      if (particlesRef.current.length >= MAX_PARTICLES) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 9;
      const life = 50 + Math.random() * 50;
      const shapes = ['square', 'diamond', 'circle', 'star'] as const;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 5,
        life, maxLife: life,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2.5 + Math.random() * 5.5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.38,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
      });
    }
  }, []);

  useEffect(() => {
    registerEmitter(addParticles);
  }, [addParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const loop = () => {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;   // gravity
        p.vx *= 0.985; // air drag
        p.life--;
        p.rotation += p.rotSpeed;

        const alpha = Math.pow(p.life / p.maxLife, 0.65);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        const s = p.size;
        switch (p.shape) {
          case 'square':
            ctx.fillRect(-s / 2, -s / 2, s, s);
            break;
          case 'diamond':
            ctx.beginPath();
            ctx.moveTo(0, -s); ctx.lineTo(s * 0.65, 0);
            ctx.lineTo(0, s); ctx.lineTo(-s * 0.65, 0);
            ctx.closePath();
            ctx.fill();
            break;
          case 'circle':
            ctx.beginPath();
            ctx.arc(0, 0, s * 0.55, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'star':
            drawStar(ctx, s * 0.72);
            break;
        }
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}
    />
  );
}
