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
    votedBy: new Set(),
    bookmarked: false,
    creator: "WoWMaster",
    avatar: "/avatars/default.jpg",
    winConditions: {
      line: true,
      majority: false
    }
  },
  // Add more mock boards as needed
]

export async function GET() {
  try {
    return NextResponse.json(initialBoards)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch boards' },
      { status: 500 }
    )
  }
} 