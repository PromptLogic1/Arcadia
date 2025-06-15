import React from 'react';
import { AlertCircle, Lightbulb } from '@/components/ui/Icons';
import { cn } from '@/lib/utils';
import { GENERATOR_ERRORS, ERROR_TIPS, GENERATOR_STYLES } from './constants';

interface ErrorFeedbackProps {
  error: string;
  className?: string;
}

/**
 * Enhanced ErrorFeedback Component with Tailwind v4 Features
 *
 * Displays generation errors with helpful tips for users.
 * Enhanced with v4 features:
 * - Better visual hierarchy with text shadows
 * - Animated error states
 * - Colored drop shadows for visual emphasis
 * - Touch-optimized interactive elements
 * - Better semantic color usage
 *
 * @param error - Error message to display
 * @param className - Additional CSS classes
 */
export const ErrorFeedback: React.FC<ErrorFeedbackProps> = ({
  error,
  className = '',
}) => {
  // Extract meaningful error message
  const getErrorMessage = (errorString: string): string => {
    if (errorString.includes('No cards available')) {
      return GENERATOR_ERRORS.NO_CARDS_AVAILABLE;
    }
    if (errorString.includes('Not enough cards')) {
      return errorString; // Return the specific count message
    }
    return GENERATOR_ERRORS.GENERATION_FAILED;
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div
      className={cn(
        GENERATOR_STYLES.ERROR_CONTAINER,
        'animate-fade glass-intense',
        className
      )}
    >
      <div className="flex items-start gap-4">
        {/* Enhanced error icon */}
        <div className="flex-shrink-0">
          <div className="bg-destructive/10 border-destructive/20 rounded-full border p-2">
            <AlertCircle
              className={cn(
                'h-5 w-5',
                GENERATOR_STYLES.ERROR_ICON,
                'animate-glow'
              )}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {/* Enhanced error heading */}
          <h3
            className={cn(
              'mb-2 text-sm font-semibold',
              GENERATOR_STYLES.ERROR_TEXT,
              'text-shadow-sm'
            )}
          >
            Generation Failed
          </h3>

          {/* Enhanced error message */}
          <div className="space-y-3">
            <p
              className={cn(
                'text-sm leading-relaxed',
                GENERATOR_STYLES.ERROR_TEXT,
                'text-shadow-xs'
              )}
            >
              {errorMessage}
            </p>

            {/* Enhanced tips section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500 drop-shadow-sm drop-shadow-yellow-500/30" />
                <span className="text-muted-foreground text-xs font-medium text-shadow-xs">
                  Helpful Tips:
                </span>
              </div>

              <ul className="space-y-1.5 pl-6">
                {ERROR_TIPS.map((tip, index) => (
                  <li
                    key={index}
                    className={cn(
                      'text-muted-foreground text-xs leading-relaxed',
                      'animate-fade hover:text-foreground/80 transition-colors',
                      "relative before:absolute before:-left-3 before:content-['•']",
                      'before:text-primary/60 before:font-bold'
                    )}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
