import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { fetchMyStats } from '../services/nakama';
import type { PlayerStats, GameMode } from '../types';

export default function ProfileScreen() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<GameMode>('classic');
  const setScreen = useGameStore(s => s.setScreen);
  const nickname = useGameStore(s => s.nickname);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchMyStats(mode);
      setStats(data);
    } catch (err) {
      console.error(err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const displayStats = stats || { wins: 0, losses: 0, draws: 0, gamesPlayed: 0, currentStreak: 0, bestStreak: 0 };
  const winRate = displayStats.gamesPlayed > 0 ? Math.round((displayStats.wins / displayStats.gamesPlayed) * 100) : 0;

  return (
    <div className="screen relative px-4">
      <button 
        onClick={() => setScreen('lobby')}
        className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors underline underline-offset-4"
      >
        Back
      </button>

      <div className="w-full max-w-sm space-y-8 mt-16">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-4xl mb-4 shadow-lg shadow-brand-500/20">
            {nickname.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-3xl font-extrabold text-white">{nickname}</h1>
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-white/5 p-1 rounded-full flex gap-1">
            <button onClick={() => setMode('classic')} className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'classic' ? 'bg-brand-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}>Classic</button>
            <button onClick={() => setMode('timed')} className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${mode === 'timed' ? 'bg-brand-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}>Timed</button>
          </div>
        </div>

        {loading ? (
           <div className="text-center text-white/40 min-h-[40vh] flex items-center justify-center">Loading stats...</div>
        ) : (
          <div className="space-y-4">
            <div className="card text-center py-6 bg-brand-500/10 border-brand-500/30 hover:bg-brand-500/20 transition-colors">
              <div className="text-5xl font-black mb-2 text-brand-400">{displayStats.wins * 3 + displayStats.draws}</div>
              <div className="text-sm font-bold uppercase tracking-widest text-brand-400/80">Leaderboard Score</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <StatCard label="Games Played" value={displayStats.gamesPlayed.toString()} />
              <StatCard label="Win Rate" value={`${winRate}%`} color="text-brand-400" />
              <StatCard label="Wins" value={displayStats.wins.toString()} color="text-emerald-400" />
              <StatCard label="Losses" value={displayStats.losses.toString()} color="text-rose-400" />
              <StatCard label="Draws" value={displayStats.draws.toString()} color="text-amber-400" />
              <StatCard label="Best Streak" value={displayStats.bestStreak.toString()} color="text-brand-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "text-white" }: { label: string; value: string; color?: string }) {
  return (
    <div className="card text-center py-6 hover:bg-white/5 transition-colors">
      <div className={`text-3xl font-black mb-1 ${color}`}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider text-white/40">{label}</div>
    </div>
  );
}
