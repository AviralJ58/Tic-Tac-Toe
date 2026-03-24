import { useCallback, useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { sendMove, leaveMatch } from '../services/nakama';
import Board from '../components/Board';

export default function GameScreen() {
  const board = useGameStore((s) => s.board);
  const players = useGameStore((s) => s.players);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const playerSymbol = useGameStore((s) => s.playerSymbol);
  const status = useGameStore((s) => s.status);
  const error = useGameStore((s) => s.error);
  const resetMatch = useGameStore((s) => s.resetMatch);
  const setScreen = useGameStore((s) => s.setScreen);
  const mode = useGameStore((s) => s.mode);
  const turnDeadlineMs = useGameStore((s) => s.turnDeadlineMs);
  const [leaving, setLeaving] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const isMyTurn = currentTurn === playerSymbol;
  const isGameActive = status === 'in_progress';

  useEffect(() => {
    if (mode !== 'timed' || !isGameActive || !turnDeadlineMs) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((turnDeadlineMs - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);

    return () => clearInterval(interval);
  }, [mode, isGameActive, turnDeadlineMs]);

  const playerX = players['X'];
  const playerO = players['O'];

  const handleCellClick = useCallback((index: number) => {
    sendMove(index);
  }, []);

  const handleLeave = useCallback(async () => {
    if (!window.confirm('Are you sure you want to forfeit this match?')) return;
    setLeaving(true);
    await leaveMatch();
    resetMatch();
    setScreen('lobby');
  }, [resetMatch, setScreen]);

  return (
    <div className="screen">
      <div className="w-full max-w-sm space-y-6">
        {/* Player indicators */}
        <div className="flex items-center justify-between">
          <PlayerBadge
            name={playerX?.username || 'Waiting...'}
            symbol="X"
            isActive={currentTurn === 'X' && isGameActive}
            isYou={playerSymbol === 'X'}
          />
          <div className="text-white/30 text-sm font-medium">VS</div>
          <PlayerBadge
            name={playerO?.username || 'Waiting...'}
            symbol="O"
            isActive={currentTurn === 'O' && isGameActive}
            isYou={playerSymbol === 'O'}
          />
        </div>

        {/* Turn status & Timer */}
        <div className="text-center space-y-2">
          {isGameActive && (
            <p className={`text-sm font-medium ${isMyTurn ? 'text-brand-400' : 'text-white/40'}`}>
              {isMyTurn ? 'Your turn!' : "Opponent's turn..."}
            </p>
          )}
          {mode === 'timed' && isGameActive && timeLeft !== null && (
            <div className={`text-2xl font-black font-mono tracking-wider ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white/80'}`}>
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          )}
        </div>

        {/* Board */}
        <Board
          board={board}
          isMyTurn={isMyTurn}
          isGameActive={isGameActive}
          onCellClick={handleCellClick}
        />

        {/* Error display */}
        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <div className="pt-4 flex justify-center">
          <button 
            onClick={handleLeave} 
            disabled={leaving}
            className="text-white/30 hover:text-red-400 text-sm font-medium transition-colors underline underline-offset-4"
          >
            {leaving ? 'Leaving...' : 'Forfeit Match'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component ──────────────────────────────────────────────────────────

function PlayerBadge({
  name,
  symbol,
  isActive,
  isYou,
}: {
  name: string;
  symbol: 'X' | 'O';
  isActive: boolean;
  isYou: boolean;
}) {
  const symbolColor = symbol === 'X' ? 'text-brand-400' : 'text-rose-400';
  const activeRing = isActive ? 'ring-2 ring-brand-400/60' : '';

  return (
    <div className={`card flex items-center gap-3 px-4 py-3 ${activeRing} transition-all duration-200`}>
      <span className={`text-2xl font-extrabold ${symbolColor}`}>{symbol}</span>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white truncate max-w-[80px]">{name}</span>
        {isYou && <span className="text-[10px] text-brand-400 font-medium uppercase">You</span>}
      </div>
    </div>
  );
}
