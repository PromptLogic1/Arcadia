import type { Tables } from '@/types/database.types';

/**
 * Moderation Test Patterns
 * 
 * Comprehensive patterns for testing content moderation,
 * spam detection, and user permission systems
 */

// Content classification types
export type ContentClassification = 'safe' | 'spam' | 'inappropriate' | 'suspicious' | 'phishing';
export type ModerationAction = 'approve' | 'auto_flag' | 'auto_remove' | 'require_review' | 'shadowban';

// Moderation result interface
export interface ModerationResult {
  classification: ContentClassification;
  action: ModerationAction;
  confidence: number;
  reasons: string[];
  metadata?: Record<string, any>;
}

// User trust levels
export interface UserTrustLevel {
  level: 'new' | 'basic' | 'regular' | 'trusted' | 'moderator';
  reputation: number;
  accountAge: number; // days
  violations: number;
  permissions: string[];
}

// Spam detection patterns
export const SPAM_PATTERNS = {
  // Excessive capitalization
  allCaps: {
    pattern: /^[A-Z\s!?.,]{20,}$/,
    weight: 0.8,
    reason: 'Excessive capitalization',
  },
  
  // Multiple exclamation marks
  excessivePunctuation: {
    pattern: /[!?]{3,}/,
    weight: 0.6,
    reason: 'Excessive punctuation',
  },
  
  // Common spam phrases
  spamPhrases: {
    patterns: [
      /buy\s+now/i,
      /click\s+here/i,
      /limited\s+time\s+offer/i,
      /congratulations.*won/i,
      /free\s+money/i,
      /make\s+money\s+fast/i,
      /work\s+from\s+home/i,
      /lose\s+weight\s+fast/i,
    ],
    weight: 0.9,
    reason: 'Contains spam phrases',
  },
  
  // Multiple URLs
  excessiveUrls: {
    pattern: /(https?:\/\/[^\s]+)/g,
    threshold: 3,
    weight: 0.7,
    reason: 'Too many URLs',
  },
  
  // Repeated text
  repetition: {
    pattern: /(\b\w+\b)(?:\s+\1){3,}/i,
    weight: 0.6,
    reason: 'Repetitive text',
  },
  
  // Currency symbols with numbers
  monetarySpam: {
    pattern: /[$£€¥]\s*\d+/,
    weight: 0.5,
    reason: 'Monetary spam indicators',
  },
};

