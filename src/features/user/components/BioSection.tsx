import { motion } from 'framer-motion';
import type { Tables } from '@/types/database.types';
import { Card, CardContent } from '@/components/ui/card';
import { NeonText } from '@/components/ui/NeonText';
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
 * - Framer Motion animations
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className="mb-8"
    >
      <Card className="border-cyan-500/20 bg-gray-800/50">
        <CardContent className="p-6">
          <h3 className="mb-4 text-2xl font-bold">
            <NeonText>About Me</NeonText>
          </h3>
          <p className="leading-relaxed text-gray-300">{userData.bio}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
