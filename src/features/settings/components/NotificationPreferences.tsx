'use client';

import React, { useCallback, useState } from 'react';
import { Switch } from '@/components/ui/Switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Bell,
  Mail,
  Users,
  Trophy,
  Gamepad2,
  AlertCircle,
} from '@/components/ui/Icons';
import { notifications } from '@/lib/notifications';
import { BaseErrorBoundary } from '@/components/error-boundaries';
import type { NotificationSettings } from '../types';
import { log } from '@/lib/logger';

interface NotificationPreferencesProps {
  settings: NotificationSettings;
  onSave: (settings: NotificationSettings) => Promise<void>;
  isLoading?: boolean;
}

interface NotificationCategory {
  title: string;
  description: string;
  icon: React.ElementType;
  settings: {
    key: keyof NotificationSettings;
    label: string;
    description: string;
  }[];
}

const notificationCategories: NotificationCategory[] = [
  {
    title: 'General',
    description: 'Core notification preferences',
    icon: Bell,
    settings: [
      {
        key: 'email_notifications',
        label: 'Email Notifications',
        description: 'Receive notifications via email',
      },
      {
        key: 'push_notifications',
        label: 'Push Notifications',
        description: 'Receive browser push notifications',
      },
    ],
  },
  {
    title: 'Social',
    description: 'Friend and community activity',
    icon: Users,
    settings: [
      {
        key: 'friend_requests',
        label: 'Friend Requests',
        description: 'When someone sends you a friend request',
      },
      {
        key: 'friend_activity',
        label: 'Friend Activity',
        description: 'When friends complete challenges or earn achievements',
      },
      {
        key: 'community_updates',
        label: 'Community Updates',
        description: 'New discussions and events in your communities',
      },
    ],
  },
  {
    title: 'Gaming',
    description: 'Game and challenge notifications',
    icon: Gamepad2,
    settings: [
      {
        key: 'game_invites',
        label: 'Game Invites',
        description: 'When someone invites you to play',
      },
      {
        key: 'game_updates',
        label: 'Game Updates',
        description: 'New games and features',
      },
      {
        key: 'challenge_notifications',
        label: 'Challenge Notifications',
        description: 'Challenge completions and new challenges',
      },
    ],
  },
  {
    title: 'Achievements',
    description: 'Achievement and progress notifications',
    icon: Trophy,
    settings: [
      {
        key: 'achievement_notifications',
        label: 'Achievement Unlocked',
        description: 'When you unlock new achievements',
      },
    ],
  },
  {
    title: 'Communications',
    description: 'Marketing and system notifications',
    icon: Mail,
    settings: [
      {
        key: 'marketing_emails',
        label: 'Marketing Emails',
        description: 'Promotional content and special offers',
      },
      {
        key: 'weekly_digest',
        label: 'Weekly Digest',
        description: 'Weekly summary of your activity and updates',
      },
      {
        key: 'maintenance_alerts',
        label: 'Maintenance Alerts',
        description: 'System maintenance and important updates',
      },
    ],
  },
];

export function NotificationPreferences({
  settings,
  onSave,
  isLoading = false,
}: NotificationPreferencesProps) {
  const [localSettings, setLocalSettings] =
    useState<NotificationSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = useCallback((key: keyof NotificationSettings) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(localSettings);
      notifications.success('Notification preferences saved successfully!');
      setHasChanges(false);
      log.info('Notification preferences updated');
    } catch (error) {
      notifications.error('Failed to save preferences. Please try again.');
      log.error('Failed to save notification preferences', error);
    } finally {
      setIsSaving(false);
    }
  }, [localSettings, hasChanges, isSaving, onSave]);

  const handleReset = useCallback(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  return (
    <BaseErrorBoundary level="component">
      <div className="space-y-6">
        {notificationCategories.map(category => {
          const Icon = category.icon;

          return (
            <Card
              key={category.title}
              className="border-gray-700 bg-gray-800/50"
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 p-2">
                    <Icon className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription className="text-sm text-gray-400">
                      {category.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {category.settings.map(setting => (
                  <div
                    key={setting.key}
                    className="flex items-start justify-between gap-4 rounded-lg p-3 transition-colors hover:bg-gray-700/30"
                  >
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={setting.key}
                        className="cursor-pointer text-sm font-medium text-gray-200"
                      >
                        {setting.label}
                      </label>
                      <p className="text-xs text-gray-400">
                        {setting.description}
                      </p>
                    </div>
                    <Switch
                      id={setting.key}
                      checked={localSettings[setting.key]}
                      onCheckedChange={() => handleToggle(setting.key)}
                      disabled={isLoading || isSaving}
                      aria-label={`Toggle ${setting.label}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {hasChanges && (
          <div className="fixed right-6 bottom-6 z-50 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <p className="text-sm text-gray-200">You have unsaved changes</p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  disabled={isSaving}
                >
                  Reset
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BaseErrorBoundary>
  );
}
