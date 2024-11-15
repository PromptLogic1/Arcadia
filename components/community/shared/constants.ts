import type { Discussion, Event } from '../types/types'

export const GAMES = ['All Games', 'Elden Ring', 'Fortnite', 'World of Warcraft', 'Cyberpunk 2077'] as const
export type Game = (typeof GAMES)[number]

export const CHALLENGE_TYPES = ['All Challenges', 'Speed Run', 'Win Challenge', 'Bingo Battle'] as const
export type ChallengeType = (typeof CHALLENGE_TYPES)[number]

export const MOCK_DISCUSSIONS: readonly Discussion[] = [
  {
    id: 1,
    author: 'Player1',
    avatar: '/avatars/player1.jpg',
    title: 'Best strategy for Elden Ring boss',
    game: 'Elden Ring',
    challengeType: 'Win Challenge',
    comments: 15,
    upvotes: 45,
    content: 'Looking for tips on defeating Malenia...',
    date: '2024-03-15T10:00:00Z',
    tags: ['boss-fight', 'strategy', 'help'] as const,
    commentList: []
  }
] as const

export const MOCK_EVENTS: readonly Event[] = [
  {
    id: 1,
    title: 'Fortnite Tournament',
    date: new Date('2024-04-01T18:00:00Z'),
    game: 'Fortnite',
    participants: 100,
    prize: '$1000',
    description: 'Join our monthly Fortnite tournament...',
    tags: ['tournament', 'competitive', 'prizes'] as const
  }
] as const 