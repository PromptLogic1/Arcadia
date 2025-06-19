import { describe, expect, it } from '@jest/globals';
import type { Database } from '@/types/database.types';

type User = Database['public']['Tables']['users']['Row'];

/**
 * Profile Score Tests
 *
 * Tests business logic for calculating profile completeness scores
 * and profile quality metrics.
 */

interface ProfileField {
  name: keyof User;
  weight: number;
  required?: boolean;
  validator?: (value: unknown) => boolean;
}

interface ProfileScore {
  completeness: number; // 0-100
  quality: number; // 0-100
  overall: number; // 0-100
  missingFields: string[];
  suggestions: string[];
}

// Profile fields and their weights for scoring
const PROFILE_FIELDS: ProfileField[] = [
  { name: 'username', weight: 10, required: true },
  { name: 'full_name', weight: 8 },
  {
    name: 'bio',
    weight: 15,
    validator: v => typeof v === 'string' && v.length >= 20,
  },
  {
    name: 'avatar_url',
    weight: 12,
    validator: v => typeof v === 'string' && v.startsWith('http'),
  },
  { name: 'city', weight: 5 },
  { name: 'region', weight: 5 },
  { name: 'land', weight: 5 },
  { name: 'experience_points', weight: 5 },
  { name: 'profile_visibility', weight: 3 },
  { name: 'achievements_visibility', weight: 3 },
  { name: 'submissions_visibility', weight: 3 },
];

// Quality factors that affect the profile score
const QUALITY_FACTORS = {
  hasCustomAvatar: 10,
  hasDetailedBio: 15, // Bio > 100 chars
  hasLocation: 10, // All location fields filled
  hasPrivacySettings: 5, // Custom visibility settings
  isActive: 10, // Recent login
  hasAchievements: 10, // Has unlocked achievements
  hasHighExperience: 10, // XP > 1000
};

function calculateProfileScore(profile: Partial<User>): ProfileScore {
  const missingFields: string[] = [];
  const suggestions: string[] = [];

  let completenessScore = 0;
  let totalWeight = 0;
  let qualityScore = 0;
  let maxQualityScore = 0;

  // Calculate completeness score
  PROFILE_FIELDS.forEach(field => {
    totalWeight += field.weight;
    const value = profile[field.name];

    if (value !== null && value !== undefined && value !== '') {
      if (field.validator) {
        if (field.validator(value)) {
          completenessScore += field.weight;
        } else {
          missingFields.push(String(field.name));
          suggestions.push(getFieldSuggestion(String(field.name), value));
        }
      } else {
        completenessScore += field.weight;
      }
    } else {
      missingFields.push(String(field.name));
      if (field.required) {
        suggestions.push(`${String(field.name)} is required`);
      }
    }
  });

  // Calculate quality score
  if (profile.avatar_url && !profile.avatar_url.includes('default')) {
    qualityScore += QUALITY_FACTORS.hasCustomAvatar;
  }
  maxQualityScore += QUALITY_FACTORS.hasCustomAvatar;

  if (profile.bio && profile.bio.length > 100) {
    qualityScore += QUALITY_FACTORS.hasDetailedBio;
  }
  maxQualityScore += QUALITY_FACTORS.hasDetailedBio;

  if (profile.city && profile.region && profile.land) {
    qualityScore += QUALITY_FACTORS.hasLocation;
  }
  maxQualityScore += QUALITY_FACTORS.hasLocation;

  if (
    profile.profile_visibility !== 'public' ||
    profile.achievements_visibility !== 'public' ||
    profile.submissions_visibility !== 'public'
  ) {
    qualityScore += QUALITY_FACTORS.hasPrivacySettings;
  }
  maxQualityScore += QUALITY_FACTORS.hasPrivacySettings;

  if (profile.last_login_at) {
    const lastLogin = new Date(profile.last_login_at);
    const daysSinceLogin =
      (Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLogin < 7) {
      qualityScore += QUALITY_FACTORS.isActive;
    }
  }
  maxQualityScore += QUALITY_FACTORS.isActive;

  // Assume achievements check would be done separately
  maxQualityScore += QUALITY_FACTORS.hasAchievements;

  if ((profile.experience_points || 0) > 1000) {
    qualityScore += QUALITY_FACTORS.hasHighExperience;
  }
  maxQualityScore += QUALITY_FACTORS.hasHighExperience;

  // Generate suggestions based on missing quality factors
  if (!profile.avatar_url || profile.avatar_url.includes('default')) {
    suggestions.push('Upload a custom avatar to personalize your profile');
  }

  if (!profile.bio || profile.bio.length < 20) {
    suggestions.push(
      'Add a bio (at least 20 characters) to tell others about yourself'
    );
  } else if (profile.bio.length < 100) {
    suggestions.push(
      'Expand your bio to over 100 characters for a better profile'
    );
  }

  if (!profile.city || !profile.region || !profile.land) {
    suggestions.push('Complete your location information');
  }

  // Calculate final scores
  const completenessPercentage = Math.round(
    (completenessScore / totalWeight) * 100
  );
  const qualityPercentage = Math.round((qualityScore / maxQualityScore) * 100);
  const overallPercentage = Math.round(
    completenessPercentage * 0.6 + qualityPercentage * 0.4
  );

  return {
    completeness: completenessPercentage,
    quality: qualityPercentage,
    overall: overallPercentage,
    missingFields: missingFields.filter(
      (field, index, self) => self.indexOf(field) === index
    ),
    suggestions: suggestions.filter(
      (s, index, self) => self.indexOf(s) === index
    ),
  };
}

