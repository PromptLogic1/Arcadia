# 🚀 Phase 2 Implementation Guide

*Enhanced Multiplayer Features - Win Detection, Scoring & Queuing*

## 🎯 **Overview**

Phase 2 transforms the basic multiplayer bingo into a competitive gaming experience with:
- Automatic win detection
- Scoring system with leaderboards
- Queue-based matchmaking
- Tournament support

**Timeline**: 3-4 weeks  
**Priority**: High  
**Dependencies**: Phase 1 complete ✅

---

## 📋 **Task 1: Win Detection System** *(Week 1)*

### **Overview**
Implement real-time detection of winning patterns with support for multiple win types.

### **Step 1.1: Define Win Patterns**

Create win pattern types and detection logic:

```typescript
// src/features/bingo-boards/types/win-patterns.types.ts

export type WinPatternType = 
  | 'single-line'      // Any row, column, or diagonal
  | 'double-line'      // Two lines
  | 'four-corners'     // Four corner cells
  | 'full-house'       // All cells
  | 'letter-t'         // T shape
  | 'letter-x'         // X shape
  | 'custom';          // Custom patterns

export interface WinPattern {
  type: WinPatternType;
  name: string;
  positions: number[];  // Cell positions that form the pattern
  points: number;       // Points awarded for this pattern
}

export interface WinDetectionResult {
  hasWin: boolean;
  patterns: WinPattern[];
  winningCells: number[];
  totalPoints: number;
}
```

### **Step 1.2: Create Win Detection Service**

```typescript
// src/features/bingo-boards/services/win-detection.service.ts

export class WinDetectionService {
  private boardSize: number;
  
  constructor(size: number = 5) {
    this.boardSize = size;
  }
  
  detectWin(boardState: BoardCell[]): WinDetectionResult {
    const markedPositions = boardState
      .map((cell, index) => cell.isMarked ? index : -1)
      .filter(pos => pos !== -1);
    
    const detectedPatterns: WinPattern[] = [];
    
    // Check all possible patterns
    if (this.checkRows(markedPositions)) {
      detectedPatterns.push(...this.getRowPatterns(markedPositions));
    }
    
    if (this.checkColumns(markedPositions)) {
      detectedPatterns.push(...this.getColumnPatterns(markedPositions));
    }
    
    if (this.checkDiagonals(markedPositions)) {
      detectedPatterns.push(...this.getDiagonalPatterns(markedPositions));
    }
    
    if (this.checkFourCorners(markedPositions)) {
      detectedPatterns.push(this.getFourCornersPattern());
    }
    
    if (this.checkFullHouse(markedPositions, boardState.length)) {
      detectedPatterns.push(this.getFullHousePattern(boardState.length));
    }
    
    return {
      hasWin: detectedPatterns.length > 0,
      patterns: detectedPatterns,
      winningCells: [...new Set(detectedPatterns.flatMap(p => p.positions))],
      totalPoints: detectedPatterns.reduce((sum, p) => sum + p.points, 0)
    };
  }
  
  private checkRows(marked: number[]): boolean {
    for (let row = 0; row < this.boardSize; row++) {
      const rowStart = row * this.boardSize;
      const rowPositions = Array.from(
        { length: this.boardSize }, 
        (_, i) => rowStart + i
      );
      
      if (rowPositions.every(pos => marked.includes(pos))) {
        return true;
      }
    }
    return false;
  }
  
  private checkColumns(marked: number[]): boolean {
    for (let col = 0; col < this.boardSize; col++) {
      const colPositions = Array.from(
        { length: this.boardSize }, 
        (_, i) => col + (i * this.boardSize)
      );
      
      if (colPositions.every(pos => marked.includes(pos))) {
        return true;
      }
    }
    return false;
  }
  
  private checkDiagonals(marked: number[]): boolean {
    // Top-left to bottom-right
    const diagonal1 = Array.from(
      { length: this.boardSize },
      (_, i) => i * (this.boardSize + 1)
    );
    
    // Top-right to bottom-left
    const diagonal2 = Array.from(
      { length: this.boardSize },
      (_, i) => (i + 1) * (this.boardSize - 1)
    );
    
    return (
      diagonal1.every(pos => marked.includes(pos)) ||
      diagonal2.every(pos => marked.includes(pos))
    );
  }
  
  private checkFourCorners(marked: number[]): boolean {
    const corners = [
      0,                                    // Top-left
      this.boardSize - 1,                   // Top-right
      this.boardSize * (this.boardSize - 1), // Bottom-left
      this.boardSize * this.boardSize - 1   // Bottom-right
    ];
    
    return corners.every(pos => marked.includes(pos));
  }
  
  private checkFullHouse(marked: number[], totalCells: number): boolean {
    return marked.length === totalCells;
  }
}
```

