import React, { useEffect, useRef } from 'react';

const FW_COLORS = ['#00D97E', '#FFD700', '#00E5FF', '#FF6B6B', '#FFFFFF', '#FF69B4', '#A78BFA', '#FFA500'];

interface FWParticle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; decay: number;
  color: string; size: number;
  trail: { x: number; y: number }[];
}

const FireworksCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles: FWParticle[] = [];

    const burst = (x: number, y: number) => {
      const count = 90 + Math.floor(Math.random() * 30);
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = 3 + Math.random() * 7;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 1,
          decay: 0.012 + Math.random() * 0.010,
          color: FW_COLORS[Math.floor(Math.random() * FW_COLORS.length)],
          size: 2.5 + Math.random() * 2.5,
          trail: [],
        });
      }
    };

    const schedule: [number, number, number][] = [
      [200,  0.5, 0.22], [550,  0.25, 0.18], [550,  0.75, 0.18],
      [900,  0.5, 0.35], [1150, 0.15, 0.28], [1150, 0.85, 0.28],
      [1500, 0.35, 0.15], [1500, 0.65, 0.15],
      [1900, 0.5, 0.25], [2200, 0.3, 0.32], [2200, 0.7, 0.32],
    ];
    const timers = schedule.map(([delay, fx, fy]) =>
      window.setTimeout(() => burst(canvas.width * fx, canvas.height * fy), delay)
    );

    let animId: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 5) p.trail.shift();

        p.x  += p.vx;
        p.y  += p.vy;
        p.vy += 0.12;
        p.vx *= 0.97;
        p.life -= p.decay;

        if (p.life <= 0) { particles.splice(i, 1); continue; }

        for (let t = 0; t < p.trail.length; t++) {
          const alpha = (t / p.trail.length) * p.life * 0.4;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.trail[t].x, p.trail[t].y, p.size * 0.5 * (t / p.trail.length), 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
  );
};

export default FireworksCanvas;
