'use client'

import { BingoLayout } from '@/components/challenges/bingo-board/components/layout/BingoLayout'
import BingoBoardsHub from './BingoBoardsHub'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useBingoBoards } from './hooks/useBingoBoards'

export function BingoBoards() {
  const { isAuthenticated, isLoading, error } = useBingoBoards()

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <h2 className="text-2xl font-bold text-cyan-400">
          Please log in to view and create Bingo Boards
        </h2>
        <div className="flex gap-4">
          <Button 
            asChild 
            className="bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <Link href="/auth/login">
              Log In
            </Link>
          </Button>
          <Button asChild className="border border-cyan-500 text-cyan-500 hover:bg-cyan-100">
            <Link href="/auth/signup">
              Sign Up
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (error) {
    return (
      <div className="text-red-500">
        Error loading bingo boards: {error}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <BingoLayout>
        <BingoBoardsHub />
      </BingoLayout>
    </div>
  )
}