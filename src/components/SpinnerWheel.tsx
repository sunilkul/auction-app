// SpinnerWheel.tsx
import React, { useRef, useEffect } from 'react';


interface SpinnerWheelProps {
  items: { id: number; name: string }[];
  selectedIndex: number | null;
  spinning: boolean;
  size?: number;
  randomOffset?: number; // degrees
}

const COLORS = [
  '#1976d2', '#009688', '#ff9800', '#e91e63', '#8bc34a', '#f44336', '#3f51b5', '#00bcd4', '#ffc107', '#9c27b0'
];

function getSliceColor(idx: number) {
  return COLORS[idx % COLORS.length];
}

const SpinnerWheel: React.FC<SpinnerWheelProps> = (props) => {
  const { items, selectedIndex, spinning, size = 320, randomOffset } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const startRotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number>(0);
  const lastSelectedRef = useRef<number | null>(null);

  const spinDuration = 3200;
  const spinEasing = (t: number) => 1 - Math.pow(1 - t, 3);


  // Use prop randomOffset if provided, otherwise fallback to 0
  const randomOffsetRef = useRef<number>(0);

  useEffect(() => {
    if (spinning && selectedIndex !== null) {
      const angle = 360 / items.length;
      const minSpins = 1;
      // Use the provided randomOffset prop, or 0 if not provided
      const offset = randomOffset ?? 0;
      randomOffsetRef.current = offset;
      // The selected segment will stop at a random position
      const target = 360 * minSpins + angle * selectedIndex + offset;
      startRotationRef.current = lastSelectedRef.current !== null ? angle * lastSelectedRef.current + offset : 0;
      targetRotationRef.current = target;
      startTimeRef.current = performance.now();
      animate();
    }
    // eslint-disable-next-line
  }, [spinning, selectedIndex, items.length, randomOffset]);

  // (removed duplicate drawWheel definition)

      const drawWheel = (ctx: CanvasRenderingContext2D, rotation: number) => {
        const r = size / 2;
        ctx.clearRect(0, 0, size, size);
        const angle = 2 * Math.PI / items.length;
        // Draw slices
        // Apply the random offset to the wheel rotation
        const offset = randomOffsetRef.current || 0;
        for (let i = 0; i < items.length; i++) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(r, r);
          ctx.arc(
            r,
            r,
            r - 2,
            angle * i - Math.PI / 2 + ((rotation + offset) * Math.PI / 180),
            angle * (i + 1) - Math.PI / 2 + ((rotation + offset) * Math.PI / 180)
          );
          ctx.closePath();
          ctx.fillStyle = getSliceColor(i);
          ctx.fill();
          ctx.restore();
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Highlight the selected name at the pointer after spin stops
        let highlightLabelIndex: number | null = null;
        if (!spinning && selectedIndex !== null && selectedIndex >= 0 && selectedIndex < items.length) {
          highlightLabelIndex = selectedIndex;
        }
        for (let i = 0; i < items.length; i++) {
          let fontSize = 17;
          let label = items[i].name;
          const segAngleDeg = (angle * i + angle / 2) * 180 / Math.PI - 90 + rotation + offset;
          const segAngle = segAngleDeg * (Math.PI / 180);
          const labelRadius = r * 0.48;
          const x = r + labelRadius * Math.cos(segAngle);
          const y = r + labelRadius * Math.sin(segAngle);
          const maxWidth = r * angle * 0.85;
          ctx.font = `600 ${fontSize}px 'Segoe UI', 'Arial', 'sans-serif'`;
          while (fontSize > 10 && ctx.measureText(label).width > maxWidth) {
            fontSize -= 1;
            ctx.font = `600 ${fontSize}px 'Segoe UI', 'Arial', 'sans-serif'`;
          }
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(segAngleDeg * Math.PI / 180);
          if (highlightLabelIndex === i) {
            // Stronger focus: larger font, bold, colored background, strong glow
            const highlightFontSize = fontSize + 8;
            ctx.font = `bold ${highlightFontSize}px 'Segoe UI', 'Arial', 'sans-serif'`;
            const textWidth = ctx.measureText(label).width;
            const textHeight = highlightFontSize * 1.2;
            // Draw rounded rectangle background
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(-textWidth/2 - 12, -textHeight/2 + 8);
            ctx.lineTo(textWidth/2 + 12, -textHeight/2 + 8);
            ctx.quadraticCurveTo(textWidth/2 + 20, 0, textWidth/2 + 12, textHeight/2 + 8);
            ctx.lineTo(-textWidth/2 - 12, textHeight/2 + 8);
            ctx.quadraticCurveTo(-textWidth/2 - 20, 0, -textWidth/2 - 12, -textHeight/2 + 8);
            ctx.closePath();
            ctx.globalAlpha = 0.92;
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ff9800';
            ctx.shadowBlur = 36;
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
            // Draw text with strong glow
            ctx.shadowColor = '#ff9800';
            ctx.shadowBlur = 36;
            ctx.fillStyle = '#222';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeText(label, 0, 0);
            ctx.fillText(label, 0, 0);
          } else {
            ctx.fillStyle = '#fff';
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 6;
            ctx.strokeText(label, 0, 0);
            ctx.fillText(label, 0, 0);
          }
          ctx.restore();
        }
        // Highlight the selected segment (the one at the top center)
        if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < items.length) {
          // The selected segment is always at the top (angle -90deg)
          const highlightAngleStart = -Math.PI / 2;
          const highlightAngleEnd = highlightAngleStart + angle;
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(r, r);
          ctx.arc(r, r, r - 2, highlightAngleStart, highlightAngleEnd);
          ctx.closePath();
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
        ctx.restore();
        // Draw center circle (no label)
        ctx.save();
        ctx.beginPath();
        ctx.arc(r, r, r * 0.12, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      };

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

      useEffect(() => {
        return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
      }, []);

      return (
        <div style={{ position: 'relative', width: size, height: size, margin: 24 }}>
          <canvas ref={canvasRef} width={size} height={size} style={{ borderRadius: '50%', background: '#222', boxShadow: '0 0 32px #0008' }} />
          {/* Fixed triangle pointer at top center */}
          <svg width={size} height={size} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
            <polygon points={`${size / 2 - 12},8 ${size / 2 + 12},8 ${size / 2},38`} fill="#fff" stroke="#222" strokeWidth={2} />
          </svg>
          {/* Popup for highlighted name */}
          {!spinning && selectedIndex !== null && selectedIndex >= 0 && selectedIndex < items.length && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: size * 0.18,
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(90deg, #fffbe6 0%, #ffe066 100%)',
                color: '#222',
                fontWeight: 900,
                fontSize: size * 0.09,
                borderRadius: 18,
                boxShadow: '0 6px 32px #ff9800cc, 0 0 0 6px #ffd70099',
                padding: '18px 36px',
                zIndex: 10,
                border: '3px solid #ffd700',
                letterSpacing: 1.5,
                textAlign: 'center',
                pointerEvents: 'none',
                userSelect: 'none',
                textShadow: '0 2px 12px #ff9800, 0 0 2px #fff',
                animation: 'pop-highlight 0.5s cubic-bezier(.68,-0.55,.27,1.55)'
              }}
            >
              {items[selectedIndex].name}
            </div>
          )}
          <style>{`
            @keyframes pop-highlight {
              0% { transform: scale(0.7) translate(-50%, -50%); opacity: 0; }
              60% { transform: scale(1.15) translate(-50%, -50%); opacity: 1; }
              100% { transform: scale(1) translate(-50%, -50%); opacity: 1; }
            }
          `}</style>
        </div>
      );
    };

    export default SpinnerWheel;
