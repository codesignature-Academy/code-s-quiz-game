import { cn } from '@/lib/utils';
import type { Player, Violation } from '@/types/quiz';
import { Trophy, AlertTriangle, Camera, CameraOff, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LeaderboardProps {
  players: Player[];
  violations?: Violation[];
  showViolations?: boolean;
  highlightTop3?: boolean;
  currentPlayerId?: string;
}

export function Leaderboard({ 
  players, 
  violations = [], 
  showViolations = false,
  highlightTop3 = false,
  currentPlayerId,
}: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.is_disqualified !== b.is_disqualified) {
      return a.is_disqualified ? 1 : -1;
    }
    return b.total_score - a.total_score;
  });

  const getViolationCount = (playerId: string) => {
    return violations.filter(v => v.player_id === playerId).length;
  };

  const getRankStyle = (rank: number, isDisqualified: boolean) => {
    if (isDisqualified) return 'bg-destructive/10 border-destructive/30';
    if (!highlightTop3) return 'bg-card';
    
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-amber-100 to-yellow-50 border-amber-300 dark:from-amber-900/30 dark:to-yellow-900/20';
      case 2: return 'bg-gradient-to-r from-slate-100 to-gray-50 border-slate-300 dark:from-slate-800/30 dark:to-gray-800/20';
      case 3: return 'bg-gradient-to-r from-orange-100 to-amber-50 border-orange-300 dark:from-orange-900/30 dark:to-amber-900/20';
      default: return 'bg-card';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-amber-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-slate-400" />;
    if (rank === 3) return <Trophy className="w-5 h-5 text-orange-400" />;
    return <span className="text-muted-foreground font-bold">{rank}</span>;
  };

  return (
    <div className="space-y-2">
      {sortedPlayers.map((player, index) => {
        const rank = index + 1;
        const violationCount = getViolationCount(player.id);
        const isCurrentPlayer = player.id === currentPlayerId;

        return (
          <div
            key={player.id}
            className={cn(
              'flex items-center gap-3 p-3 md:p-4 rounded-xl border transition-all',
              getRankStyle(rank, player.is_disqualified),
              isCurrentPlayer && 'ring-2 ring-primary',
              !player.is_disqualified && highlightTop3 && rank <= 3 && 'animate-slide-up'
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Rank */}
            <div className="flex items-center justify-center w-10 h-10">
              {getRankIcon(rank)}
            </div>

            {/* Player info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn(
                  'font-bold truncate',
                  player.is_disqualified && 'line-through text-muted-foreground'
                )}>
                  {player.full_name}
                </span>
                {isCurrentPlayer && (
                  <Badge variant="outline" className="text-xs">You</Badge>
                )}
                {player.is_disqualified && (
                  <Badge variant="destructive" className="text-xs">Disqualified</Badge>
                )}
              </div>
              {player.student_id && (
                <span className="text-sm text-muted-foreground">{player.student_id}</span>
              )}
            </div>

            {/* Indicators */}
            <div className="flex items-center gap-2">
              {showViolations && violationCount > 0 && (
                <div className="flex items-center gap-1 text-warning">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm font-medium">{violationCount}</span>
                </div>
              )}
              {showViolations && (
                player.camera_active 
                  ? <Camera className="w-4 h-4 text-success" />
                  : <CameraOff className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            {/* Score */}
            <div className={cn(
              'text-xl md:text-2xl font-bold min-w-[80px] text-right',
              player.is_disqualified && 'text-muted-foreground'
            )}>
              {player.total_score.toLocaleString()}
            </div>
          </div>
        );
      })}

      {players.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No players yet. Waiting for students to join...
        </div>
      )}
    </div>
  );
}
