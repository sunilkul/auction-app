import React, { useRef, useState, useCallback } from 'react';
import { cn } from './cn';

interface Props {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  style?: React.CSSProperties;
}

export const SpotlightCard: React.FC<Props> = ({
  children,
  className = '',
  spotlightColor = 'rgba(245,158,11,0.12)',
  style,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [show, setShow] = useState(false);

  const handleMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      className={cn('relative overflow-hidden', className)}
      style={style}
    >
      {show && (
        <div
          className="pointer-events-none absolute rounded-full transition-opacity duration-300"
          style={{
            width:  400,
            height: 400,
            left:   pos.x - 200,
            top:    pos.y - 200,
            background: `radial-gradient(circle, ${spotlightColor}, transparent 70%)`,
          }}
        />
      )}
      {children}
    </div>
  );
};
