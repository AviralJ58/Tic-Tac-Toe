import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { leaveMatch, disconnect, findMatch, joinMatch, connectSocket, fetchMyStats, fetchLeaderboard } from '../services/nakama';
import type { PlayerStats, LeaderboardRecord } from '../types';

export default function ResultScreen() {
  const winner = useGameStore((s) => s.winner);
  const playerSymbol = useGameStore((s) => s.playerSymbol);
  const players = useGameStore((s) => s.players);
  const moveCount = useGameStore((s) => s.moveCount);
  const nickname = useGameStore((s) => s.nickname);
  const mode = useGameStore((s) => s.mode);
  const resetMatch = useGameStore((s) => s.resetMatch);
  const setScreen = useGameStore((s) => s.setScreen);
  const setError = useGameStore((s) => s.setError);
  const [busy, setBusy] = useState(false);

  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadExtras() {
      try {
        const [st, lb] = await Promise.all([
          fetchMyStats(mode),
          fetchLeaderboard(mode)
        ]);
        if (mounted) {
          setStats(st);
          setLeaderboard(lb.slice(0, 5));
        }
      } catch (err) {
        console.error("[ResultScreen] Failed to load end-game extras", err);
      } finally {
        if (mounted) setLoadingExtras(false);
      }
    }
    // Wait slightly to ensure authoritative server state finishes propagating to Nakama storage
    const timer = setTimeout(loadExtras, 500);
    return () => { mounted = false; clearTimeout(timer); };
  }, [mode]);

  const isDraw = winner === 'draw';
  const isWinner = winner === playerSymbol;

  const opponentSymbol = playerSymbol === 'X' ? 'O' : 'X';
  const opponentName = players[opponentSymbol]?.username || 'Opponent';

  const resultEmoji = isDraw ? '🤝' : isWinner ? '🎉' : '😞';
  const resultText = isDraw ? "It's a Draw!" : isWinner ? 'You Won!' : 'You Lost';
  const resultColor = isDraw ? 'text-amber-400' : isWinner ? 'text-emerald-400' : 'text-red-400';

  const handlePlayAgain = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      // Leave old match and clean up
      await leaveMatch();
      resetMatch();
      setScreen('finding');

      // Find or create a new match
      const matchId = await findMatch(nickname);
      await joinMatch(matchId);
    } catch (err: any) {
      console.error('[ResultScreen] Play again error:', err);
      setError(err.message || 'Failed to find match');
      setScreen('nickname');
    } finally {
      setBusy(false);
    }
  }, [resetMatch, setScreen, setError, nickname]);

  const handleHome = useCallback(async () => {
    await leaveMatch();
    resetMatch();
    setScreen('lobby');
  }, [resetMatch, setScreen]);

  return (
    <div className="screen relative px-4">
      {/* Title Branding */}
      <div className="absolute top-8 left-6">
        <div className="text-xl font-extrabold tracking-tight">
          <span className="text-brand-400">Tic</span>
          <span className="text-white/60">·</span>
          <span className="text-rose-400">Tac</span>
          <span className="text-white/60">·</span>
          <span className="text-amber-400">Toe</span>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-8 text-center mt-12">
        {/* Result */}
        <div className="space-y-3">
          <div className="text-6xl">{resultEmoji}</div>
          <h1 className={`text-3xl font-extrabold ${resultColor}`}>
            {resultText}
          </h1>
          {!isDraw && winner && (
            <p className="text-white/40 text-sm">
              <span className={winner === 'X' ? 'text-brand-400' : 'text-rose-400'}>
                {winner}
              </span>{' '}
              wins the game
            </p>
          )}
        </div>

        {/* Match stats */}
        <div className="card">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-white">{moveCount}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Moves</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white truncate max-w-[120px] mx-auto">{opponentName}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Opponent</p>
            </div>
          </div>
        </div>

        {/* End Game Extras */}
        {loadingExtras ? (
          <div className="h-32 flex items-center justify-center text-white/40 text-sm animate-pulse">
            Loading updated stats...
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/5 rounded-xl border border-white/5 p-2">
                <div className="text-2xl font-black text-emerald-400">{stats?.wins || 0}</div>
                <div className="text-[10px] font-bold tracking-wider text-white/40 uppercase">Wins</div>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/5 p-2">
                <div className="text-2xl font-black text-rose-400">{stats?.losses || 0}</div>
                <div className="text-[10px] font-bold tracking-wider text-white/40 uppercase">Loss</div>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/5 p-2">
                <div className="text-2xl font-black text-brand-300">{stats?.currentStreak || 0}</div>
                <div className="text-[10px] font-bold tracking-wider text-white/40 uppercase">Streak</div>
              </div>
            </div>
            
            <div className="card p-4 text-left border border-brand-500/20 shadow-lg shadow-brand-500/10">
              <h3 className="text-[10px] font-black tracking-widest text-brand-400 mb-3 uppercase">Top 5 {mode} Leaderboard</h3>
              <div className="space-y-2">
                {leaderboard.length === 0 && <div className="text-xs text-white/40">No entries yet.</div>}
                {leaderboard.map(r => (
                  <div key={r.ownerId || r.rank} className="flex justify-between items-center text-sm bg-black/20 px-3 py-2 rounded-lg border border-white/5">
                    <span className="text-white/80 font-medium">
                      <span className="text-white/30 w-5 inline-block text-xs">#{r.rank}</span>
                      {r.username}
                    </span>
                    <span className="text-brand-400 font-bold">{r.score} pt</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            id="play-again-btn"
            className="btn-primary"
            onClick={handlePlayAgain}
            disabled={busy}
          >
            {busy ? 'Finding match...' : 'Play Again'}
          </button>
          <button
            id="home-btn"
            onClick={handleHome}
            disabled={busy}
            className="w-full text-white/40 hover:text-white/70 transition-colors text-sm underline underline-offset-2"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

