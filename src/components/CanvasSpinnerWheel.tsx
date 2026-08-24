import React, { useRef, useEffect } from 'react';

interface CanvasSpinnerWheelProps {
  items: { id: number; name: string }[];
  selectedIndex: number | null;
  spinning: boolean;
  size?: number;
}

const COLORS = [
  '#1976d2', '#009688', '#ff9800', '#e91e63', '#8bc34a', '#f44336', '#3f51b5', '#00bcd4', '#ffc107', '#9c27b0'
];

function getSliceColor(idx: number) {
  return COLORS[idx % COLORS.length];
}

const spinDuration = 3200; // ms
const spinEasing = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

const CanvasSpinnerWheel: React.FC<CanvasSpinnerWheelProps> = ({ items, selectedIndex, spinning, size = 320 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startRotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const lastSelectedRef = useRef<number | null>(null);

  // Calculate the target rotation
  useEffect(() => {
    if (spinning && selectedIndex !== null) {
      const angle = 360 / items.length;
      // Always spin at least 1.5 turns for drama
      const minSpins = 1.5;
      const target = 360 * minSpins + angle * selectedIndex;
      startRotationRef.current = lastSelectedRef.current !== null ? angle * lastSelectedRef.current : 0;
      targetRotationRef.current = target;
      startTimeRef.current = performance.now();
      animate();
    }
    // eslint-disable-next-line
  }, [spinning, selectedIndex]);

  // Draw the wheel
  const drawWheel = (ctx: CanvasRenderingContext2D, rotation: number) => {
    const r = size / 2;
    ctx.clearRect(0, 0, size, size);
    const angle = 2 * Math.PI / items.length;
    // Draw slices
    for (let i = 0; i < items.length; i++) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(r, r);
      ctx.arc(r, r, r - 2, angle * i - Math.PI / 2, angle * (i + 1) - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = getSliceColor(i);
      ctx.fill();
      ctx.restore();
    }
    // Draw labels upright and centered in each triangle (like SpinnerWheel)
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < items.length; i++) {
      let fontSize = 15;
      let label = items[i].name;
      // Center of triangle segment
      const labelAngleDeg = (angle * i + angle / 2) * 180 / Math.PI - 90 + (rotation);
      const labelAngle = labelAngleDeg * (Math.PI / 180);
      const labelRadius = r * 0.48;
      const x = r + labelRadius * Math.cos(labelAngle);
      const y = r + labelRadius * Math.sin(labelAngle);
      // Fit label width to triangle arc
      const maxWidth = r * angle * 0.85;
      ctx.font = `bold ${fontSize}px sans-serif`;
      while (fontSize > 10 && ctx.measureText(label).width > maxWidth) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px sans-serif`;
      }
      if (ctx.measureText(label).width > maxWidth) {
        let ellipsis = '...';
        let maxLen = label.length;
        while (maxLen > 0 && ctx.measureText(label.slice(0, maxLen) + ellipsis).width > maxWidth) {
          maxLen--;
        }
        label = label.slice(0, maxLen) + ellipsis;
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(labelAngleDeg);
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.strokeText(label, 0, 0);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    // Draw center circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r * 0.12, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
    // Draw selected label in center (like SpinnerWheel)
    if (selectedIndex !== null && items[selectedIndex]) {
      ctx.save();
      ctx.font = `bold ${Math.floor(r * 0.13)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#222';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 6;
      let label = items[selectedIndex].name;
      // Truncate if too long
      let maxWidth = r * 0.22 * 2;
      if (ctx.measureText(label).width > maxWidth) {
        let ellipsis = '...';
        let maxLen = label.length;
        while (maxLen > 0 && ctx.measureText(label.slice(0, maxLen) + ellipsis).width > maxWidth) {
          maxLen--;
        }
        label = label.slice(0, maxLen) + ellipsis;
      }
      ctx.fillText(label, r, r);
      ctx.restore();
    }
  };

  // Animation loop
  const animate = () => {
    const now = performance.now();
    const elapsed = now - startTimeRef.current;
    let t = Math.min(elapsed / spinDuration, 1);
    t = spinEasing(t);
    const rotation = startRotationRef.current + (targetRotationRef.current - startRotationRef.current) * t;
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) drawWheel(ctx, rotation);
    if (t < 1) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      lastSelectedRef.current = selectedIndex;
    }
  };

  // Redraw on prop change (not spinning)
  useEffect(() => {
    if (!spinning) {
      const angle = 360 / items.length;
      const rotation = selectedIndex !== null ? angle * selectedIndex : 0;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) drawWheel(ctx, rotation);
      lastSelectedRef.current = selectedIndex;
    }
    // eslint-disable-next-line
  }, [spinning, selectedIndex, items, size]);

  // Clean up animation frame
  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: 24 }}>
      <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: '50%', background: '#222', boxShadow: '0 0 32px #0008' }} />
      {/* Pointer */}
      <svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
        <polygon points={`${size / 2 - 12},8 ${size / 2 + 12},8 ${size / 2},38`} fill="#fff" stroke="#222" strokeWidth={2} />
      </svg>
    </div>
  );
};

export default CanvasSpinnerWheel;
