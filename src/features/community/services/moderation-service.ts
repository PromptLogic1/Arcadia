// Moderation Service - Business Logic for Content Moderation
// This file contains the core business logic extracted from E2E tests

export type ContentClassification = 'safe' | 'spam' | 'inappropriate' | 'suspicious' | 'phishing';
export type ModerationAction = 'approve' | 'auto_flag' | 'auto_remove' | 'require_review' | 'shadowban';
export type TrustLevel = 'new' | 'basic' | 'regular' | 'trusted' | 'moderator' | 'banned';

export interface UserTrustLevel {
  level: TrustLevel;
  reputation: number;
  accountAge: number; // days
  violations: number;
  permissions: string[];
}

export interface ModerationResult {
  classification: ContentClassification;
  action: ModerationAction;
  confidence: number;
  reasons: string[];
  metadata?: Record<string, unknown>;
}

// Spam Detection Patterns
export const SPAM_PATTERNS = {
  allCaps: {
    pattern: /^[A-Z\s!?.,]{20,}$/,
    weight: 0.8,
    reason: 'Excessive capitalization',
  },
  excessivePunctuation: {
    pattern: /[!?]{3,}/,
    weight: 0.6,
    reason: 'Excessive punctuation',
  },
  spamPhrases: {
    patterns: [
      /buy\s+now/i,
      /click\s+here/i,
      /limited\s+time\s+offer/i,
      /congratulations.*won/i,
      /free\s+money/i,
      /make\s+money\s+fast/i,
      /work\s+from\s+home/i,
    ],
    weight: 0.9,
    reason: 'Contains spam phrases',
  },
  excessiveUrls: {
    pattern: /(https?:\/\/[^\s]+)/g,
    threshold: 3,
    weight: 0.7,
    reason: 'Too many URLs',
  },
  repetition: {
    pattern: /(\b\w+\b)(?:\s+\1){3,}/i,
    weight: 0.6,
    reason: 'Repetitive text',
  },
  monetarySpam: {
    pattern: /[$£€¥]\s*\d+/,
    weight: 0.5,
    reason: 'Monetary spam indicators',
  },
};

export const INAPPROPRIATE_PATTERNS = {
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
  hateIndicators: {
    patterns: [
      /hate.*(?:group|people|race|religion)/i,
      /all.*(?:bad|evil|stupid)/i,
    ],
    weight: 1.0,
    reason: 'Potential hate speech',
  },
  adultContent: {
    patterns: [
      /\b(?:xxx|porn|adult)\b/i,
      /\b18\+\s*only\b/i,
    ],
    weight: 0.8,
    reason: 'Adult content indicators',
  },
};

export const PHISHING_PATTERNS = {
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

export const ADVANCED_SPAM_PATTERNS = {
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
  characterSubstitution: {
    patterns: [
      /[B8][UuYy][Yy]\s*[NnMm][O0o][WwVv]/i,
      /[CcGg][LlIi][IiYy][CcGg][Kk]/i,
      /[Ff][Rr][Ee3][Ee3]/i,
    ],
    weight: 0.7,
    reason: 'Character substitution spam',
  },
  spacedText: {
    pattern: /\b(\w)\s+(\w)\s+(\w)\s+(\w)/,
    weight: 0.6,
    reason: 'Spaced out text to evade filters',
  },
};

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

export const GAMING_CONTEXT_PATTERNS = {
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
    canEdit: true,
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
    canEdit: true,
    canDelete: true,
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
    canEdit: true,
    canDelete: true,
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
    canEdit: true,
    canDelete: true,
    canModerate: true,
    dailyLimits: {
      comments: -1, // unlimited
      discussions: -1,
      reports: -1,
    },
  },
};

// Core spam detection algorithm
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
      break;
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

  // Advanced patterns
  Object.values(ADVANCED_SPAM_PATTERNS).forEach(config => {
    if ('patterns' in config && config.patterns) {
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          totalScore += config.weight;
          reasons.push(config.reason);
          break;
        }
      }
    } else if ('pattern' in config && config.pattern?.test(content)) {
      totalScore += config.weight;
      reasons.push(config.reason);
    }
  });

  // Multilingual patterns
  Object.values(MULTILINGUAL_SPAM_PATTERNS).forEach(config => {
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        totalScore += config.weight;
        reasons.push(config.reason);
        break;
      }
    }
  });

  // Gaming context patterns
  Object.values(GAMING_CONTEXT_PATTERNS).forEach(config => {
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        totalScore += config.weight;
        if (config.weight > 0) {
          reasons.push(config.reason);
        }
        break;
      }
    }
  });

  return {
    score: Math.max(0, Math.min(totalScore, 1)),
    reasons,
    confidence: totalScore >= 0.8 ? 'high' : totalScore >= 0.5 ? 'medium' : 'low',
  };
}

// Main moderation function
export function moderateContent(
  content: string,
  author: UserTrustLevel
): ModerationResult {
  const spamResult = calculateSpamScore(content);
  let classification: ContentClassification = 'safe';
  let action: ModerationAction = 'approve';
  const reasons: string[] = [];
  let confidence = 0;

  // Check phishing (highest priority)
  checkPhishing: for (const config of Object.values(PHISHING_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(content)) {
        classification = 'phishing';
        reasons.push(config.reason);
        confidence = Math.max(confidence, config.weight);
        break checkPhishing;
      }
    }
  }

  // Check inappropriate content (medium priority) - only if not phishing
  if (classification === 'safe') {
    checkInappropriate: for (const config of Object.values(INAPPROPRIATE_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(content)) {
          classification = 'inappropriate';
          reasons.push(config.reason);
          confidence = Math.max(confidence, config.weight);
          break checkInappropriate;
        }
      }
    }
  }

  // Check spam (lowest priority) - only if safe
  if (classification === 'safe' && spamResult.score > 0.7) {
    classification = 'spam';
    reasons.push(...spamResult.reasons);
    confidence = spamResult.score;
  }

  // Determine action based on classification and user trust
  switch (classification) {
    case 'safe':
      action = 'approve';
      break;
    
    case 'spam':
      switch (author.level) {
        case 'new':
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
          action = 'approve';
          break;
      }
      break;
    
    case 'inappropriate':
      switch (author.level) {
        case 'new':
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
          action = 'approve';
          break;
      }
      // Override for severe inappropriate content
      if (confidence > 0.9) {
        action = 'auto_remove';
      }
      break;
    
    case 'phishing':
      action = author.level === 'moderator' ? 'require_review' : 'auto_remove';
      break;
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