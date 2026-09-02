import React from 'react';
import { motion } from 'framer-motion';
import { SpotlightCard } from './SpotlightCard';
import { cn } from './cn';

interface Props {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  spotlightColor?: string;
  hover?: boolean;
  onClick?: () => void;
  delay?: number;
}

export const GlowCard: React.FC<Props> = ({
  children,
  className = '',
  glowColor = 'rgba(245,158,11,0.25)',
  spotlightColor,
  hover = true,
  onClick,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -6, scale: 1.01 } : {}}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <SpotlightCard
        spotlightColor={spotlightColor ?? glowColor}
        className={cn(
          'rounded-2xl border',
          'bg-[rgba(30,41,59,0.7)] backdrop-blur-xl',
          'border-[rgba(148,163,184,0.1)]',
          'transition-all duration-300',
          hover && 'hover:border-[rgba(245,158,11,0.3)]',
          className
        )}
        style={{
          boxShadow: hover
            ? undefined
            : `0 0 30px ${glowColor}`,
        } as React.CSSProperties}
      >
        {children}
      </SpotlightCard>
    </motion.div>
  );
};