// Inappropriate content patterns
export const INAPPROPRIATE_PATTERNS = {
  // Profanity (using masked patterns for testing)
  profanity: {
    patterns: [
      /\bf[*@#]+k/i,
      /\bs[*@#]+t/i,
      /\ba[*@#]+s/i,
      /\bd[*@#]+n/i,
    ],
    weight: 0.9,
    reason: 'Contains profanity',
  },
  
  // Hate speech indicators (simplified for testing)
  hateIndicators: {
    patterns: [
      /hate.*(?:group|people|race|religion)/i,
      /all.*(?:bad|evil|stupid)/i,
    ],
    weight: 1.0,
    reason: 'Potential hate speech',
  },
  
  // Adult content indicators
  adultContent: {
    patterns: [
      /\b(?:xxx|porn|adult)\b/i,
      /\b18\+\s*only\b/i,
    ],
    weight: 0.8,
    reason: 'Adult content indicators',
  },
};

// Phishing patterns
export const PHISHING_PATTERNS = {
  // Suspicious domains
  suspiciousDomains: {
    patterns: [
      /bit\.ly/i,
      /tinyurl/i,
      /goo\.gl/i,
      /short\.link/i,
    ],
    weight: 0.6,
    reason: 'URL shortener detected',
  },
  
  // Account theft attempts
  accountTheft: {
    patterns: [
      /verify.*account/i,
      /suspended.*account/i,
      /click.*immediately/i,
      /urgent.*action.*required/i,
    ],
    weight: 0.8,
    reason: 'Potential phishing attempt',
  },
  
  // Cryptocurrency scams
  cryptoScams: {
    patterns: [
      /send.*(?:bitcoin|btc|ethereum|eth)/i,
      /crypto.*wallet.*address/i,
      /double.*your.*crypto/i,
    ],
    weight: 0.9,
    reason: 'Cryptocurrency scam indicators',
  },
};

// Advanced spam evasion patterns
export const ADVANCED_SPAM_PATTERNS = {
  // Text obfuscation and leetspeak
  obfuscation: {
    patterns: [
      /b[.uw]y\s*n[o0]w/i,
      /fr[e3][e3]\s*m[o0]n[e3]y/i,
      /cl[i1]ck\s*h[e3]r[e3]/i,
      /[gG]0ld.*ch[e3][a4]p/i,
    ],
    weight: 0.8,
    reason: 'Text obfuscation detected',
  },

  // Character substitution
  characterSubstitution: {
    patterns: [
      /[B8][UuYy][Yy]\s*[NnMm][O0o][WwVv]/i,
      /[CcGg][LlIi][IiYy][CcGg][Kk]/i,
      /[Ff][Rr][Ee3][Ee3]/i,
    ],
    weight: 0.7,
    reason: 'Character substitution spam',
  },

  // Spaced out text
  spacedText: {
    pattern: /\b(\w)\s+(\w)\s+(\w)\s+(\w)/,
    weight: 0.6,
    reason: 'Spaced out text to evade filters',
  },

  // Domain masking
  domainMasking: {
    patterns: [
      /[a-z0-9]+\.c[o0]m/i,
      /[a-z0-9]+\.[xyz]/i,
      /[a-z0-9]+\.cc/i,
    ],
    weight: 0.5,
    reason: 'Suspicious domain pattern',
  },
};

// Multilingual spam patterns
export const MULTILINGUAL_SPAM_PATTERNS = {
  spanish: {
    patterns: [
      /compra.*oro.*barato/i,
      /dinero.*gratis/i,
      /oferta.*especial/i,
    ],
    weight: 0.8,
    reason: 'Spanish spam detected',
  },
  
  french: {
    patterns: [
      /argent.*gratuit/i,
      /cliquez.*ici/i,
      /offre.*spéciale/i,
    ],
    weight: 0.8,
    reason: 'French spam detected',
  },
  
  german: {
    patterns: [
      /kostenlos.*geld/i,
      /hier.*klicken/i,
      /sonderangebot/i,
    ],
    weight: 0.8,
    reason: 'German spam detected',
  },
};

// Context-aware patterns for gaming communities
export const GAMING_CONTEXT_PATTERNS = {
  // Legitimate gaming terms that might trigger false positives
  legitimateGaming: {
    patterns: [
      /free.*play.*mode/i,
      /gold.*farming.*strategy/i,
      /money.*making.*guide/i,
      /buy.*items.*ingame/i,
    ],
    weight: -0.3, // Negative weight to reduce spam score
    reason: 'Legitimate gaming content',
  },

  // Account selling/trading (against TOS)
  accountTrading: {
    patterns: [
      /selling.*account/i,
      /account.*for.*sale/i,
      /high.*level.*account/i,
      /rare.*items.*account/i,
    ],
    weight: 0.9,
    reason: 'Account trading detected',
  },

  // Boost services
  boostServices: {
    patterns: [
      /boost.*service/i,
      /level.*up.*fast/i,
      /power.*leveling/i,
      /carry.*service/i,
    ],
    weight: 0.7,
    reason: 'Boost service offering',
  },
};

// Enhanced spam score calculation with all pattern types
export function calculateSpamScore(content: string): {
  score: number;
  reasons: string[];
  confidence: 'high' | 'medium' | 'low';
} {
  let totalScore = 0;
  const reasons: string[] = [];
  
  // Check all caps
  if (SPAM_PATTERNS.allCaps.pattern.test(content)) {
    totalScore += SPAM_PATTERNS.allCaps.weight;
    reasons.push(SPAM_PATTERNS.allCaps.reason);
  }
  
  // Check excessive punctuation
  if (SPAM_PATTERNS.excessivePunctuation.pattern.test(content)) {
    totalScore += SPAM_PATTERNS.excessivePunctuation.weight;
    reasons.push(SPAM_PATTERNS.excessivePunctuation.reason);
  }
  
  // Check spam phrases
  for (const pattern of SPAM_PATTERNS.spamPhrases.patterns) {
    if (pattern.test(content)) {
      totalScore += SPAM_PATTERNS.spamPhrases.weight;
      reasons.push(SPAM_PATTERNS.spamPhrases.reason);
      break; // Only count once
    }
  }
  
  // Check URL count
  const urlMatches = content.match(SPAM_PATTERNS.excessiveUrls.pattern) || [];
  if (urlMatches.length >= SPAM_PATTERNS.excessiveUrls.threshold) {
    totalScore += SPAM_PATTERNS.excessiveUrls.weight;
    reasons.push(SPAM_PATTERNS.excessiveUrls.reason);
  }
  
  // Check repetition
  if (SPAM_PATTERNS.repetition.pattern.test(content)) {
    totalScore += SPAM_PATTERNS.repetition.weight;
    reasons.push(SPAM_PATTERNS.repetition.reason);
  }
  
  // Check monetary spam
  if (SPAM_PATTERNS.monetarySpam.pattern.test(content)) {
    totalScore += SPAM_PATTERNS.monetarySpam.weight;
    reasons.push(SPAM_PATTERNS.monetarySpam.reason);
  }
  
  // Advanced spam patterns
  for (const [key, config] of Object.entries(ADVANCED_SPAM_PATTERNS)) {
    if (config.patterns) {
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          totalScore += config.weight;
          reasons.push(config.reason);
          break;
        }
      }
    } else if (config.pattern && config.pattern.test(content)) {
      totalScore += config.weight;
      reasons.push(config.reason);
    }
  }
  
  // Multilingual spam patterns
  for (const [lang, config] of Object.entries(MULTILINGUAL_SPAM_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        totalScore += config.weight;
        reasons.push(config.reason);
        break;
      }
    }
  }
  
  // Gaming context patterns
  for (const [key, config] of Object.entries(GAMING_CONTEXT_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        totalScore += config.weight;
        if (config.weight > 0) {
          reasons.push(config.reason);
        }
        break;
      }
    }
  }

  return {
    score: Math.max(0, Math.min(totalScore, 1)), // Ensure score is between 0 and 1
    reasons,
    confidence: totalScore >= 0.8 ? 'high' : totalScore >= 0.5 ? 'medium' : 'low',
  };
}