function getFieldSuggestion(fieldName: string, currentValue: unknown): string {
  switch (fieldName) {
    case 'bio':
      return currentValue
        ? 'Your bio is too short (minimum 20 characters)'
        : 'Add a bio to your profile';
    case 'avatar_url':
      return 'Invalid avatar URL format';
    default:
      return `Update your ${fieldName}`;
  }
}

describe('Profile Score Calculator', () => {
  describe('Completeness Scoring', () => {
    it('should score 100% for a fully complete profile', () => {
      const profile: Partial<User> = {
        username: 'johndoe',
        full_name: 'John Doe',
        bio: 'I am a passionate gamer who loves challenges and achievements!',
        avatar_url: 'https://example.com/avatar.jpg',
        city: 'San Francisco',
        region: 'California',
        land: 'USA',
        experience_points: 500,
        profile_visibility: 'public',
        achievements_visibility: 'public',
        submissions_visibility: 'public',
      };

      const score = calculateProfileScore(profile);

      expect(score.completeness).toBe(100);
      expect(score.missingFields).toHaveLength(0);
    });

    it('should score 0% for an empty profile', () => {
      const profile: Partial<User> = {};

      const score = calculateProfileScore(profile);

      expect(score.completeness).toBe(0);
      expect(score.missingFields.length).toBeGreaterThan(0);
    });

    it('should calculate partial scores correctly', () => {
      const profile: Partial<User> = {
        username: 'johndoe',
        bio: 'Short bio',
        // Missing other fields
      };

      const score = calculateProfileScore(profile);

      expect(score.completeness).toBeGreaterThan(0);
      expect(score.completeness).toBeLessThan(100);
      expect(score.missingFields).toContain('avatar_url');
      expect(score.missingFields).toContain('full_name');
    });

    it('should validate bio length', () => {
      const shortBioProfile: Partial<User> = {
        username: 'user1',
        bio: 'Too short', // Less than 20 chars
      };

      const score = calculateProfileScore(shortBioProfile);

      expect(score.missingFields).toContain('bio');
      expect(score.suggestions).toContain(
        'Your bio is too short (minimum 20 characters)'
      );
    });

    it('should validate avatar URL format', () => {
      const invalidAvatarProfile: Partial<User> = {
        username: 'user1',
        avatar_url: 'not-a-url',
      };

      const score = calculateProfileScore(invalidAvatarProfile);

      expect(score.missingFields).toContain('avatar_url');
      expect(score.suggestions).toContain('Invalid avatar URL format');
    });
  });

  describe('Quality Scoring', () => {
    it('should reward custom avatars', () => {
      const profileWithDefault: Partial<User> = {
        username: 'user1',
        avatar_url: 'https://example.com/default-avatar.jpg',
      };

      const profileWithCustom: Partial<User> = {
        username: 'user1',
        avatar_url: 'https://example.com/custom-avatar.jpg',
      };

      const scoreDefault = calculateProfileScore(profileWithDefault);
      const scoreCustom = calculateProfileScore(profileWithCustom);

      expect(scoreCustom.quality).toBeGreaterThan(scoreDefault.quality);
    });

    it('should reward detailed bios', () => {
      const shortBio: Partial<User> = {
        username: 'user1',
        bio: 'I like games and stuff.',
      };

      const detailedBio: Partial<User> = {
        username: 'user1',
        bio: 'I am an avid gamer with over 10 years of experience. I specialize in speedrunning platformers and love participating in community events. Always looking for new challenges!',
      };

      const scoreShort = calculateProfileScore(shortBio);
      const scoreDetailed = calculateProfileScore(detailedBio);

      expect(scoreDetailed.quality).toBeGreaterThan(scoreShort.quality);
      expect(scoreShort.suggestions).toContain(
        'Expand your bio to over 100 characters for a better profile'
      );
    });

    it('should reward complete location information', () => {
      const partialLocation: Partial<User> = {
        username: 'user1',
        city: 'San Francisco',
      };

      const completeLocation: Partial<User> = {
        username: 'user1',
        city: 'San Francisco',
        region: 'California',
        land: 'USA',
      };

      const scorePartial = calculateProfileScore(partialLocation);
      const scoreComplete = calculateProfileScore(completeLocation);

      expect(scoreComplete.quality).toBeGreaterThan(scorePartial.quality);
      expect(scorePartial.suggestions).toContain(
        'Complete your location information'
      );
    });

    it('should reward custom privacy settings', () => {
      const defaultPrivacy: Partial<User> = {
        username: 'user1',
        profile_visibility: 'public',
        achievements_visibility: 'public',
        submissions_visibility: 'public',
      };

      const customPrivacy: Partial<User> = {
        username: 'user1',
        profile_visibility: 'friends',
        achievements_visibility: 'private',
        submissions_visibility: 'friends',
      };

      const scoreDefault = calculateProfileScore(defaultPrivacy);
      const scoreCustom = calculateProfileScore(customPrivacy);

      expect(scoreCustom.quality).toBeGreaterThan(scoreDefault.quality);
    });

    it('should reward recent activity', () => {
      const inactiveProfile: Partial<User> = {
        username: 'user1',
        last_login_at: new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days ago
      };

      const activeProfile: Partial<User> = {
        username: 'user1',
        last_login_at: new Date(
          Date.now() - 2 * 24 * 60 * 60 * 1000
        ).toISOString(), // 2 days ago
      };

      const scoreInactive = calculateProfileScore(inactiveProfile);
      const scoreActive = calculateProfileScore(activeProfile);

      expect(scoreActive.quality).toBeGreaterThan(scoreInactive.quality);
    });

    it('should reward high experience', () => {
      const lowXP: Partial<User> = {
        username: 'user1',
        experience_points: 100,
      };

      const highXP: Partial<User> = {
        username: 'user1',
        experience_points: 2000,
      };

      const scoreLow = calculateProfileScore(lowXP);
      const scoreHigh = calculateProfileScore(highXP);

      expect(scoreHigh.quality).toBeGreaterThan(scoreLow.quality);
    });
  });

  describe('Overall Score Calculation', () => {
    it('should weight completeness at 60% and quality at 40%', () => {
      const profile: Partial<User> = {
        username: 'user1',
        full_name: 'User One',
        // Partial profile
      };

      const score = calculateProfileScore(profile);
      const expectedOverall = Math.round(
        score.completeness * 0.6 + score.quality * 0.4
      );

      expect(score.overall).toBe(expectedOverall);
    });

    it('should handle edge case scores', () => {
      // Perfect profile
      const perfectProfile: Partial<User> = {
        username: 'perfectuser',
        full_name: 'Perfect User',
        bio: 'This is a detailed bio that describes my gaming interests, achievements, and what I love about the community. I enjoy helping others and participating in events.',
        avatar_url: 'https://example.com/perfect-avatar.jpg',
        city: 'San Francisco',
        region: 'California',
        land: 'USA',
        experience_points: 5000,
        profile_visibility: 'friends',
        achievements_visibility: 'friends',
        submissions_visibility: 'private',
        last_login_at: new Date().toISOString(),
      };

      const perfectScore = calculateProfileScore(perfectProfile);

      expect(perfectScore.completeness).toBe(100);
      expect(perfectScore.quality).toBeGreaterThan(80);
      expect(perfectScore.overall).toBeGreaterThan(90);
    });
  });

  describe('Suggestions Generation', () => {
    it('should provide helpful suggestions for improvement', () => {
      const profile: Partial<User> = {
        username: 'user1',
        bio: 'Hi',
        avatar_url: 'https://example.com/default.jpg',
      };

      const score = calculateProfileScore(profile);

      expect(score.suggestions).toContain(
        'Your bio is too short (minimum 20 characters)'
      );
      expect(score.suggestions).toContain(
        'Upload a custom avatar to personalize your profile'
      );
      expect(score.suggestions).toContain('Complete your location information');
    });

    it('should not duplicate suggestions', () => {
      const profile: Partial<User> = {};

      const score = calculateProfileScore(profile);
      const uniqueSuggestions = new Set(score.suggestions);

      expect(uniqueSuggestions.size).toBe(score.suggestions.length);
    });

    it('should prioritize required fields in suggestions', () => {
      const profile: Partial<User> = {
        bio: 'Some bio text here',
      };

      const score = calculateProfileScore(profile);

      expect(score.suggestions.some(s => s.includes('required'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', () => {
      const profile: Partial<User> = {
        username: 'user1',
        full_name: null,
        bio: undefined,
        city: '',
        region: null,
        avatar_url: undefined,
      };

      const score = calculateProfileScore(profile);

      expect(score.completeness).toBeGreaterThan(0); // Has username
      expect(score.completeness).toBeLessThan(100);
      expect(score.missingFields).toContain('full_name');
      expect(score.missingFields).toContain('bio');
      expect(score.missingFields).toContain('city');
    });

    it('should handle very long field values', () => {
      const profile: Partial<User> = {
        username: 'user1',
        bio: 'A'.repeat(1000), // Very long bio
        full_name: 'B'.repeat(200), // Very long name
      };

      const score = calculateProfileScore(profile);

      expect(score.completeness).toBeGreaterThan(0);
      expect(score.quality).toBeGreaterThan(0); // Long bio should boost quality
    });

    it('should handle special characters in fields', () => {
      const profile: Partial<User> = {
        username: 'user_123',
        full_name: 'John "The Gamer" Doe',
        bio: 'I love gaming! 🎮 #Gamer4Life',
        city: 'São Paulo',
        region: 'SP',
        land: 'Brasil 🇧🇷',
      };

      const score = calculateProfileScore(profile);

      expect(score.completeness).toBeGreaterThan(0);
      expect(() => calculateProfileScore(profile)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should calculate scores efficiently for many profiles', () => {
      const profiles = Array.from({ length: 1000 }, (_, i) => ({
        username: `user${i}`,
        full_name: i % 2 === 0 ? `User ${i}` : null,
        bio: i % 3 === 0 ? 'A'.repeat(50 + (i % 100)) : null,
        experience_points: i * 10,
        last_login_at: new Date(
          Date.now() - i * 24 * 60 * 60 * 1000
        ).toISOString(),
      }));

      const startTime = performance.now();

      profiles.forEach(profile => {
        calculateProfileScore(profile);
      });

      const endTime = performance.now();
      const avgTime = (endTime - startTime) / profiles.length;

      // Should process each profile in less than 0.5ms
      expect(avgTime).toBeLessThan(0.5);
    });
  });
});
