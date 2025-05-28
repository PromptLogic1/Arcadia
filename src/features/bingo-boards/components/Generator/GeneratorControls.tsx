'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GeneratorControlsProps {
  onGenerate: () => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export const GeneratorControls: React.FC<GeneratorControlsProps> = ({
  onGenerate,
  disabled = false,
  className,
}) => {
  return (
    <div className={cn('flex justify-end', className)}>
      <Button
        onClick={onGenerate}
        disabled={disabled}
        className={cn(
          'bg-cyan-500/10 hover:bg-cyan-500/20',
          'text-cyan-400 hover:text-cyan-300',
          'border border-cyan-500/30',
          'transition-all duration-200'
        )}
      >
        <Wand2 className="mr-2 h-4 w-4" />
        Generate Templates
      </Button>
    </div>
  );
};
