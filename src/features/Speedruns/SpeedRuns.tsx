'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { SpeedrunTimer } from '../speedruns/components/SpeedrunTimer';
import { Leaderboard } from '../speedruns/components/Leaderboard';
import {
  speedrunService,
  type SpeedrunRecord,
} from '../speedruns/services/speedrun.service';
import { useAuth } from '@/lib/stores/auth-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Trophy, User, Globe } from '@/components/ui/Icons';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function SpeedRuns() {
  const { authUser } = useAuth();

  // Fetch global leaderboard
  const { data: globalLeaderboard, isLoading: isLoadingGlobal } = useQuery({
    queryKey: ['speedruns', 'leaderboard', 'global'],
    queryFn: () => speedrunService.getLeaderboard(20),
    staleTime: 30 * 1000, // 30 seconds
    select: res => (res.success ? res.data : []),
  });

  // Fetch user's speedruns
  const { data: userSpeedruns, isLoading: isLoadingUser } = useQuery({
    queryKey: ['speedruns', 'user', authUser?.id],
    queryFn: () => {
      if (!authUser?.id) throw new Error('User ID is required');
      return speedrunService.getUserSpeedruns(authUser.id);
    },
    enabled: !!authUser?.id,
    staleTime: 30 * 1000,
    select: res => (res.success ? res.data : []),
  });

  // Get user's best time from statistics
  const { data: userStats } = useQuery({
    queryKey: ['user', 'statistics', authUser?.id],
    queryFn: async () => {
      if (!authUser?.id) throw new Error('User ID is required');
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data } = await supabase
        .from('user_statistics')
        .select('fastest_win')
        .eq('user_id', authUser.id)
        .single();
      return data;
    },
    enabled: !!authUser?.id,
    staleTime: 60 * 1000, // 1 minute
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-3xl font-bold text-transparent">
          Speed Runs
        </h2>
        <p className="mt-2 text-gray-300">
          Race against the clock and compete for the fastest completion times!
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Speedrun Timer */}
        <div className="lg:col-span-1">
          <SpeedrunTimer bestTime={userStats?.fastest_win} />
        </div>

        {/* Leaderboards */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="global" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="global" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Global
              </TabsTrigger>
              <TabsTrigger value="personal" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="global" className="mt-4">
              <Leaderboard
                entries={globalLeaderboard || []}
                isLoading={isLoadingGlobal}
                title="Global Speedrun Leaderboard"
              />
            </TabsContent>

            <TabsContent value="personal" className="mt-4">
              {authUser ? (
                <div className="space-y-4">
                  {isLoadingUser ? (
                    <div className="flex min-h-[400px] items-center justify-center">
                      <div className="space-y-2 text-center">
                        <LoadingSpinner className="mx-auto h-8 w-8" />
                        <p className="text-gray-400">
                          Loading your speedruns...
                        </p>
                      </div>
                    </div>
                  ) : userSpeedruns && userSpeedruns.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-xl font-semibold text-gray-200">
                        <Trophy className="h-5 w-5 text-yellow-400" />
                        Your Speedrun Records
                      </h3>
                      <div className="space-y-2">
                        {userSpeedruns.map((run: SpeedrunRecord) => (
                          <div
                            key={run.id}
                            className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-800/50 p-4"
                          >
                            <div>
                              <p className="font-medium text-gray-200">
                                {run.board_title}
                              </p>
                              <p className="text-sm text-gray-400">
                                {new Date(run.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-mono text-lg font-bold text-cyan-400">
                                {Math.floor(run.time_seconds / 60)}:
                                {(run.time_seconds % 60)
                                  .toString()
                                  .padStart(2, '0')}
                              </p>
                              <p className="text-xs text-gray-500">Time</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-[400px] items-center justify-center text-center">
                      <div className="space-y-2">
                        <Trophy className="mx-auto h-12 w-12 text-gray-600" />
                        <p className="text-gray-400">
                          No speedrun records yet. Complete games quickly to set
                          records!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex min-h-[400px] items-center justify-center text-center">
                  <div className="space-y-2">
                    <User className="mx-auto h-12 w-12 text-gray-600" />
                    <p className="text-gray-400">
                      Sign in to track your personal speedrun records
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
