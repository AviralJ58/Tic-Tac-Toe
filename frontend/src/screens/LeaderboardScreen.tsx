import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { fetchLeaderboard } from '../services/nakama';
import type { LeaderboardRecord, GameMode } from '../types';

export default function LeaderboardScreen() {
  const [records, setRecords] = useState<LeaderboardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<GameMode>('classic');
  const setScreen = useGameStore(s => s.setScreen);
  const error = useGameStore(s => s.error);
  const setError = useGameStore(s => s.setError);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeaderboard(mode);
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard');
    } finally {
      setLoading(false);
    }
  }, [mode, setError]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  return (
    <div className="screen relative px-4">
      <button 
        onClick={() => setScreen('lobby')}
        className="absolute top-6 left-6 text-white/50 hover:text-white transition-colors underline underline-offset-4"
      >
        Back
      </button>

      <div className="w-full max-w-md space-y-8 mt-16">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-white">Leaderboard</h1>
        </div>

        {error && <div className="text-red-400 text-sm text-center">{error}</div>}

        {/* Mode Selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/5 p-1 rounded-full flex gap-1">
            <button
              onClick={() => setMode('classic')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                mode === 'classic' ? 'bg-brand-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'
              }`}
            >
              Classic
            </button>
            <button
              onClick={() => setMode('timed')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                mode === 'timed' ? 'bg-brand-500 text-white shadow-lg' : 'text-white/40 hover:text-white/80'
              }`}
            >
              Timed
            </button>
          </div>
        </div>

        {/* List */}
        <div className="card space-y-2 p-3 min-h-[50vh]">
          {loading ? (
            <div className="text-center py-8 text-white/40">Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-white/40">No records yet. Play a game!</div>
          ) : (
            records.map((r, i) => (
              <div key={r.ownerId || i} className="flex justify-between items-center bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`font-black text-xl w-6 text-center ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-white/50'}`}>
                    #{r.rank}
                  </div>
                  <div className="font-medium text-white/90">{r.username}</div>
                </div>
                <div className="font-bold text-brand-400">{r.score} pts</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
