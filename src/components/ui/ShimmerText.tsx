import React from 'react';
import { cn } from './cn';

interface Props {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

export const ShimmerText: React.FC<Props> = ({ children, className = '', as: Tag = 'span' }) => {
  return (
    <Tag
      className={cn('inline-block', className)}
      style={{
        background: 'linear-gradient(90deg, #f59e0b 0%, #fcd34d 30%, #f59e0b 60%, #fcd34d 80%, #f59e0b 100%)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmerText 3s linear infinite',
      }}
    >
      {children}
    </Tag>
  );
};
