import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { leaveMatch, disconnect, findMatch, joinMatch, connectSocket } from '../services/nakama';

export default function ResultScreen() {
  const winner = useGameStore((s) => s.winner);
  const playerSymbol = useGameStore((s) => s.playerSymbol);
  const players = useGameStore((s) => s.players);
  const moveCount = useGameStore((s) => s.moveCount);
  const nickname = useGameStore((s) => s.nickname);
  const resetMatch = useGameStore((s) => s.resetMatch);
  const setScreen = useGameStore((s) => s.setScreen);
  const setError = useGameStore((s) => s.setError);
  const [busy, setBusy] = useState(false);

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
    <div className="screen">
      <div className="w-full max-w-sm space-y-8 text-center">
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
              <p className="text-2xl font-bold text-white">{moveCount}</p>
              <p className="text-xs text-white/40 uppercase tracking-wide">Moves</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{opponentName}</p>
              <p className="text-xs text-white/40 uppercase tracking-wide">Opponent</p>
            </div>
          </div>
        </div>

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

