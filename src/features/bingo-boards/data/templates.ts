/**
 * Template cards for different game types
 * These provide starting points for users to customize
 */

import type { BingoCard, GameCategory } from '@/types';

export interface TemplateCard
  extends Omit<
    BingoCard,
    'id' | 'creator_id' | 'created_at' | 'updated_at' | 'votes'
  > {
  isTemplate: true;
  templateCategory: 'beginner' | 'common' | 'advanced' | 'expert';
}

// Define templates for games we have content for
const AVAILABLE_TEMPLATES: Partial<Record<GameCategory, TemplateCard[]>> = {
  'World of Warcraft': [
    // Beginner Templates
    {
      title: 'Reach Level 10',
      description: 'Level your character to level 10',
      difficulty: 'easy',
      game_type: 'World of Warcraft',
      tags: ['leveling', 'beginner'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'beginner',
    },
    {
      title: 'Visit Stormwind/Orgrimmar',
      description: "Visit your faction's capital city",
      difficulty: 'easy',
      game_type: 'World of Warcraft',
      tags: ['exploration', 'cities'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'beginner',
    },
    {
      title: 'Complete First Dungeon',
      description: 'Complete your first dungeon instance',
      difficulty: 'medium',
      game_type: 'World of Warcraft',
      tags: ['dungeons', 'group content'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'common',
    },
    {
      title: 'Get Your Mount',
      description: 'Obtain your first ground mount',
      difficulty: 'medium',
      game_type: 'World of Warcraft',
      tags: ['mounts', 'progression'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'common',
    },
    {
      title: 'Join a Guild',
      description: 'Become a member of an active guild',
      difficulty: 'easy',
      game_type: 'World of Warcraft',
      tags: ['social', 'guilds'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'beginner',
    },
    {
      title: 'Complete Raid Wing',
      description: 'Clear any raid wing on any difficulty',
      difficulty: 'hard',
      game_type: 'World of Warcraft',
      tags: ['raids', 'endgame'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'advanced',
    },
  ],

  Fortnite: [
    {
      title: 'Victory Royale',
      description: 'Win a Battle Royale match',
      difficulty: 'hard',
      game_type: 'Fortnite',
      tags: ['victory', 'battle royale'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'advanced',
    },
    {
      title: 'Get 5 Eliminations',
      description: 'Eliminate 5 players in a single match',
      difficulty: 'medium',
      game_type: 'Fortnite',
      tags: ['combat', 'eliminations'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'common',
    },
    {
      title: 'Open 5 Chests',
      description: 'Open 5 chests or ammo boxes in one match',
      difficulty: 'easy',
      game_type: 'Fortnite',
      tags: ['looting', 'exploration'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'beginner',
    },
    {
      title: 'Build a Tower',
      description: 'Build a structure at least 5 stories tall',
      difficulty: 'easy',
      game_type: 'Fortnite',
      tags: ['building', 'creative'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'beginner',
    },
    {
      title: 'Headshot Elimination',
      description: 'Eliminate an opponent with a headshot',
      difficulty: 'medium',
      game_type: 'Fortnite',
      tags: ['combat', 'precision'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'common',
    },
    {
      title: 'Survive to Top 10',
      description: 'Place in the top 10 players/teams',
      difficulty: 'medium',
      game_type: 'Fortnite',
      tags: ['survival', 'placement'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'common',
    },
  ],

  Minecraft: [
    {
      title: 'Build a House',
      description: 'Construct your first shelter with a door and bed',
      difficulty: 'easy',
      game_type: 'Minecraft',
      tags: ['building', 'survival'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'beginner',
    },
    {
      title: 'Find Diamonds',
      description: 'Mine your first diamond ore',
      difficulty: 'medium',
      game_type: 'Minecraft',
      tags: ['mining', 'resources'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'common',
    },
    {
      title: 'Defeat the Ender Dragon',
      description: 'Defeat the Ender Dragon in the End dimension',
      difficulty: 'hard',
      game_type: 'Minecraft',
      tags: ['boss', 'endgame'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'expert',
    },
    {
      title: 'Tame an Animal',
      description: 'Tame any animal (wolf, cat, horse, etc.)',
      difficulty: 'easy',
      game_type: 'Minecraft',
      tags: ['animals', 'taming'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'beginner',
    },
    {
      title: 'Create Nether Portal',
      description: 'Build and activate a Nether Portal',
      difficulty: 'medium',
      game_type: 'Minecraft',
      tags: ['nether', 'portals'],
      is_public: false,
      isTemplate: true,
      templateCategory: 'common',
    },
  ],
};

/**
 * Generic templates that can be adapted to any game
 */
const GENERIC_TEMPLATES: TemplateCard[] = [
  {
    title: 'First Victory',
    description: 'Win your first match or complete first objective',
    difficulty: 'medium',
    game_type: 'All Games',
    tags: ['victory', 'achievement'],
    is_public: false,
    isTemplate: true,
    templateCategory: 'common',
  },
  {
    title: 'Play for 1 Hour',
    description: 'Play the game for at least 1 hour',
    difficulty: 'easy',
    game_type: 'All Games',
    tags: ['time', 'casual'],
    is_public: false,
    isTemplate: true,
    templateCategory: 'beginner',
  },
  {
    title: 'Complete Tutorial',
    description: 'Finish the game tutorial or training mode',
    difficulty: 'easy',
    game_type: 'All Games',
    tags: ['tutorial', 'learning'],
    is_public: false,
    isTemplate: true,
    templateCategory: 'beginner',
  },
  {
    title: 'Unlock Achievement',
    description: 'Unlock any in-game achievement or trophy',
    difficulty: 'medium',
    game_type: 'All Games',
    tags: ['achievement', 'progression'],
    is_public: false,
    isTemplate: true,
    templateCategory: 'common',
  },
  {
    title: 'Play with Friends',
    description: 'Play a match with at least one friend',
    difficulty: 'easy',
    game_type: 'All Games',
    tags: ['social', 'multiplayer'],
    is_public: false,
    isTemplate: true,
    templateCategory: 'beginner',
  },
];

/**
 * Get template cards for a specific game type
 * Falls back to generic templates if game-specific ones aren't available
 */
export function getTemplateCards(
  gameType: GameCategory,
  count: number
): TemplateCard[] {
  const gameTemplates = AVAILABLE_TEMPLATES[gameType] || [];
  const allTemplates = [...gameTemplates];

  // Add generic templates that can work for any game
  if (gameType !== 'All Games') {
    allTemplates.push(
      ...GENERIC_TEMPLATES.map(template => ({
        ...template,
        game_type: gameType,
      }))
    );
  } else {
    allTemplates.push(...GENERIC_TEMPLATES);
  }

  // Shuffle and return requested count
  const shuffled = [...allTemplates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // If we don't have enough templates, create empty slots
  while (selected.length < count) {
    selected.push({
      title: '',
      description: null,
      difficulty: 'medium',
      game_type: gameType,
      tags: [],
      is_public: false,
      isTemplate: true,
      templateCategory: 'common',
    });
  }

  return selected;
}

/**
 * Convert a template card to a BingoCard
 */
export function templateToBingoCard(
  template: TemplateCard,
  creatorId: string
): BingoCard {
  return {
    id: '', // Will be assigned by database
    title: template.title,
    description: template.description,
    difficulty: template.difficulty,
    game_type: template.game_type,
    tags: template.tags,
    is_public: template.is_public,
    creator_id: creatorId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    votes: 0,
  };
}

/**
 * Get a diverse set of templates ensuring good difficulty distribution
 */
export function getDiverseTemplates(
  gameType: GameCategory,
  count: number
): TemplateCard[] {
  const templates = getTemplateCards(gameType, count * 2); // Get more than needed

  // Group by difficulty
  const byDifficulty: Record<string, TemplateCard[]> = {
    easy: [],
    medium: [],
    hard: [],
  };

  templates.forEach(template => {
    const difficultyList = byDifficulty[template.difficulty];
    if (template.title && difficultyList) {
      difficultyList.push(template);
    }
  });

  // Try to get balanced distribution
  const result: TemplateCard[] = [];
  const targetPerDifficulty = Math.ceil(count / 3);

  ['easy', 'medium', 'hard'].forEach(difficulty => {
    const cards = byDifficulty[difficulty];
    if (cards) {
      const toTake = Math.min(cards.length, targetPerDifficulty);
      result.push(...cards.slice(0, toTake));
    }
  });

  // Fill remaining slots with any available templates
  if (result.length < count) {
    const remaining = templates.filter(t => !result.includes(t) && t.title);
    result.push(...remaining.slice(0, count - result.length));
  }

  // Add empty slots if needed
  while (result.length < count) {
    result.push({
      title: '',
      description: null,
      difficulty: 'medium',
      game_type: gameType,
      tags: [],
      is_public: false,
      isTemplate: true,
      templateCategory: 'common',
    });
  }

  return result.slice(0, count);
}