// Moderate content based on all factors
export function moderateContent(
  content: string,
  author: UserTrustLevel
): ModerationResult {
  const spamResult = calculateSpamScore(content);
  let classification: ContentClassification = 'safe';
  let action: ModerationAction = 'approve';
  const reasons: string[] = [];
  let confidence = 0;
  
  // Check spam
  if (spamResult.score > 0.7) {
    classification = 'spam';
    reasons.push(...spamResult.reasons);
    confidence = spamResult.score;
  }
  
  // Check inappropriate content
  for (const [key, config] of Object.entries(INAPPROPRIATE_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        classification = 'inappropriate';
        reasons.push(config.reason);
        confidence = Math.max(confidence, config.weight);
        break;
      }
    }
  }
  
  // Check phishing
  for (const [key, config] of Object.entries(PHISHING_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        classification = 'phishing';
        reasons.push(config.reason);
        confidence = Math.max(confidence, config.weight);
        break;
      }
    }
  }
  
  // Determine action based on classification and user trust
  if (classification === 'safe') {
    action = 'approve';
  } else {
    // Adjust based on user trust level
    switch (author.level) {
      case 'new':
        // Strict moderation for new users
        action = confidence > 0.5 ? 'auto_remove' : 'require_review';
        break;
      case 'basic':
        action = confidence > 0.7 ? 'auto_flag' : 'require_review';
        break;
      case 'regular':
        action = confidence > 0.8 ? 'require_review' : 'approve';
        break;
      case 'trusted':
        action = confidence > 0.9 ? 'require_review' : 'approve';
        break;
      case 'moderator':
        // Moderators are exempt
        action = 'approve';
        break;
    }
    
    // Override for severe violations
    if (classification === 'inappropriate' && confidence > 0.9) {
      action = 'auto_remove';
    }
    if (classification === 'phishing') {
      action = author.level === 'moderator' ? 'require_review' : 'auto_remove';
    }
  }
  
  return {
    classification,
    action,
    confidence,
    reasons,
    metadata: {
      spamScore: spamResult.score,
      userTrustLevel: author.level,
      contentLength: content.length,
    },
  };
}

