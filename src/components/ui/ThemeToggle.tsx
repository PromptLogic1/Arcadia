'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/Button';
import { Sun, Moon, Monitor } from '@/components/ui/Icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'dropdown' | 'toggle';
}

export function ThemeToggle({
  className,
  variant = 'dropdown',
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'h-11 min-h-[44px] w-11 min-w-[44px] rounded-full border border-cyan-500/30 text-cyan-300',
          className
        )}
        disabled
      >
        <Monitor className="h-5 w-5" />
      </Button>
    );
  }

  if (variant === 'toggle') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className={cn(
          'h-11 min-h-[44px] w-11 min-w-[44px] rounded-full border border-cyan-500/30 text-cyan-300 transition-all duration-200 hover:border-cyan-400/60 hover:bg-cyan-500/10',
          className
        )}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
      >
        {resolvedTheme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-11 min-h-[44px] w-11 min-w-[44px] rounded-full border border-cyan-500/30 text-cyan-300 transition-all duration-200 hover:border-cyan-400/60 hover:bg-cyan-500/10',
            className
          )}
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="h-5 w-5" />
          ) : resolvedTheme === 'light' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="cyber-card w-40 border-cyan-400/50 text-cyan-100 backdrop-blur-xl"
        align="end"
      >
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className={cn(
            'cursor-pointer',
            theme === 'light' && 'bg-cyan-500/20 text-cyan-300'
          )}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn(
            'cursor-pointer',
            theme === 'dark' && 'bg-cyan-500/20 text-cyan-300'
          )}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className={cn(
            'cursor-pointer',
            theme === 'system' && 'bg-cyan-500/20 text-cyan-300'
          )}
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
