import { useMemo } from 'react';
import { Trophy, Calendar, Clock, UserCircle } from '@/components/ui/Icons';
import type { Tables } from '@/types/database.types';
import { Card, CardContent } from '@/components/ui/Card';
import { USER_PAGE_CONSTANTS, STAT_COLORS } from './constants';
import type { ComponentType } from 'react';

/**
 * Interface for individual stat configuration
 */
export interface StatConfig {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  color: string;
}

/**
 * Props interface for StatsGrid component
 */
export interface StatsGridProps {
  userData: Tables<'users'>;
  animationDelayBase?: number;
}

/**
 * StatsGrid Component
 *
 * Displays user statistics in a responsive grid layout:
 * - Experience points
 * - User role
 * - Member since date
 * - Last activity date
 *
 * Features:
 * - Responsive grid layout (1 col mobile, 2 col tablet, 4 col desktop)
 * - CSS animations with staggered delays
 * - Memoized stat calculations for performance
 * - Configurable colors and icons via constants
 * - Type-safe interfaces for all props
 */
export function StatsGrid({
  userData,
  animationDelayBase = USER_PAGE_CONSTANTS.ANIMATIONS.STATS_DELAY_BASE,
}: StatsGridProps) {
  // Memoized stats configuration to prevent recalculation on re-renders
  const stats: StatConfig[] = useMemo(
    () => [
      {
        icon: Trophy,
        label: 'Experience',
        value: `${userData.experience_points || 0} XP`,
        color: STAT_COLORS.EXPERIENCE,
      },
      {
        icon: UserCircle,
        label: 'Role',
        value: userData.role || 'User',
        color: STAT_COLORS.ROLE,
      },
      {
        icon: Calendar,
        label: 'Member Since',
        value: userData.created_at
          ? new Date(userData.created_at).toLocaleDateString()
          : 'Unknown',
        color: STAT_COLORS.MEMBER_SINCE,
      },
      {
        icon: Clock,
        label: 'Last Activity',
        value: userData.last_login_at
          ? new Date(userData.last_login_at).toLocaleDateString()
          : 'Never',
        color: STAT_COLORS.LAST_ACTIVITY,
      },
    ],
    [userData]
  );

  return (
    <div className={`mb-8 grid gap-6 ${USER_PAGE_CONSTANTS.UI.GRID_LAYOUT}`}>
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className={`animate-in fade-in slide-in-from-bottom-4 fill-mode-both duration-500 [--animation-delay:${animationDelayBase + index * 0.1}s]`}
        >
          <Card className="border-cyan-500/20 bg-gray-800/50 transition-colors hover:border-cyan-500/40">
            <CardContent className="p-6">
              <div
                className={`${USER_PAGE_CONSTANTS.UI.STAT_ICON_SIZE} rounded-full bg-gradient-to-r ${stat.color} mb-4 flex items-center justify-center`}
              >
                <stat.icon
                  className={USER_PAGE_CONSTANTS.UI.ICON_SIZE + ' text-white'}
                />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-gray-400">
                {stat.label}
              </h3>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
