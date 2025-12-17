import { cn } from '@/lib/utils';
import type { Player } from '@/types/quiz';
import { Trophy, Crown, Medal } from 'lucide-react';

interface Top3PodiumProps {
  players: Player[];
}

export function Top3Podium({ players }: Top3PodiumProps) {
  const top3 = players
    .filter(p => !p.is_disqualified)
    .sort((a, b) => b.total_score - a.total_score)
    .slice(0, 3);

  const [first, second, third] = top3;

  // Reorder for visual: 2nd, 1st, 3rd
  const displayOrder = [second, first, third].filter(Boolean);

  return (
    <div className="py-8">
      <div className="flex items-end justify-center gap-4 md:gap-8">
        {displayOrder.map((player, index) => {
          const actualRank = player === first ? 1 : player === second ? 2 : 3;
          const heights = { 1: 'h-40 md:h-52', 2: 'h-32 md:h-40', 3: 'h-24 md:h-32' };
          const colors = {
            1: 'from-amber-400 to-yellow-500',
            2: 'from-slate-300 to-gray-400',
            3: 'from-orange-400 to-amber-500',
          };
          const icons = {
            1: <Crown className="w-8 h-8 md:w-12 md:h-12" />,
            2: <Medal className="w-6 h-6 md:w-8 md:h-8" />,
            3: <Medal className="w-6 h-6 md:w-8 md:h-8" />,
          };

          return (
            <div
              key={player.id}
              className="flex flex-col items-center animate-slide-up"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              {/* Avatar and name */}
              <div className="text-center mb-4">
                <div className={cn(
                  'w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-2',
                  `bg-gradient-to-br ${colors[actualRank as 1 | 2 | 3]}`,
                  actualRank === 1 && 'ring-4 ring-amber-300 animate-bounce-subtle'
                )}>
                  <span className="text-white">{icons[actualRank as 1 | 2 | 3]}</span>
                </div>
                <div className="font-bold text-sm md:text-base truncate max-w-[100px] md:max-w-[120px]">
                  {player.full_name}
                </div>
                <div className="text-lg md:text-2xl font-bold text-primary">
                  {player.total_score.toLocaleString()}
                </div>
              </div>

              {/* Podium */}
              <div className={cn(
                'w-24 md:w-32 rounded-t-lg flex items-start justify-center pt-4',
                heights[actualRank as 1 | 2 | 3],
                `bg-gradient-to-t ${colors[actualRank as 1 | 2 | 3]}`
              )}>
                <span className="text-4xl md:text-6xl font-black text-white/80">
                  {actualRank}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {top3.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No verified winners yet</p>
        </div>
      )}
    </div>
  );
}
