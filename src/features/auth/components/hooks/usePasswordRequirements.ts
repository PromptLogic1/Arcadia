/**
 * Password Requirements Hook
 *
 * Custom hook for checking password requirements in real-time.
 * Provides visual feedback for password strength and validation.
 */

import { useMemo } from 'react';

export interface PasswordRequirements {
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  length: boolean;
}

export interface UsePasswordRequirementsReturn {
  requirements: PasswordRequirements;
  allMet: boolean;
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-100
}

/**
 * Custom hook for password requirements checking
 */
export function usePasswordRequirements(
  password: string
): UsePasswordRequirementsReturn {
  const requirements = useMemo(
    (): PasswordRequirements => ({
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
      length: password.length >= 8,
    }),
    [password]
  );

  const allMet = useMemo(
    () => Object.values(requirements).every(Boolean),
    [requirements]
  );

  const { strength, score } = useMemo(() => {
    const metCount = Object.values(requirements).filter(Boolean).length;
    let calculatedScore = 0;
    let calculatedStrength: 'weak' | 'fair' | 'good' | 'strong' = 'weak';

    // Base score from requirements
    calculatedScore = (metCount / 5) * 60;

    // Bonus points for length
    if (password.length >= 12) calculatedScore += 20;
    else if (password.length >= 10) calculatedScore += 10;

    // Bonus for character variety
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= 10) calculatedScore += 20;
    else if (uniqueChars >= 6) calculatedScore += 10;

    // Determine strength
    if (calculatedScore >= 90) calculatedStrength = 'strong';
    else if (calculatedScore >= 70) calculatedStrength = 'good';
    else if (calculatedScore >= 50) calculatedStrength = 'fair';

    return {
      strength: calculatedStrength,
      score: Math.min(100, calculatedScore),
    };
  }, [password, requirements]);

  return {
    requirements,
    allMet,
    strength,
    score,
  };
}
