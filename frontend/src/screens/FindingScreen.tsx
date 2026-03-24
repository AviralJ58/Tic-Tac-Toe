import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { leaveMatch } from '../services/nakama';

export default function FindingScreen() {
  const setScreen = useGameStore((s) => s.setScreen);

  const resetMatch = useGameStore((s) => s.resetMatch);

  const handleCancel = useCallback(async () => {
    await leaveMatch();
    resetMatch();
    setScreen('lobby');
  }, [setScreen, resetMatch]);

  return (
    <div className="screen">
      <div className="w-full max-w-sm space-y-10 text-center">
        {/* Animated indicator */}
        <div className="flex flex-col items-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-brand-600/30" />
            <div className="absolute inset-0 w-20 h-20 rounded-full border-4 border-transparent border-t-brand-400 animate-spin" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-white">
              Finding opponent
            </h2>
            <p className="text-white/40 text-sm animate-pulse-slow">
              Waiting for another player to join...
            </p>
          </div>
        </div>

        {/* Cancel */}
        <button
          id="cancel-btn"
          onClick={handleCancel}
          className="text-white/40 hover:text-white/70 transition-colors text-sm underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
