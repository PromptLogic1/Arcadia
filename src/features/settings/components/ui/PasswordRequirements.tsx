import React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SETTINGS_CONSTANTS } from '../constants';
import type { PasswordCheck } from '../constants';

interface PasswordRequirementsProps {
  passwordChecks: PasswordCheck;
  className?: string;
}

export function PasswordRequirements({
  passwordChecks,
  className,
}: PasswordRequirementsProps) {
  return (
    <div
      className={cn(
        SETTINGS_CONSTANTS.STYLES.REQUIREMENTS_CONTAINER,
        className
      )}
    >
      <p className="mb-3 text-sm font-medium text-gray-300">
        Password Requirements:
      </p>

      <div className="space-y-2">
        {SETTINGS_CONSTANTS.PASSWORD_REQUIREMENTS.map(({ key, label }) => {
          const isValid = passwordChecks[key];

          return (
            <div
              key={key}
              className={cn(
                'flex items-center gap-2 text-sm',
                isValid ? 'text-green-400' : 'text-gray-400'
              )}
            >
              {isValid ? (
                <Check className="h-4 w-4" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