### **Step 1.3: Integrate Win Detection with Game Hook**

Update the `useBingoGame` hook to check for wins after each move:

```typescript
// Add to useBingoGame hook

const checkForWin = useCallback(async () => {
  if (!boardState || boardState.length === 0) return;
  
  const winService = new WinDetectionService(5); // Assuming 5x5 board
  const result = winService.detectWin(boardState);
  
  if (result.hasWin && session?.status === 'active') {
    // Update session with winner
    await fetch(`/api/bingo/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        winner_id: userId,
        winning_patterns: result.patterns,
        final_score: result.totalPoints
      })
    });
  }
  
  return result;
}, [boardState, session, sessionId, userId]);

// Call after each cell mark/unmark
useEffect(() => {
  checkForWin();
}, [boardState]);
```

### **Step 1.4: Create Winner Announcement UI**

```typescript
// src/features/bingo-boards/components/WinnerAnnouncement.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WinDetectionResult } from '../types';

interface WinnerAnnouncementProps {
  winner: {
    displayName: string;
    avatarUrl?: string;
  };
  result: WinDetectionResult;
  onClose: () => void;
  onPlayAgain: () => void;
}

export function WinnerAnnouncement({ 
  winner, 
  result, 
  onClose, 
  onPlayAgain 
}: WinnerAnnouncementProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4"
        >
          <div className="text-center text-white">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block mb-4"
            >
              <Trophy className="w-24 h-24" />
            </motion.div>
            
            <h2 className="text-4xl font-bold mb-2">BINGO!</h2>
            <p className="text-2xl font-semibold mb-4">
              {winner.displayName} Wins!
            </p>
            
            <div className="bg-white/20 rounded-lg p-4 mb-6">
              <p className="text-lg font-medium mb-2">Winning Patterns:</p>
              {result.patterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-center gap-2">
                  <Star className="w-5 h-5" />
                  <span>{pattern.name}</span>
                  <span className="font-bold">+{pattern.points} pts</span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-white/30">
                <p className="text-xl font-bold">
                  Total Score: {result.totalPoints}
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="secondary"
                className="flex-1"
              >
                View Results
              </Button>
              <Button
                onClick={onPlayAgain}
                className="flex-1 bg-white text-orange-500 hover:bg-white/90"
              >
                Play Again
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## 📋 **Task 2: Scoring System** *(Week 2)*

### **Step 2.1: Database Schema for Scores**

Create migration for score tracking:

```sql
-- Create game_results table
CREATE TABLE game_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES bingo_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    final_score INTEGER NOT NULL,
    patterns_achieved JSONB,
    time_to_win INTEGER, -- Seconds
    placement INTEGER, -- 1st, 2nd, 3rd, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create leaderboards view
CREATE VIEW leaderboards AS
SELECT 
    u.id,
    u.username,
    u.avatar_url,
    COUNT(DISTINCT gr.session_id) as games_played,
    COUNT(CASE WHEN gr.placement = 1 THEN 1 END) as wins,
    SUM(gr.final_score) as total_score,
    AVG(gr.final_score) as avg_score,
    MIN(gr.time_to_win) as fastest_win
FROM users u
JOIN game_results gr ON u.id = gr.user_id
GROUP BY u.id, u.username, u.avatar_url
ORDER BY total_score DESC;

-- Add indexes
CREATE INDEX idx_game_results_user_score ON game_results(user_id, final_score DESC);
CREATE INDEX idx_game_results_session ON game_results(session_id);
```

### **Step 2.2: Scoring Service**

```typescript
// src/features/bingo-boards/services/scoring.service.ts

interface ScoringConfig {
  basePoints: {
    singleLine: 100;
    doubleLine: 250;
    fourCorners: 150;
    fullHouse: 500;
    customPattern: 200;
  };
  multipliers: {
    firstWin: 2.0;      // First to achieve pattern
    speedBonus: 1.5;    // Win under 2 minutes
    perfection: 1.3;    // No mistakes (no unmarking)
  };
  timeBonus: {
    under30Seconds: 100;
    under1Minute: 50;
    under2Minutes: 25;
  };
}

export class ScoringService {
  private config: ScoringConfig = {
    basePoints: {
      singleLine: 100,
      doubleLine: 250,
      fourCorners: 150,
      fullHouse: 500,
      customPattern: 200,
    },
    multipliers: {
      firstWin: 2.0,
      speedBonus: 1.5,
      perfection: 1.3,
    },
    timeBonus: {
      under30Seconds: 100,
      under1Minute: 50,
      under2Minutes: 25,
    }
  };
  
  calculateScore(
    patterns: WinPattern[],
    timeElapsed: number,
    isFirstWinner: boolean,
    mistakeCount: number
  ): number {
    // Base score from patterns
    let score = patterns.reduce((sum, pattern) => sum + pattern.points, 0);
    
    // Apply multipliers
    if (isFirstWinner) {
      score *= this.config.multipliers.firstWin;
    }
    
    if (timeElapsed < 120) { // Under 2 minutes
      score *= this.config.multipliers.speedBonus;
    }
    
    if (mistakeCount === 0) {
      score *= this.config.multipliers.perfection;
    }
    
    // Add time bonuses
    if (timeElapsed < 30) {
      score += this.config.timeBonus.under30Seconds;
    } else if (timeElapsed < 60) {
      score += this.config.timeBonus.under1Minute;
    } else if (timeElapsed < 120) {
      score += this.config.timeBonus.under2Minutes;
    }
    
    return Math.round(score);
  }
}
```

### **Step 2.3: Leaderboard Component**

```typescript
// src/features/bingo-boards/components/Leaderboard.tsx

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar } from '@/components/ui/avatar';
import { createClient } from '@/lib/supabase';

interface LeaderboardEntry {
  id: string;
  username: string;
  avatar_url?: string;
  games_played: number;
  wins: number;
  total_score: number;
  avg_score: number;
  fastest_win?: number;
}

export function Leaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [timeframe, setTimeframe] = useState<'all' | 'monthly' | 'weekly'>('all');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe]);
  
  const fetchLeaderboard = async () => {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('leaderboards')
      .select('*')
      .limit(10);
    
    if (!error && data) {
      setLeaders(data);
    }
    setLoading(false);
  };
  
  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Award className="w-6 h-6 text-orange-600" />;
      default: return <span className="w-6 text-center">{position}</span>;
    }
  };
  
  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-4">Leaderboard</h2>
      
      <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="weekly">This Week</TabsTrigger>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
        
        <TabsContent value={timeframe} className="mt-4">
          <div className="space-y-2">
            {leaders.map((leader, index) => (
              <div
                key={leader.id}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getRankIcon(index + 1)}
                  <Avatar src={leader.avatar_url} />
                  <div>
                    <p className="font-semibold">{leader.username}</p>
                    <p className="text-sm text-muted-foreground">
                      {leader.wins} wins • {leader.games_played} games
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{leader.total_score.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">
                    Avg: {Math.round(leader.avg_score)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
```

---

## 📋 **Task 3: Queue System Automation** *(Week 3)*

### **Step 3.1: Queue Matching Algorithm**

```typescript
// src/features/bingo-boards/services/queue-matcher.service.ts

interface QueueEntry {
  id: string;
  userId: string;
  boardId: string;
  preferences: {
    minPlayers?: number;
    maxPlayers?: number;
    difficulty?: DifficultyLevel;
    allowedPatterns?: WinPatternType[];
  };
  skillRating?: number;
  waitTime: number;
}

export class QueueMatcherService {
  private readonly MIN_PLAYERS = 2;
  private readonly MAX_PLAYERS = 8;
  private readonly MAX_SKILL_DIFF = 500; // ELO-style rating difference
  
  findMatches(queue: QueueEntry[]): QueueEntry[][] {
    const matches: QueueEntry[][] = [];
    const processed = new Set<string>();
    
    // Sort by wait time (longest waiting first)
    const sortedQueue = [...queue].sort((a, b) => b.waitTime - a.waitTime);
    
    for (const entry of sortedQueue) {
      if (processed.has(entry.id)) continue;
      
      const compatiblePlayers = this.findCompatiblePlayers(
        entry,
        sortedQueue.filter(e => !processed.has(e.id) && e.id !== entry.id)
      );
      
      if (compatiblePlayers.length >= this.MIN_PLAYERS - 1) {
        const match = [entry, ...compatiblePlayers.slice(0, this.MAX_PLAYERS - 1)];
        matches.push(match);
        
        // Mark all as processed
        match.forEach(player => processed.add(player.id));
      }
    }
    
    return matches;
  }
  
  private findCompatiblePlayers(
    anchor: QueueEntry,
    candidates: QueueEntry[]
  ): QueueEntry[] {
    return candidates
      .filter(candidate => {
        // Must want the same board
        if (candidate.boardId !== anchor.boardId) return false;
        
        // Check skill rating difference
        if (anchor.skillRating && candidate.skillRating) {
          const diff = Math.abs(anchor.skillRating - candidate.skillRating);
          if (diff > this.MAX_SKILL_DIFF) return false;
        }
        
        // Check difficulty preference
        if (anchor.preferences.difficulty && candidate.preferences.difficulty) {
          if (anchor.preferences.difficulty !== candidate.preferences.difficulty) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        // Prioritize similar skill levels
        const skillDiffA = Math.abs((a.skillRating || 1000) - (anchor.skillRating || 1000));
        const skillDiffB = Math.abs((b.skillRating || 1000) - (anchor.skillRating || 1000));
        return skillDiffA - skillDiffB;
      });
  }
}
```

### **Step 3.2: Queue Background Service**

```typescript
// src/app/api/queue/process/route.ts

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { QueueMatcherService } from '@/features/bingo-boards/services/queue-matcher.service';

export async function POST() {
  const supabase = createClient();
  const matcher = new QueueMatcherService();
  
  try {
    // Get all waiting queue entries
    const { data: queueEntries, error } = await supabase
      .from('bingo_queue_entries')
      .select('*')
      .eq('status', 'waiting')
      .order('created_at', { ascending: true });
    
    if (error || !queueEntries || queueEntries.length < 2) {
      return NextResponse.json({ matched: 0 });
    }
    
    // Find matches
    const matches = matcher.findMatches(queueEntries);
    
    // Create sessions for each match
    for (const match of matches) {
      // Create session
      const { data: session } = await supabase
        .from('bingo_sessions')
        .insert({
          board_id: match[0].board_id,
          host_id: match[0].user_id,
          status: 'waiting',
          settings: {
            max_players: match.length,
            auto_start: true,
            queue_match: true
          }
        })
        .select()
        .single();
      
      if (session) {
        // Add all players
        const playerInserts = match.map((entry, index) => ({
          session_id: session.id,
          user_id: entry.user_id,
          display_name: `Player ${index + 1}`, // Should fetch real names
          color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][index % 4],
          is_host: index === 0,
          is_ready: true // Auto-ready for queue matches
        }));
        
        await supabase
          .from('bingo_session_players')
          .insert(playerInserts);
        
        // Update queue entries
        await supabase
          .from('bingo_queue_entries')
          .update({ 
            status: 'matched',
            matched_session_id: session.id,
            matched_at: new Date().toISOString()
          })
          .in('id', match.map(e => e.id));
        
        // Notify players (would implement real-time notification here)
      }
    }
    
    return NextResponse.json({ 
      matched: matches.length,
      totalPlayers: matches.reduce((sum, m) => sum + m.length, 0)
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process queue' },
      { status: 500 }
    );
  }
}
```

### **Step 3.3: Queue UI Component**

```typescript
// src/features/bingo-boards/components/QueueButton.tsx

import { useState, useEffect } from 'react';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface QueueButtonProps {
  boardId: string;
  userId: string;
}

export function QueueButton({ boardId, userId }: QueueButtonProps) {
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [estimatedWait, setEstimatedWait] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  
  useEffect(() => {
    if (!inQueue) return;
    
    // Subscribe to queue updates
    const channel = supabase
      .channel(`queue:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'bingo_queue_entries',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        if (payload.new.status === 'matched') {
          toast({
            title: 'Match Found!',
            description: 'Redirecting to your game...',
          });
          router.push(`/play-area/bingo/${payload.new.matched_session_id}`);
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [inQueue, userId, router, supabase, toast]);
  
  const joinQueue = async () => {
    setInQueue(true);
    
    const { data, error } = await supabase
      .from('bingo_queue_entries')
      .insert({
        board_id: boardId,
        user_id: userId,
        preferences: {},
        status: 'waiting'
      })
      .select()
      .single();
    
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to join queue',
        variant: 'destructive',
      });
      setInQueue(false);
      return;
    }
    
    // Start polling for position
    updateQueuePosition();
  };
  
  const leaveQueue = async () => {
    await supabase
      .from('bingo_queue_entries')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'waiting');
    
    setInQueue(false);
    setQueuePosition(null);
  };
  
  const updateQueuePosition = async () => {
    // Would implement queue position logic here
    setQueuePosition(3);
    setEstimatedWait('~30 seconds');
  };
  
  if (inQueue) {
    return (
      <div className="space-y-2">
        <Button 
          onClick={leaveQueue}
          variant="outline"
          className="w-full"
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          In Queue
        </Button>
        {queuePosition && (
          <p className="text-sm text-center text-muted-foreground">
            Position: {queuePosition} • Est. wait: {estimatedWait}
          </p>
        )}
      </div>
    );
  }
  
  return (
    <Button onClick={joinQueue} className="w-full">
      <Users className="mr-2 h-4 w-4" />
      Find Match
    </Button>
  );
}
```

---

## ✅ **Phase 2 Completion Checklist**

### **Win Detection**
- [ ] Pattern detection algorithms implemented
- [ ] Real-time win checking after each move
- [ ] Winner announcement UI
- [ ] Multiple pattern support
- [ ] Win validation on server

### **Scoring System**
- [ ] Score calculation service
- [ ] Points for different patterns
- [ ] Time and performance bonuses
- [ ] Score persistence in database
- [ ] Leaderboard views

### **Queue System**
- [ ] Matching algorithm
- [ ] Queue processing endpoint
- [ ] Real-time queue updates
- [ ] Skill-based matching
- [ ] Auto-start for matched games

### **Testing**
- [ ] Win detection accuracy
- [ ] Scoring calculations
- [ ] Queue matching logic
- [ ] Performance under load
- [ ] Edge cases handled

---

## 🚨 **Implementation Order**

1. **Week 1**: Win Detection
   - Core algorithm
   - UI components
   - Integration testing

2. **Week 2**: Scoring System
   - Database schema
   - Score calculation
   - Leaderboards

3. **Week 3**: Queue System
   - Matching algorithm
   - Background processing
   - UI integration

4. **Week 4**: Polish & Testing
   - Bug fixes
   - Performance optimization
   - User testing

---

## 📚 **Related Documentation**

- [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) - Current project state
- [`MULTIPLAYER_GUIDE.md`](./MULTIPLAYER_GUIDE.md) - Multiplayer architecture
- [`DATABASE_SCHEMA.md`](./architecture/DATABASE_SCHEMA.md) - Database structure
- [`API Reference`](./api/README.md) - API documentation