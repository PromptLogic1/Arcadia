import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import type { Tables } from '@/types/database-generated';
import NeonBorder from '@/components/ui/NeonBorder';
import { NeonText } from '@/components/ui/NeonText';
import { Button } from '@/components/ui/button';
import { countries } from '@/lib/data/countries';
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
 * - Avatar with neon border
 * - Username and full name
 * - Location information
 * - Edit profile button
 *
 * Features:
 * - Responsive layout (column on mobile, row on desktop)
 * - Framer Motion animations
 * - Auto-generated avatar fallback via ui-avatars.com
 * - Type-safe props with explicit interfaces
 */
export function ProfileHeader({
  userData,
  animationDelay = USER_PAGE_CONSTANTS.ANIMATIONS.HEADER_DELAY,
}: ProfileHeaderProps) {
  const avatarUrl =
    userData.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.username)}&background=random`;

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animationDelay }}
      className="flex flex-col items-start gap-8 md:flex-row"
    >
      {/* Avatar Section */}
      <NeonBorder color="cyan" className="rounded-full p-1">
        <div
          className={`relative ${USER_PAGE_CONSTANTS.UI.AVATAR_SIZE} overflow-hidden rounded-full`}
        >
          <Image
            src={avatarUrl}
            alt={userData.username}
            fill
            className="object-cover"
            unoptimized={avatarUrl.includes('ui-avatars.com')}
          />
        </div>
      </NeonBorder>

      {/* User Info Section */}
      <div className="flex-1 space-y-4">
        {/* Top row - Name and Edit Button */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">
              <NeonText>{userData.username}</NeonText>
            </h1>
            {userData.full_name && (
              <h2 className="neon-glow-cyan text-2xl">{userData.full_name}</h2>
            )}
          </div>

          <Link href="/user/edit" className="mt-4 md:mt-0">
            <Button
              variant="cyber"
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
    </motion.div>
  );
}
