'use client'

import React, { useEffect } from 'react'
import { BingoLayout } from '@/components/challenges/bingo-board/components/layout/BingoLayout'
import BingoBoardsHub from './BingoBoardsHub'
import { useAuth } from '@/src/hooks/useAuth'
import LoadingSpinner from '@/components/ui/loading-spinner'
import { useBingoBoards } from '@/src/hooks/useBingoBoards'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function BingoBoards() {
  const { isAuthenticated } = useAuth()
  const { isLoading, error, initializeBoards } = useBingoBoards()

  useEffect(() => {
    if (isAuthenticated) {
      initializeBoards()
    }
  }, [isAuthenticated, initializeBoards])

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