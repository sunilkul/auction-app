import React, { useRef, useEffect } from 'react';
import { cn } from './cn';

interface Props {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
  disabled?: boolean;
  borderColor?: string;
  as?: 'button' | 'div';
}

export const MovingBorderButton: React.FC<Props> = ({
  children,
  className = '',
  containerClassName = '',
  onClick,
  disabled = false,
  borderColor = '#f59e0b',
  as: Tag = 'button',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const tRef      = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (ts: number) => {
      tRef.current = ts;
      const w = canvas.width  = canvas.offsetWidth;
      const h = canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const t        = ts * 0.001;
      const perimeter= 2 * (w + h);
      const pos      = (t * 180 % perimeter);

      let px: number, py: number;
      if (pos < w)            { px = pos;          py = 0; }
      else if (pos < w + h)   { px = w;            py = pos - w; }
      else if (pos < 2 * w + h) { px = w - (pos - w - h); py = h; }
      else                    { px = 0;            py = h - (pos - 2 * w - h); }

      const grad = ctx.createRadialGradient(px, py, 0, px, py, 80);
      grad.addColorStop(0,    borderColor);
      grad.addColorStop(0.5,  borderColor + '88');
      grad.addColorStop(1,    'transparent');

      ctx.strokeStyle = grad;
      ctx.lineWidth   = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [borderColor]);

  return (
    <div className={cn('relative rounded-xl', containerClassName)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none rounded-xl"
        style={{ borderRadius: 'inherit' }}
      />
      <Tag
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'relative z-10 rounded-xl font-display tracking-widest uppercase font-bold',
          'transition-all duration-200',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
      >
        {children}
      </Tag>
    </div>
  );
};
