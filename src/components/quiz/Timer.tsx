import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TimerProps {
  duration: number;
  startTime: string | null;
  onTimeUp?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function Timer({ duration, startTime, onTimeUp, size = 'md' }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (!startTime) {
      setTimeLeft(duration);
      return;
    }

    const startMs = new Date(startTime).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startMs) / 1000);
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onTimeUp?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [duration, startTime, onTimeUp]);

  const percentage = (timeLeft / duration) * 100;
  const isLow = timeLeft <= 5;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-3xl',
    lg: 'text-5xl',
  };

  return (
    <div className={cn('relative', sizeClasses[size])}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            'transition-all duration-100',
            isLow ? 'text-destructive' : 'text-primary'
          )}
        />
      </svg>
      <div className={cn(
        'absolute inset-0 flex items-center justify-center font-bold',
        textSizes[size],
        isLow && 'text-destructive animate-pulse-fast'
      )}>
        {timeLeft}
      </div>
    </div>
  );
}
