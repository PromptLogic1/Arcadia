'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp, Grid as GridIcon, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { BingoBoard } from '@/features/bingo-boards/types';
import { DIFFICULTY_STYLES } from '@/types';
import Link from 'next/link';

interface BoardCardProps {
  board: BingoBoard;
  onClick?: () => void;
}

export function BoardCard({ board, onClick }: BoardCardProps) {
  return (
    <Link href={`/challengehub/${board.id}`}>
      <Card
        className={cn(
          'bg-gradient-to-br from-gray-800/95 to-gray-800/75',
          'border-2 border-cyan-500/20 hover:border-cyan-500/40',
          'transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10',
          'group cursor-pointer hover:translate-y-[-2px]',
          'overflow-hidden'
        )}
        onClick={onClick}
      >
        <CardHeader className="flex flex-col items-start justify-between px-5 py-4 sm:flex-row sm:items-center">
          <div className="flex w-full items-center space-x-4">
            <Avatar
              className={cn(
                'h-12 w-12 shrink-0 ring-2 ring-cyan-500/20',
                'transition-all duration-300 group-hover:ring-cyan-500/40',
                'shadow-lg shadow-cyan-500/5'
              )}
            >
              <AvatarImage
                src={board.creator?.avatar_url || undefined}
                alt={board.creator?.username || 'Creator'}
              />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 font-bold text-cyan-400">
                {board.creator?.username ? (
                  board.creator.username.substring(0, 2).toUpperCase()
                ) : (
                  <User className="h-6 w-6" />
                )}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <CardTitle
                className={cn(
                  'text-2xl font-bold',
                  'text-cyan-300/90 group-hover:text-cyan-300',
                  'transition-all duration-300',
                  'break-words'
                )}
              >
                {board.title}
              </CardTitle>
              {board.description && (
                <CardDescription
                  className={cn(
                    'text-sm text-cyan-300/70 group-hover:text-cyan-300/90',
                    'transition-colors duration-300',
                    'line-clamp-2 break-words'
                  )}
                >
                  {board.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent
          className={cn(
            'flex flex-wrap gap-4 sm:gap-8',
            'px-5 py-4',
            'border-t border-cyan-500/20 group-hover:border-cyan-500/30',
            'bg-gradient-to-r from-transparent via-cyan-500/5 to-transparent'
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group/stat flex items-center">
                  <div
                    className={cn(
                      'rounded-full bg-cyan-500/5 p-1.5',
                      'transition-colors duration-300 group-hover/stat:bg-cyan-500/10'
                    )}
                  >
                    <GridIcon className="h-4 w-4 shrink-0 text-cyan-400/70 group-hover/stat:text-cyan-400" />
                  </div>
                  <span className="ml-2 truncate text-sm font-medium text-cyan-300/70 group-hover/stat:text-cyan-300">
                    {board.size}×{board.size}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Board size</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="group/stat flex items-center">
                  <div
                    className={cn(
                      'rounded-full bg-cyan-500/5 p-1.5',
                      'transition-colors duration-300 group-hover/stat:bg-cyan-500/10'
                    )}
                  >
                    <ThumbsUp className="h-4 w-4 shrink-0 text-cyan-400/70 group-hover/stat:text-cyan-400" />
                  </div>
                  <span className="ml-2 truncate text-sm font-medium text-cyan-300/70 group-hover/stat:text-cyan-300">
                    {board.votes || 0}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total votes</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Badge
            variant="outline"
            className={cn(
              'rounded-full px-3 py-1 font-medium transition-all duration-300',
              'overflow-hidden text-ellipsis whitespace-nowrap shadow-sm',
              DIFFICULTY_STYLES[board.difficulty]
            )}
          >
            {board.difficulty}
          </Badge>

          <Badge
            variant="outline"
            className={cn(
              'border border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
              'group-hover:border-cyan-500/40 group-hover:bg-cyan-500/20',
              'rounded-full px-3 py-1 font-medium transition-all duration-300',
              'overflow-hidden text-ellipsis whitespace-nowrap shadow-sm'
            )}
          >
            {board.game_type}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}
