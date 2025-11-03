/**
 * Animated Status Indicator
 * Shows contextual status messages with animated dots
 */

import { memo, useEffect, useState } from 'react';

interface AnimatedStatusProps {
  className?: string;
}

const statusMessages = [
  'Thinking',
  'Creating',
  'Building',
  'Designing',
  'Processing',
];

export const AnimatedStatus = memo(({ className = '' }: AnimatedStatusProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % statusMessages.length);
    }, 2000); // Change message every 2 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-sm font-medium animate-pulse">
        {statusMessages[currentIndex]}
      </span>
      <div className="flex items-center gap-0.5">
        <div
          className="w-1 h-1 rounded-full bg-current animate-pulse"
          style={{
            animationDelay: '0ms',
            animationDuration: '1.4s',
          }}
        />
        <div
          className="w-1 h-1 rounded-full bg-current animate-pulse"
          style={{
            animationDelay: '200ms',
            animationDuration: '1.4s',
          }}
        />
        <div
          className="w-1 h-1 rounded-full bg-current animate-pulse"
          style={{
            animationDelay: '400ms',
            animationDuration: '1.4s',
          }}
        />
      </div>
    </div>
  );
});

AnimatedStatus.displayName = 'AnimatedStatus';
