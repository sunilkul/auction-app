import React from 'react';
import { cn } from './cn';

interface Props {
  children: React.ReactNode;
  className?: string;
}

export const AuroraBackground: React.FC<Props> = ({ children, className = '' }) => {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Deep void base */}
      <div className="absolute inset-0 bg-[#020617]" />

      {/* Aurora layers */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 20% -20%, rgba(245,158,11,0.35) 0%, transparent 60%)',
          animation: 'auroraShift 12s ease infinite alternate',
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 80% 120%, rgba(56,189,248,0.4) 0%, transparent 60%)',
          animation: 'auroraShift 15s ease infinite alternate-reverse',
        }}
      />
      <div
        className="absolute inset-0 opacity-15"
        style={{
          background: 'radial-gradient(ellipse 70% 30% at 50% 50%, rgba(129,140,248,0.3) 0%, transparent 60%)',
          animation: 'auroraShift 20s ease infinite alternate',
        }}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,1) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  );
};
