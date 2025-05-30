import { motion } from 'framer-motion';
import { Star, GamepadIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { USER_PAGE_CONSTANTS, type TabId } from './constants';

/**
 * Props interface for TabContent component
 */
export interface TabContentProps {
  activeTab: TabId;
}

/**
 * TabContent Component
 *
 * Renders content based on the active tab:
 * - Achievements tab: Coming soon placeholder with star icon
 * - Submissions tab: Coming soon placeholder with gamepad icon
 *
 * Features:
 * - Framer Motion animations for smooth transitions
 * - Consistent placeholder styling
 * - Type-safe tab switching
 * - Accessible content structure
 * - Centered layout with appropriate icons
 */
export function TabContent({ activeTab }: TabContentProps) {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'achievements':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <Star className="mx-auto mb-4 h-16 w-16 text-gray-600" />
            <h3 className="text-xl text-gray-400">
              {USER_PAGE_CONSTANTS.MESSAGES.ACHIEVEMENTS_COMING_SOON}
            </h3>
          </motion.div>
        );

      case 'submissions':
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-12 text-center"
          >
            <GamepadIcon className="mx-auto mb-4 h-16 w-16 text-gray-600" />
            <h3 className="text-xl text-gray-400">
              {USER_PAGE_CONSTANTS.MESSAGES.SUBMISSIONS_COMING_SOON}
            </h3>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className="border-cyan-500/20 bg-gray-800/50">
      <CardContent className="p-6">{renderTabContent()}</CardContent>
    </Card>
  );
}
