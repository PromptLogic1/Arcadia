export const TAG_SYSTEM = {
  LIMITS: {
    MAX_ACTIVE_TAGS: 200,
    MAX_TAGS_PER_CARD: 15,
    MIN_TAGS_PER_CARD: 3,
    MAX_PROPOSALS_PER_USER: 3,
    MIN_USAGE_FOR_VOTING: 5,
    MIN_VOTES_FOR_VERIFICATION: 50,
    VOTING_DURATION_DAYS: 7,
    INACTIVITY_ARCHIVE_DAYS: 90
  },

  VALIDATION: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    ALLOWED_CHARACTERS: /^[a-zA-Z0-9\s-_]+$/,
    FORBIDDEN_TERMS: ['spam', 'test', 'inappropriate']
  },

  CATEGORIES: {
    DIFFICULTY: {
      id: 'difficulty',
      name: 'difficulty' as const,
      isRequired: true,
      allowMultiple: false,
      validForGames: ['all']
    },
    TIME_INVESTMENT: {
      id: 'timeInvestment',
      name: 'timeInvestment' as const,
      isRequired: true,
      allowMultiple: false,
      validForGames: ['all']
    },
    PRIMARY_CATEGORY: {
      id: 'primaryCategory',
      name: 'primaryCategory' as const,
      isRequired: true,
      allowMultiple: false,
      validForGames: ['all']
    },
    GAME_PHASE: {
      id: 'gamePhase',
      name: 'gamePhase' as const,
      isRequired: false,
      allowMultiple: true,
      validForGames: ['all']
    },
    REQUIREMENTS: {
      id: 'requirements',
      name: 'requirements' as const,
      isRequired: false,
      allowMultiple: true,
      validForGames: ['all']
    },
    PLAYER_MODE: {
      id: 'playerMode',
      name: 'playerMode' as const,
      isRequired: false,
      allowMultiple: false,
      validForGames: ['all']
    }
  },

  EVENTS: {
    TAG_CREATED: 'tagCreated',
    TAG_UPDATED: 'tagUpdated',
    TAG_DELETED: 'tagDeleted',
    TAG_VOTED: 'tagVoted',
    TAG_VERIFIED: 'tagVerified',
    TAG_ARCHIVED: 'tagArchived',
    TAG_SUSPENDED: 'tagSuspended'
  }
} as const
