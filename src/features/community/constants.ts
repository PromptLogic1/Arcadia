import type { Discussion } from './types/types';

export const GAMES = [
  'All Games',
  'Elden Ring',
  'Fortnite',
  'World of Warcraft',
  'Cyberpunk 2077',
] as const;
export type Game = (typeof GAMES)[number];

export const CHALLENGE_TYPES = [
  'All Challenges',
  'Speed Run',
  'Win Challenge',
  'Bingo Battle',
] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

export const MOCK_DISCUSSIONS: readonly Discussion[] = [
  {
    id: 1,
    title: 'Best strategy for Elden Ring boss',
    content:
      "Looking for tips on defeating Malenia. I've been struggling with her waterfowl dance attack. Any experienced players have advice on timing and positioning?",
    author_id: 'user_1',
    game: 'Elden Ring',
    challenge_type: 'Win Challenge',
    upvotes: 45,
    tags: ['boss-fight', 'strategy', 'help'],
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
  },
  {
    id: 2,
    title: 'Fortnite Building Meta Discussion',
    content:
      'What are your thoughts on the current building meta? The new update seems to have changed the flow significantly.',
    author_id: 'user_2',
    game: 'Fortnite',
    challenge_type: 'Speed Run',
    upvotes: 23,
    tags: ['building', 'meta', 'update'],
    created_at: '2024-03-14T15:30:00Z',
    updated_at: '2024-03-14T15:30:00Z',
  },
  {
    id: 3,
    title: 'WoW Raid Coordination Tips',
    content:
      'Looking for advice on leading raids effectively. How do you manage 20+ people and keep everyone focused?',
    author_id: 'user_3',
    game: 'World of Warcraft',
    challenge_type: 'Bingo Battle',
    upvotes: 67,
    tags: ['raid', 'leadership', 'coordination'],
    created_at: '2024-03-13T20:15:00Z',
    updated_at: '2024-03-13T20:15:00Z',
  },
] as const;

import type { Event as StoreEvent } from '@/lib/stores/community-store';

// Note: Using store Event type which has different structure
export const MOCK_EVENTS: StoreEvent[] = [
  {
    id: 1,
    title: 'Fortnite Tournament',
    description:
      'Join our monthly Fortnite tournament with cash prizes! Registration opens March 25th.',
    date: '2024-04-01T18:00:00Z',
    game: 'Fortnite',
    prize: '$5,000 Prize Pool',
    participants: 100,
    maxParticipants: 200,
    tags: ['tournament', 'competitive', 'prizes'],
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-03-15T10:00:00Z',
  },
  {
    id: 2,
    title: 'Elden Ring Community Speedrun Event',
    description:
      'Test your speedrunning skills in our weekly community event. All skill levels welcome!',
    date: '2024-04-05T14:00:00Z',
    game: 'Elden Ring',
    prize: '$2,500 Prize Pool',
    participants: 50,
    maxParticipants: 100,
    tags: ['speedrun', 'community', 'weekly'],
    created_at: '2024-03-13T20:15:00Z',
    updated_at: '2024-03-13T20:15:00Z',
  },
];
