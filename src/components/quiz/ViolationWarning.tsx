import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ViolationWarningProps {
  message: string;
  isVisible: boolean;
  onDismiss: () => void;
  remainingViolations: number;
}

export function ViolationWarning({ 
  message, 
  isVisible, 
  onDismiss, 
  remainingViolations 
}: ViolationWarningProps) {
  if (!isVisible) return null;

  const isDisqualified = remainingViolations <= 0;

  return (
    <div className={cn(
      'fixed top-0 left-0 right-0 z-50 p-4 animate-slide-up',
      isDisqualified ? 'bg-destructive' : 'bg-warning'
    )}>
      <div className="max-w-4xl mx-auto flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-white shrink-0" />
        <div className="flex-1 text-white font-semibold">
          {message}
        </div>
        {!isDisqualified && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>
    </div>
  );
}
