import type { Database as _Database } from '@/types/database-generated';

interface QueuePreferences {
  minPlayers?: number;
  maxPlayers?: number;
  difficulty?: string;
  allowedPatterns?: string[];
  skillRange?: number;
}

// TODO: Create bingo_queue_entries table first
// type QueueEntry = Database['public']['Tables']['bingo_queue_entries']['Row'];
type QueueEntry = {
  id: string;
  user_id: string;
  board_id: string;
  status: 'waiting' | 'matched' | 'cancelled';
  preferences: QueuePreferences;
  created_at: string;
  updated_at: string;
};

interface ExtendedQueueEntry extends QueueEntry {
  preferences: QueuePreferences;
  waitTime: number;
  skillRating?: number;
}

interface MatchGroup {
  entries: ExtendedQueueEntry[];
  boardId: string;
  avgWaitTime: number;
  skillSpread: number;
}

export class QueueMatcherService {
  private readonly MIN_PLAYERS = 2;
  private readonly MAX_PLAYERS = 8;
  private readonly MAX_SKILL_DIFF = 500; // ELO-style rating difference
  private readonly MAX_WAIT_TIME = 300; // 5 minutes max wait

  findMatches(queue: ExtendedQueueEntry[]): MatchGroup[] {
    const matches: MatchGroup[] = [];
    const processed = new Set<string>();

    // Sort by wait time (longest waiting first) to prioritize waiting players
    const sortedQueue = [...queue].sort((a, b) => b.waitTime - a.waitTime);

    for (const anchor of sortedQueue) {
      if (processed.has(anchor.id)) continue;

      const compatiblePlayers = this.findCompatiblePlayers(
        anchor,
        sortedQueue.filter(e => !processed.has(e.id) && e.id !== anchor.id)
      );

      // Check if we have enough players for a match
      const totalPlayers = compatiblePlayers.length + 1;
      const minRequired = Math.max(
        anchor.preferences?.minPlayers || this.MIN_PLAYERS,
        this.MIN_PLAYERS
      );

      if (totalPlayers >= minRequired) {
        const maxAllowed = Math.min(
          anchor.preferences?.maxPlayers || this.MAX_PLAYERS,
          this.MAX_PLAYERS
        );

        const finalPlayers = [
          anchor,
          ...compatiblePlayers.slice(0, maxAllowed - 1),
        ];

        matches.push({
          entries: finalPlayers,
          boardId: anchor.board_id,
          avgWaitTime:
            finalPlayers.reduce((sum, p) => sum + p.waitTime, 0) /
            finalPlayers.length,
          skillSpread: this.calculateSkillSpread(finalPlayers),
        });

        // Mark all as processed
        finalPlayers.forEach(player => processed.add(player.id));
      }
    }

    return matches;
  }

  private findCompatiblePlayers(
    anchor: ExtendedQueueEntry,
    candidates: ExtendedQueueEntry[]
  ): ExtendedQueueEntry[] {
    return candidates
      .filter(candidate => this.areCompatible(anchor, candidate))
      .sort((a, b) => {
        // Prioritize by:
        // 1. Skill similarity
        // 2. Wait time (help long-waiting players)
        // 3. Preference alignment

        const skillDiffA = this.getSkillDifference(anchor, a);
        const skillDiffB = this.getSkillDifference(anchor, b);

        if (Math.abs(skillDiffA - skillDiffB) > 50) {
          return skillDiffA - skillDiffB;
        }

        // If skill is similar, prioritize by wait time
        return b.waitTime - a.waitTime;
      });
  }

  private areCompatible(
    anchor: ExtendedQueueEntry,
    candidate: ExtendedQueueEntry
  ): boolean {
    // Must want the same board
    if (candidate.board_id !== anchor.board_id) return false;

    // Check skill rating difference
    const skillDiff = this.getSkillDifference(anchor, candidate);
    if (skillDiff > this.MAX_SKILL_DIFF) {
      // Relax skill requirements for players who have waited too long
      const maxWaitTime = Math.max(anchor.waitTime, candidate.waitTime);
      if (maxWaitTime < this.MAX_WAIT_TIME) {
        return false;
      }
    }

    // Check difficulty preference (if specified)
    if (anchor.preferences?.difficulty && candidate.preferences?.difficulty) {
      if (anchor.preferences.difficulty !== candidate.preferences.difficulty) {
        return false;
      }
    }

    // Check player count preferences
    if (anchor.preferences?.maxPlayers && candidate.preferences?.minPlayers) {
      if (anchor.preferences.maxPlayers < candidate.preferences.minPlayers) {
        return false;
      }
    }

    return true;
  }

  private getSkillDifference(
    player1: ExtendedQueueEntry,
    player2: ExtendedQueueEntry
  ): number {
    const rating1 = player1.skillRating || 1000; // Default ELO
    const rating2 = player2.skillRating || 1000;
    return Math.abs(rating1 - rating2);
  }

  private calculateSkillSpread(players: ExtendedQueueEntry[]): number {
    const ratings = players.map(p => p.skillRating || 1000);
    const min = Math.min(...ratings);
    const max = Math.max(...ratings);
    return max - min;
  }

  // Calculate match quality score (higher is better)
  calculateMatchQuality(match: MatchGroup): number {
    let quality = 100; // Base score

    // Penalize large skill spreads
    quality -= match.skillSpread / 10;

    // Bonus for helping long-waiting players
    if (match.avgWaitTime > 120) {
      // 2 minutes
      quality += 20;
    }

    // Bonus for optimal player count
    const playerCount = match.entries.length;
    if (playerCount >= 3 && playerCount <= 5) {
      quality += 10;
    }

    // Penalize if anyone has waited too long
    const maxWait = Math.max(...match.entries.map(e => e.waitTime));
    if (maxWait > this.MAX_WAIT_TIME) {
      quality += 30; // High priority to match these players
    }

    return Math.max(0, quality);
  }

  // Get optimal queue processing interval based on queue size
  getProcessingInterval(queueSize: number): number {
    if (queueSize < 4) return 30000; // 30 seconds
    if (queueSize < 10) return 15000; // 15 seconds
    if (queueSize < 20) return 10000; // 10 seconds
    return 5000; // 5 seconds for large queues
  }

  // Estimate wait time for a player
  estimateWaitTime(
    entry: ExtendedQueueEntry,
    currentQueue: ExtendedQueueEntry[]
  ): { estimate: number; confidence: 'low' | 'medium' | 'high' } {
    const compatibleCount = currentQueue.filter(
      e => e.id !== entry.id && this.areCompatible(entry, e)
    ).length;

    const playersNeeded = Math.max(
      (entry.preferences?.minPlayers || this.MIN_PLAYERS) - 1,
      1
    );

    if (compatibleCount >= playersNeeded) {
      return { estimate: 30, confidence: 'high' }; // Match soon
    }

    if (compatibleCount >= Math.ceil(playersNeeded / 2)) {
      return { estimate: 120, confidence: 'medium' }; // 2 minutes
    }

    // Estimate based on current queue growth rate
    const baseWait = entry.waitTime;
    const projectedWait = Math.min(baseWait + 180, this.MAX_WAIT_TIME); // Max 5 minutes

    return {
      estimate: projectedWait,
      confidence: compatibleCount > 0 ? 'medium' : 'low',
    };
  }
}
