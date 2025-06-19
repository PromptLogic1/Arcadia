/**
 * Preference Migration Tests
 *
 * Tests for migrating settings from old formats to new formats
 */

// Using default Jest globals
// testUtils available from jest.setup.ts

interface LegacySettings {
  theme?: string;
  notifications?: boolean;
  emailAlerts?: boolean;
  soundEnabled?: boolean;
  language?: string;
}

interface ModernSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email_notifications: boolean;
    push_notifications: boolean;
    game_invites: boolean;
    friend_requests: boolean;
    tournament_updates: boolean;
  };
  privacy: {
    profile_visibility: 'public' | 'friends' | 'private';
    show_online_status: boolean;
    allow_friend_requests: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    date_format: string;
    sound_enabled: boolean;
  };
}

describe('Preference Migration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Theme Migration', () => {
    it('should migrate legacy theme values', () => {
      const migrateTheme = (legacyTheme?: string): ModernSettings['theme'] => {
        if (!legacyTheme) return 'system';

        const themeMap: Record<string, ModernSettings['theme']> = {
          'dark-mode': 'dark',
          'light-mode': 'light',
          auto: 'system',
          default: 'system',
          dark: 'dark',
          light: 'light',
        };

        return themeMap[legacyTheme] || 'system';
      };

      expect(migrateTheme('dark-mode')).toBe('dark');
      expect(migrateTheme('light-mode')).toBe('light');
      expect(migrateTheme('auto')).toBe('system');
      expect(migrateTheme('invalid')).toBe('system');
      expect(migrateTheme(undefined)).toBe('system');
    });

    it('should handle numeric theme values from old versions', () => {
      const migrateNumericTheme = (
        themeId: number
      ): ModernSettings['theme'] => {
        const themeMap: Record<number, ModernSettings['theme']> = {
          0: 'light',
          1: 'dark',
          2: 'system',
        };

        return themeMap[themeId] || 'system';
      };

      expect(migrateNumericTheme(0)).toBe('light');
      expect(migrateNumericTheme(1)).toBe('dark');
      expect(migrateNumericTheme(2)).toBe('system');
      expect(migrateNumericTheme(99)).toBe('system');
    });
  });

  describe('Notification Settings Migration', () => {
    it('should migrate simple boolean notifications to granular settings', () => {
      const migrateNotifications = (
        legacy: LegacySettings
      ): ModernSettings['notifications'] => {
        const allEnabled = legacy.notifications ?? true;
        const emailEnabled = legacy.emailAlerts ?? allEnabled;

        return {
          email_notifications: emailEnabled,
          push_notifications: allEnabled,
          game_invites: allEnabled,
          friend_requests: allEnabled,
          tournament_updates: allEnabled,
        };
      };

      const legacy1: LegacySettings = {
        notifications: true,
        emailAlerts: false,
      };
      const migrated1 = migrateNotifications(legacy1);
      expect(migrated1.email_notifications).toBe(false);
      expect(migrated1.push_notifications).toBe(true);

      const legacy2: LegacySettings = { notifications: false };
      const migrated2 = migrateNotifications(legacy2);
      expect(migrated2.email_notifications).toBe(false);
      expect(migrated2.push_notifications).toBe(false);
      expect(migrated2.game_invites).toBe(false);
    });

    it('should handle missing notification preferences', () => {
      const migrateNotifications = (
        legacy: LegacySettings
      ): ModernSettings['notifications'] => {
        return {
          email_notifications: legacy.emailAlerts ?? true,
          push_notifications: legacy.notifications ?? true,
          game_invites: true,
          friend_requests: true,
          tournament_updates: true,
        };
      };

      const legacy: LegacySettings = {};
      const migrated = migrateNotifications(legacy);

      // Should default to enabled for user-friendly experience
      expect(migrated.email_notifications).toBe(true);
      expect(migrated.push_notifications).toBe(true);
    });
  });

  describe('Privacy Settings Migration', () => {
    it('should create default privacy settings for legacy users', () => {
      const createDefaultPrivacySettings = (): ModernSettings['privacy'] => {
        return {
          profile_visibility: 'public',
          show_online_status: true,
          allow_friend_requests: true,
        };
      };

      const defaults = createDefaultPrivacySettings();
      expect(defaults.profile_visibility).toBe('public');
      expect(defaults.show_online_status).toBe(true);
      expect(defaults.allow_friend_requests).toBe(true);
    });

    it('should migrate from old privacy flags', () => {
      interface OldPrivacyFlags {
        publicProfile?: boolean;
        hideOnlineStatus?: boolean;
        blockFriendRequests?: boolean;
      }

      const migratePrivacyFlags = (
        old: OldPrivacyFlags
      ): ModernSettings['privacy'] => {
        return {
          profile_visibility:
            old.publicProfile === false ? 'private' : 'public',
          show_online_status: !old.hideOnlineStatus,
          allow_friend_requests: !old.blockFriendRequests,
        };
      };

      const oldFlags: OldPrivacyFlags = {
        publicProfile: false,
        hideOnlineStatus: true,
        blockFriendRequests: false,
      };

      const migrated = migratePrivacyFlags(oldFlags);
      expect(migrated.profile_visibility).toBe('private');
      expect(migrated.show_online_status).toBe(false);
      expect(migrated.allow_friend_requests).toBe(true);
    });
  });

  describe('Language and Locale Migration', () => {
    it('should migrate language codes to modern format', () => {
      const migrateLanguage = (legacyLang?: string): string => {
        if (!legacyLang) return 'en-US';

        const languageMap: Record<string, string> = {
          en: 'en-US',
          english: 'en-US',
          en_US: 'en-US',
          fr: 'fr-FR',
          french: 'fr-FR',
          es: 'es-ES',
          spanish: 'es-ES',
          de: 'de-DE',
          german: 'de-DE',
        };

        return languageMap[legacyLang] || legacyLang;
      };

      expect(migrateLanguage('en')).toBe('en-US');
      expect(migrateLanguage('french')).toBe('fr-FR');
      expect(migrateLanguage('en_US')).toBe('en-US');
      expect(migrateLanguage('ja-JP')).toBe('ja-JP'); // Already modern format
      expect(migrateLanguage(undefined)).toBe('en-US');
    });

    it('should determine timezone from legacy data', () => {
      const guessTimezone = (utcOffset?: number): string => {
        if (utcOffset === undefined) {
          // Use browser timezone as fallback
          return Intl.DateTimeFormat().resolvedOptions().timeZone;
        }

        // Map common UTC offsets to timezones
        const offsetMap: Record<number, string> = {
          '-5': 'America/New_York',
          '-6': 'America/Chicago',
          '-7': 'America/Denver',
          '-8': 'America/Los_Angeles',
          '0': 'Europe/London',
          '1': 'Europe/Paris',
          '8': 'Asia/Shanghai',
          '9': 'Asia/Tokyo',
        };

        return offsetMap[utcOffset] || 'UTC';
      };

      expect(guessTimezone(-5)).toBe('America/New_York');
      expect(guessTimezone(0)).toBe('Europe/London');
      expect(guessTimezone(9)).toBe('Asia/Tokyo');
      expect(guessTimezone(99)).toBe('UTC');
    });
  });

  describe('Complete Settings Migration', () => {
    it('should perform full migration from legacy to modern format', () => {
      const migrateLegacySettings = (
        legacy: LegacySettings
      ): ModernSettings => {
        return {
          theme:
            legacy.theme === 'dark-mode'
              ? 'dark'
              : legacy.theme === 'light-mode'
                ? 'light'
                : 'system',
          notifications: {
            email_notifications: legacy.emailAlerts ?? true,
            push_notifications: legacy.notifications ?? true,
            game_invites: legacy.notifications ?? true,
            friend_requests: legacy.notifications ?? true,
            tournament_updates: legacy.notifications ?? true,
          },
          privacy: {
            profile_visibility: 'public',
            show_online_status: true,
            allow_friend_requests: true,
          },
          preferences: {
            language: (() => {
              if (!legacy.language) return 'en-US';
              const languageMap: Record<string, string> = {
                en: 'en-US',
                english: 'en-US',
                en_US: 'en-US',
                fr: 'fr-FR',
                french: 'fr-FR',
                es: 'es-ES',
                spanish: 'es-ES',
                de: 'de-DE',
                german: 'de-DE',
              };
              return languageMap[legacy.language] || legacy.language;
            })(),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            date_format: 'MM/DD/YYYY',
            sound_enabled: legacy.soundEnabled ?? true,
          },
        };
      };

      const legacy: LegacySettings = {
        theme: 'dark-mode',
        notifications: true,
        emailAlerts: false,
        soundEnabled: false,
        language: 'en',
      };

      const modern = migrateLegacySettings(legacy);

      expect(modern.theme).toBe('dark');
      expect(modern.notifications.email_notifications).toBe(false);
      expect(modern.notifications.push_notifications).toBe(true);
      expect(modern.preferences.sound_enabled).toBe(false);
      expect(modern.preferences.language).toBe('en-US');
    });

    it('should validate migrated settings', () => {
      const validateModernSettings = (
        settings: ModernSettings
      ): { valid: boolean; errors: string[] } => {
        const errors: string[] = [];

        // Validate theme
        if (!['light', 'dark', 'system'].includes(settings.theme)) {
          errors.push('Invalid theme value');
        }

        // Validate privacy visibility
        if (
          !['public', 'friends', 'private'].includes(
            settings.privacy.profile_visibility
          )
        ) {
          errors.push('Invalid profile visibility');
        }

        // Validate language format
        if (!/^[a-z]{2}-[A-Z]{2}$/.test(settings.preferences.language)) {
          errors.push('Invalid language format');
        }

        return {
          valid: errors.length === 0,
          errors,
        };
      };

      const validSettings: ModernSettings = {
        theme: 'dark',
        notifications: {
          email_notifications: true,
          push_notifications: true,
          game_invites: true,
          friend_requests: true,
          tournament_updates: true,
        },
        privacy: {
          profile_visibility: 'friends',
          show_online_status: true,
          allow_friend_requests: true,
        },
        preferences: {
          language: 'en-US',
          timezone: 'America/New_York',
          date_format: 'MM/DD/YYYY',
          sound_enabled: true,
        },
      };

      const validation = validateModernSettings(validSettings);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Migration Conflict Resolution', () => {
    it('should handle conflicting settings during migration', () => {
      interface ConflictingSettings {
        notifications: boolean;
        disableAllNotifications: boolean;
        emailNotifications: boolean;
      }

      const resolveNotificationConflicts = (
        settings: ConflictingSettings
      ): boolean => {
        // If explicitly disabled all, that takes precedence
        if (settings.disableAllNotifications) return false;

        // Otherwise use the specific setting
        return settings.emailNotifications ?? settings.notifications ?? true;
      };

      expect(
        resolveNotificationConflicts({
          notifications: true,
          disableAllNotifications: true,
          emailNotifications: true,
        })
      ).toBe(false);

      expect(
        resolveNotificationConflicts({
          notifications: false,
          disableAllNotifications: false,
          emailNotifications: true,
        })
      ).toBe(true);
    });

    it('should merge multiple legacy setting sources', () => {
      const mergeSettingSources = (
        localStorage: LegacySettings,
        cookies: LegacySettings,
        database: LegacySettings
      ): LegacySettings => {
        // Priority: database > localStorage > cookies
        return {
          ...cookies,
          ...localStorage,
          ...database,
        };
      };

      const cookies: LegacySettings = {
        theme: 'light-mode',
        notifications: false,
      };
      const storage: LegacySettings = { theme: 'dark-mode', language: 'en' };
      const db: LegacySettings = { emailAlerts: true };

      const merged = mergeSettingSources(storage, cookies, db);

      expect(merged.theme).toBe('dark-mode'); // From localStorage
      expect(merged.emailAlerts).toBe(true); // From database
      expect(merged.notifications).toBe(false); // From cookies
      expect(merged.language).toBe('en'); // From localStorage
    });
  });

  describe('Migration Versioning', () => {
    it('should track migration version', () => {
      interface VersionedSettings {
        version: number;
        settings: any;
      }

      const CURRENT_VERSION = 3;

      const needsMigration = (stored: VersionedSettings): boolean => {
        return stored.version < CURRENT_VERSION;
      };

      const applyMigrations = (
        stored: VersionedSettings
      ): VersionedSettings => {
        const settings = { ...stored.settings };
        let version = stored.version;

        // Apply migrations sequentially
        if (version < 1) {
          // V0 -> V1: Add privacy settings
          settings.privacy = {
            profile_visibility: 'public',
            show_online_status: true,
            allow_friend_requests: true,
          };
          version = 1;
        }

        if (version < 2) {
          // V1 -> V2: Split notifications
          settings.notifications = {
            email: settings.emailNotifications ?? true,
            push: settings.pushNotifications ?? true,
          };
          delete settings.emailNotifications;
          delete settings.pushNotifications;
          version = 2;
        }

        if (version < 3) {
          // V2 -> V3: Add preferences
          settings.preferences = {
            language: settings.language || 'en-US',
            timezone: 'UTC',
          };
          delete settings.language;
          version = 3;
        }

        return { version, settings };
      };

      const oldSettings: VersionedSettings = {
        version: 0,
        settings: {
          theme: 'dark',
          emailNotifications: false,
          language: 'fr',
        },
      };

      expect(needsMigration(oldSettings)).toBe(true);

      const migrated = applyMigrations(oldSettings);
      expect(migrated.version).toBe(3);
      expect(migrated.settings.privacy).toBeDefined();
      expect(migrated.settings.notifications.email).toBe(false);
      expect(migrated.settings.preferences.language).toBe('fr');
    });
  });
});