// Permission matrix for different user levels
export const PERMISSION_MATRIX = {
  new: {
    canComment: true,
    canCreateDiscussion: false,
    canUpvote: false,
    canReport: true,
    canEdit: false,
    canDelete: false,
    canModerate: false,
    dailyLimits: {
      comments: 5,
      discussions: 0,
      reports: 3,
    },
  },
  basic: {
    canComment: true,
    canCreateDiscussion: true,
    canUpvote: true,
    canReport: true,
    canEdit: true, // own content only
    canDelete: false,
    canModerate: false,
    dailyLimits: {
      comments: 20,
      discussions: 3,
      reports: 10,
    },
  },
  regular: {
    canComment: true,
    canCreateDiscussion: true,
    canUpvote: true,
    canReport: true,
    canEdit: true, // own content only
    canDelete: true, // own content only
    canModerate: false,
    dailyLimits: {
      comments: 50,
      discussions: 10,
      reports: 20,
    },
  },
  trusted: {
    canComment: true,
    canCreateDiscussion: true,
    canUpvote: true,
    canReport: true,
    canEdit: true, // own content only
    canDelete: true, // own content only
    canModerate: false,
    dailyLimits: {
      comments: 100,
      discussions: 20,
      reports: 50,
    },
  },
  moderator: {
    canComment: true,
    canCreateDiscussion: true,
    canUpvote: true,
    canReport: true,
    canEdit: true, // any content
    canDelete: true, // any content
    canModerate: true,
    dailyLimits: {
      comments: -1, // unlimited
      discussions: -1,
      reports: -1,
    },
  },
};

// Test scenarios for moderation
export const MODERATION_TEST_SCENARIOS = [
  {
    name: 'New user posting spam',
    content: 'BUY NOW!!! CLICK HERE FOR FREE MONEY!!!',
    user: { level: 'new', reputation: 0, accountAge: 0, violations: 0 } as UserTrustLevel,
    expectedClassification: 'spam',
    expectedAction: 'auto_remove',
  },
  {
    name: 'Regular user with mild spam',
    content: 'Check out my new website: example.com',
    user: { level: 'regular', reputation: 100, accountAge: 90, violations: 0 } as UserTrustLevel,
    expectedClassification: 'safe',
    expectedAction: 'approve',
  },
  {
    name: 'Phishing attempt from basic user',
    content: 'Your account will be suspended! Click here immediately to verify.',
    user: { level: 'basic', reputation: 20, accountAge: 10, violations: 1 } as UserTrustLevel,
    expectedClassification: 'phishing',
    expectedAction: 'auto_remove',
  },
  {
    name: 'Inappropriate content from trusted user',
    content: 'This f*** game is s***!',
    user: { level: 'trusted', reputation: 500, accountAge: 365, violations: 0 } as UserTrustLevel,
    expectedClassification: 'inappropriate',
    expectedAction: 'require_review',
  },
  {
    name: 'Legitimate enthusiastic post',
    content: 'WOW! I just beat my personal record! This strategy is AMAZING!',
    user: { level: 'regular', reputation: 150, accountAge: 120, violations: 0 } as UserTrustLevel,
    expectedClassification: 'safe',
    expectedAction: 'approve',
  },
];

// Report types and handling
export interface ContentReport {
  id: string;
  contentId: string;
  contentType: 'discussion' | 'comment';
  reporterId: string;
  reason: ReportReason;
  additionalInfo?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resolution?: string;
}

export type ReportReason = 
  | 'spam'
  | 'inappropriate'
  | 'harassment'
  | 'misinformation'
  | 'off_topic'
  | 'duplicate'
  | 'other';

// Generate test report
export function generateTestReport(overrides?: Partial<ContentReport>): ContentReport {
  return {
    id: `report-${Date.now()}`,
    contentId: `content-${Math.random()}`,
    contentType: 'comment',
    reporterId: `user-${Math.random()}`,
    reason: 'spam',
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}