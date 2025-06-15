import type { Tables } from '@/types/database.types';
import { Card, CardContent } from '@/components/ui/Card';
import { NeonText } from '@/components/ui/NeonText';
import { sanitizeUserBio } from '@/lib/sanitization';
import { USER_PAGE_CONSTANTS } from './constants';

/**
 * Props interface for BioSection component
 */
export interface BioSectionProps {
  userData: Tables<'users'>;
  animationDelay?: number;
}

/**
 * BioSection Component
 *
 * Conditionally renders user bio information with:
 * - About Me section header
 * - Bio content with proper typography
 * - Card layout with neon styling
 * - Smooth enter animations
 *
 * Features:
 * - Conditional rendering (only shows if bio exists)
 * - CSS animations
 * - Consistent card styling
 * - Accessible content structure
 * - Type-safe props interface
 */
export function BioSection({
  userData,
  animationDelay = USER_PAGE_CONSTANTS.ANIMATIONS.BIO_DELAY,
}: BioSectionProps) {
  // Early return if no bio content
  if (!userData.bio) {
    return null;
  }

  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-4 fill-mode-both mb-8 duration-500 [--animation-delay:${animationDelay}s]`}
    >
      <Card className="border-cyan-500/20 bg-gray-800/50">
        <CardContent className="p-6">
          <h3 className="mb-4 text-2xl font-bold">
            <NeonText>About Me</NeonText>
          </h3>
          <div
            className="leading-relaxed text-gray-300"
            dangerouslySetInnerHTML={{ __html: sanitizeUserBio(userData.bio) }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
