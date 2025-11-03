/**
 * Animated Dots Loading Indicator
 * Shows three dots with smooth size animation
 */

import { memo } from 'react';

interface AnimatedDotsProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AnimatedDots = memo(({ className = '', size = 'md' }: AnimatedDotsProps) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  const dotSize = sizeClasses[size];

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div
        className={`${dotSize} rounded-full bg-current animate-pulse`}
        style={{
          animationDelay: '0ms',
          animationDuration: '1.4s',
        }}
      />
      <div
        className={`${dotSize} rounded-full bg-current animate-pulse`}
        style={{
          animationDelay: '200ms',
          animationDuration: '1.4s',
        }}
      />
      <div
        className={`${dotSize} rounded-full bg-current animate-pulse`}
        style={{
          animationDelay: '400ms',
          animationDuration: '1.4s',
        }}
      />
    </div>
  );
});

AnimatedDots.displayName = 'AnimatedDots';
