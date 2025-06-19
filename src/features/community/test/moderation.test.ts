import { describe, it, expect } from '@jest/globals';
import {
  calculateSpamScore,
  moderateContent,
  PERMISSION_MATRIX,
  type UserTrustLevel,
} from '../services/moderation-service';

describe('Content Moderation Service', () => {
  describe('Spam Detection Algorithm', () => {
    it('should detect obvious spam patterns with high confidence', () => {
      const spamContent = [
        'BUY NOW!!! CLICK HERE FOR FREE MONEY!!!',
        'CONGRATULATIONS! YOU WON $1000000!!!',
        'LIMITED TIME OFFER! WORK FROM HOME!',
        'Make money fast! Click here now!',
      ];

      spamContent.forEach(content => {
        const result = calculateSpamScore(content);
        expect(result.score).toBeGreaterThan(0.7);
        expect(result.confidence).toBe('high');
        expect(result.reasons.length).toBeGreaterThan(0);
      });

      // Specifically test caps detection on caps-heavy content
      const capsSpamContent = [
        'BUY NOW!!! CLICK HERE FOR FREE MONEY!!!',
        'CONGRATULATIONS! YOU WON $1000000!!!',
        'LIMITED TIME OFFER! WORK FROM HOME!',
      ];

      capsSpamContent.forEach(content => {
        const result = calculateSpamScore(content);
        expect(result.reasons).toContain('Excessive capitalization');
      });
    });

    it('should detect subtle spam patterns with medium confidence', () => {
      const subtleSpam = [
        'Check out this amazing opportunity to earn money',
        'This investment strategy will make you rich',
        'Visit my site for great deals: bit.ly/abc123',
      ];

      subtleSpam.forEach(content => {
        const result = calculateSpamScore(content);
        expect(result.score).toBeGreaterThan(0.4);
        expect(result.score).toBeLessThan(0.8);
        expect(['medium', 'low']).toContain(result.confidence);
      });
    });

    it('should detect repetitive content and link spam', () => {
      const repetitiveSpam = 'buy buy buy buy cheap gold here';
      const linkSpam =
        'Check these links: http://site1.com http://site2.com http://site3.com http://site4.com';

      const repetitiveResult = calculateSpamScore(repetitiveSpam);
      expect(repetitiveResult.reasons).toContain('Repetitive text');

      const linkResult = calculateSpamScore(linkSpam);
      expect(linkResult.reasons).toContain('Too many URLs');
      expect(linkResult.score).toBeGreaterThan(0.6);
    });

    it('should allow legitimate promotional content with proper context', () => {
      const legitimateContent = [
        "I created a highlights video from last week's tournament. It shows some advanced techniques.",
        "Here's my guide on speedrun optimization techniques",
        'Sharing my tournament experience and what I learned',
      ];

      legitimateContent.forEach(content => {
        const result = calculateSpamScore(content);
        expect(result.score).toBeLessThan(0.5);
        expect(result.confidence).toBe('low');
      });
    });

    it('should detect advanced spam evasion techniques', () => {
      const evasionContent = [
        'B.U.Y N.O.W for ch3ap g0ld',
        'Fr33 m0n3y! Cl1ck h3r3!',
        'B u y   n o w   c h e a p',
      ];

      evasionContent.forEach(content => {
        const result = calculateSpamScore(content);
        expect(result.score).toBeGreaterThan(0.5);
        expect(
          result.reasons.some(
            r =>
              r.includes('obfuscation') ||
              r.includes('substitution') ||
              r.includes('Spaced out text')
          )
        ).toBe(true);
      });
    });

    it('should detect multilingual spam patterns', () => {
      const multilingualSpam = [
        { content: 'Compra oro barato aquí!', lang: 'Spanish' },
        { content: 'Argent gratuit! Cliquez ici!', lang: 'French' },
        { content: 'Kostenlos Geld! Hier klicken!', lang: 'German' },
      ];

      multilingualSpam.forEach(({ content, lang }) => {
        const result = calculateSpamScore(content);
        expect(result.score).toBeGreaterThan(0.6);
        expect(result.reasons).toContain(`${lang} spam detected`);
      });
    });

    it('should adjust scoring for gaming context', () => {
      const gamingContent = [
        'Free play mode is amazing! Great value for money saved.',
        'Best gold farming strategy guide for beginners.',
        'Looking to trade my shiny Charizard for Blastoise.',
      ];

      gamingContent.forEach(content => {
        const result = calculateSpamScore(content);
        // Should have lower scores due to gaming context
        expect(result.score).toBeLessThan(0.5);
      });
    });

    it('should detect account trading and boost services', () => {
      const tosViolations = [
        'Selling high level account with rare items',
        'Boost service available - level up fast!',
        'Power leveling service for cheap',
      ];

      tosViolations.forEach(content => {
        const result = calculateSpamScore(content);
        expect(result.score).toBeGreaterThan(0.6);
        expect(
          result.reasons.some(
            r => r.includes('Account trading') || r.includes('Boost service')
          )
        ).toBe(true);
      });
    });
  });

  describe('User Trust Level Moderation', () => {
    const testCases: Array<{
      user: UserTrustLevel;
      content: string;
      expectedAction: string;
    }> = [
      {
        user: {
          level: 'new',
          reputation: 0,
          accountAge: 0,
          violations: 0,
          permissions: ['read'],
        },
        content: 'BUY NOW!!! FREE MONEY!!!',
        expectedAction: 'auto_remove',
      },
      {
        user: {
          level: 'basic',
          reputation: 20,
          accountAge: 10,
          violations: 0,
          permissions: ['read', 'write'],
        },
        content: 'Check out my website for tips',
        expectedAction: 'require_review',
      },
      {
        user: {
          level: 'regular',
          reputation: 150,
          accountAge: 90,
          violations: 0,
          permissions: ['read', 'write', 'vote'],
        },
        content: 'Check out my website for tips',
        expectedAction: 'approve',
      },
      {
        user: {
          level: 'trusted',
          reputation: 500,
          accountAge: 365,
          violations: 0,
          permissions: ['read', 'write', 'vote', 'flag'],
        },
        content: 'AMAZING DEAL!!!',
        expectedAction: 'approve',
      },
      {
        user: {
          level: 'moderator',
          reputation: 1000,
          accountAge: 730,
          violations: 0,
          permissions: ['all'],
        },
        content: 'BUY NOW!!! FREE MONEY!!!',
        expectedAction: 'approve',
      },
    ];

    testCases.forEach(({ user, content, expectedAction }) => {
      it(`should apply ${expectedAction} action for ${user.level} user`, () => {
        const result = moderateContent(content, user);
        expect(result.action).toBe(expectedAction);
      });
    });
  });

  describe('Content Classification', () => {
    it('should classify inappropriate content correctly', () => {
      const inappropriateContent = [
        'This f*** game is s***!',
        'I hate all these people',
        'XXX adult content here',
      ];

      inappropriateContent.forEach(content => {
        const user: UserTrustLevel = {
          level: 'regular',
          reputation: 100,
          accountAge: 30,
          violations: 0,
          permissions: ['read', 'write', 'vote'],
        };
        const result = moderateContent(content, user);
        expect(result.classification).toBe('inappropriate');
      });
    });

    it('should classify phishing attempts correctly', () => {
      const phishingContent = [
        'Your account will be suspended! Verify immediately!',
        'Send bitcoin to this address to double your crypto',
        'Click this shortened link: bit.ly/verify-account',
      ];

      phishingContent.forEach(content => {
        const user: UserTrustLevel = {
          level: 'basic',
          reputation: 20,
          accountAge: 10,
          violations: 0,
          permissions: ['read', 'write'],
        };
        const result = moderateContent(content, user);
        expect(result.classification).toBe('phishing');
        expect(['auto_remove', 'require_review']).toContain(result.action);
      });
    });
  });

  describe('Permission Matrix', () => {
    it('should enforce correct permissions for each user level', () => {
      const levels: Array<keyof typeof PERMISSION_MATRIX> = [
        'new',
        'basic',
        'regular',
        'trusted',
        'moderator',
      ];

      levels.forEach(level => {
        const permissions = PERMISSION_MATRIX[level];

        switch (level) {
          case 'new':
            expect(permissions.canComment).toBe(true);
            expect(permissions.canCreateDiscussion).toBe(false);
            expect(permissions.canUpvote).toBe(false);
            expect(permissions.dailyLimits.comments).toBe(5);
            break;

          case 'basic':
            expect(permissions.canComment).toBe(true);
            expect(permissions.canCreateDiscussion).toBe(true);
            expect(permissions.canUpvote).toBe(true);
            expect(permissions.dailyLimits.comments).toBe(20);
            expect(permissions.dailyLimits.discussions).toBe(3);
            break;

          case 'regular':
            expect(permissions.canDelete).toBe(true);
            expect(permissions.canModerate).toBe(false);
            expect(permissions.dailyLimits.comments).toBe(50);
            break;

          case 'trusted':
            expect(permissions.dailyLimits.comments).toBe(100);
            expect(permissions.dailyLimits.discussions).toBe(20);
            break;

          case 'moderator':
            expect(permissions.canModerate).toBe(true);
            expect(permissions.canEdit).toBe(true);
            expect(permissions.canDelete).toBe(true);
            expect(permissions.dailyLimits.comments).toBe(-1); // unlimited
            break;
        }
      });
    });

    it('should enforce daily limits based on user level', () => {
      const newUser = PERMISSION_MATRIX.new;
      const regularUser = PERMISSION_MATRIX.regular;
      const moderator = PERMISSION_MATRIX.moderator;

      expect(newUser.dailyLimits.comments).toBeLessThan(
        regularUser.dailyLimits.comments
      );
      expect(moderator.dailyLimits.comments).toBe(-1); // unlimited
      // Moderator has unlimited (represented as -1) which is conceptually greater than regular user
      expect(regularUser.dailyLimits.comments).toBeGreaterThan(0); // finite limit
    });
  });

  describe('Moderation Metadata', () => {
    it('should include comprehensive metadata in moderation results', () => {
      const content = 'Check out this amazing opportunity!';
      const user: UserTrustLevel = {
        level: 'regular',
        reputation: 150,
        accountAge: 90,
        violations: 0,
        permissions: ['read', 'write', 'vote'],
      };

      const result = moderateContent(content, user);

      expect(result.metadata).toBeDefined();
      expect(result.metadata?.spamScore).toBeDefined();
      expect(result.metadata?.userTrustLevel).toBe('regular');
      expect(result.metadata?.contentLength).toBe(content.length);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const result = calculateSpamScore('');
      expect(result.score).toBe(0);
      expect(result.reasons).toHaveLength(0);
    });

    it('should handle very long content', () => {
      const longContent = 'a'.repeat(5000);
      const result = calculateSpamScore(longContent);
      expect(result.score).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should handle Unicode and emoji content', () => {
      const unicodeContent =
        '🎮 Gaming discussion with émojis and spéciál characters 日本語 العربية 🚀';
      const result = calculateSpamScore(unicodeContent);
      expect(result.score).toBeLessThan(0.5); // Should not flag as spam
    });

    it('should handle mixed legitimate and spam content', () => {
      const mixedContent =
        'This is a great strategy guide. BUY NOW for more tips!';
      const result = calculateSpamScore(mixedContent);
      expect(result.score).toBeGreaterThan(0.3);
      expect(result.score).toBeLessThan(0.8);
    });
  });

  describe('Content Sanitization', () => {
    it('should detect XSS attempts', () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      ];

      xssAttempts.forEach(content => {
        const user: UserTrustLevel = {
          level: 'regular',
          reputation: 100,
          accountAge: 30,
          violations: 0,
          permissions: ['read', 'write', 'vote'],
        };
        const result = moderateContent(content, user);
        // Should be flagged as suspicious or require review
        expect(['suspicious', 'inappropriate']).toContain(
          result.classification
        );
      });
    });
  });
});
