import { NextResponse } from 'next/server'
import type { Board } from '@/components/challenges/bingo-board/components/shared/types'

// Mock data for initial boards
const initialBoards: Board[] = [
  {
    id: 1,
    name: "Classic WoW Bingo",
    players: 2,
    size: 5,
    timeLeft: 300,
    votes: 15,
    game: "World of Warcraft",
    createdAt: new Date(),
    votedBy: [],
    bookmarked: false,
    creator: "WoWMaster",
    avatar: "/avatars/default.jpg",
    winConditions: {
      line: true,
      majority: false
    },
    difficulty: 'medium',
    isPublic: true
  },
]

export const runtime = 'edge' // Use edge runtime for better performance
export const dynamic = 'force-dynamic' // Ensure fresh data on each request

export async function GET() {
  try {
    // Set appropriate cache headers
    const response = NextResponse.json(initialBoards)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('Error fetching boards:', error)
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    )
  }
} 