import Link from 'next/link';
import { Pencil } from '@/components/ui/Icons';
import type { Tables } from '@/types/database.types';
import NeonBorder from '@/components/ui/NeonBorder';
import { NeonText } from '@/components/ui/NeonText';
import { Button } from '@/components/ui/Button';
import { OptimizedAvatar } from '@/components/ui/OptimizedAvatar';
import { countries } from '@/lib/data/countries';
import { sanitizeDisplayName } from '@/lib/sanitization';
import { USER_PAGE_CONSTANTS } from './constants';

/**
 * Props interface for ProfileHeader component
 */
export interface ProfileHeaderProps {
  userData: Tables<'users'>;
  animationDelay?: number;
}

/**
 * ProfileHeader Component
 *
 * Displays user profile header with:
 * - Avatar with neon border and consistent fallback
 * - Username and full name
 * - Location information
 * - Edit profile button
 *
 * Features:
 * - Responsive layout (column on mobile, row on desktop)
 * - CSS animations with proper delays
 * - Auto-generated avatar fallback via ui-avatars.com
 * - Type-safe props with explicit interfaces
 * - Consistent avatar styling with header component
 */
export function ProfileHeader({
  userData,
  animationDelay = USER_PAGE_CONSTANTS.ANIMATIONS.HEADER_DELAY,
}: ProfileHeaderProps) {
  const avatarUrl =
    userData.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userData.username || 'User'
    )}&background=0D1117&color=06B6D4&bold=true&size=200`;

  const locationParts = [
    countries.find(c => c.code === userData.land)?.name,
    userData.region,
    userData.city,
  ].filter(Boolean);

  const locationDisplay =
    locationParts.length > 0 ? locationParts.join(', ') : null;
  const countryFlag = userData.land
    ? countries.find(c => c.code === userData.land)?.flag
    : null;

  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-4 fill-mode-both flex flex-col items-start gap-8 duration-500 md:flex-row [--animation-delay:${animationDelay}s]`}
    >
      {/* Avatar Section */}
      <NeonBorder color="cyan" className="rounded-full p-1">
        <OptimizedAvatar
          size="xl"
          className="ring-0"
          src={avatarUrl}
          alt={`${userData.username || 'User'}'s profile picture`}
          fallback={userData.username?.charAt(0).toUpperCase() || 'U'}
          priority
        />
      </NeonBorder>

      {/* User Info Section */}
      <div className="flex-1 space-y-4">
        {/* Top row - Name and Edit Button */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">
              <NeonText>
                {sanitizeDisplayName(userData.username || '')}
              </NeonText>
            </h1>
            {userData.full_name && (
              <h2 className="neon-glow-cyan text-2xl">
                {sanitizeDisplayName(userData.full_name)}
              </h2>
            )}
          </div>

          <Link href="/user/edit" className="mt-4 md:mt-0">
            <Button
              variant="primary"
              className="flex w-full items-center gap-2 md:w-auto"
            >
              <Pencil className={USER_PAGE_CONSTANTS.UI.ICON_SIZE} />
              {USER_PAGE_CONSTANTS.MESSAGES.EDIT_PROFILE}
            </Button>
          </Link>
        </div>

        {/* Location Display */}
        {locationDisplay && (
          <div className="flex items-center gap-2 text-lg">
            {countryFlag && <span className="text-2xl">{countryFlag}</span>}
            <span className="text-gray-300">{locationDisplay}</span>
          </div>
        )}
      </div>
    </div>
  );
}
