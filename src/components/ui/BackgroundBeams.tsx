import React, { useRef, useEffect, useCallback } from 'react';

interface Beam {
  x: number;
  y: number;
  width: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

export const BackgroundBeams: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const beamsRef  = useRef<Beam[]>([]);
  const startRef  = useRef<number>(0);

  const colors = ['rgba(245,158,11,', 'rgba(56,189,248,', 'rgba(129,140,248,', 'rgba(52,211,153,'];

  const makeBeam = useCallback((w: number, h: number): Beam => ({
    x:        Math.random() * w,
    y:        -h * 0.3,
    width:    Math.random() * 2 + 0.5,
    duration: Math.random() * 4000 + 3000,
    delay:    Math.random() * 5000,
    opacity:  Math.random() * 0.4 + 0.1,
    color:    colors[Math.floor(Math.random() * colors.length)],
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      beamsRef.current = Array.from({ length: 20 }, () => makeBeam(canvas.width, canvas.height));
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      beamsRef.current.forEach(b => {
        const elapsed = (ts - startRef.current - b.delay) % (b.duration + b.delay);
        if (elapsed < 0) return;
        const progress = elapsed / b.duration;
        const yPos     = -canvas.height * 0.3 + progress * canvas.height * 1.6;

        const grad = ctx.createLinearGradient(b.x, yPos, b.x, yPos + canvas.height * 0.4);
        grad.addColorStop(0,   b.color + '0)');
        grad.addColorStop(0.3, b.color + b.opacity + ')');
        grad.addColorStop(0.7, b.color + b.opacity + ')');
        grad.addColorStop(1,   b.color + '0)');

        ctx.beginPath();
        ctx.moveTo(b.x, yPos);
        ctx.lineTo(b.x, yPos + canvas.height * 0.4);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = b.width;
        ctx.stroke();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [makeBeam]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
};
