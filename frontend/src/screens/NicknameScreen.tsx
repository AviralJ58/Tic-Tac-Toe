import { useState, useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { authenticate, connectSocket, findMatch, joinMatch, getSavedNickname } from '../services/nakama';

export default function NicknameScreen() {
  const [name, setName] = useState(getSavedNickname);
  const [busy, setBusy] = useState(false);
  const error = useGameStore((s) => s.error);
  const setScreen = useGameStore((s) => s.setScreen);
  const setError = useGameStore((s) => s.setError);

  const handleContinue = useCallback(async () => {
    const nickname = name.trim();
    if (!nickname) return;

    setBusy(true);
    setError(null);

    try {
      // 1. Authenticate
      await authenticate(nickname);

      // 2. Connect socket
      await connectSocket();

      // 3. Switch to finding screen
      setScreen('finding');

      // 4. Find or create a match (server decides)
      const matchId = await findMatch(nickname);

      // 5. Join the match via WebSocket
      await joinMatch(matchId);

      // Now waiting for opponent (or game starts immediately if room was waiting)
    } catch (err: any) {
      console.error('[NicknameScreen] Error:', err);
      setError(err.message || 'Something went wrong');
      setBusy(false);
    }
  }, [name, setScreen, setError]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleContinue();
    },
    [handleContinue]
  );

  return (
    <div className="screen">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Title */}
        <div className="text-center space-y-2">
          <div className="text-5xl font-extrabold tracking-tight">
            <span className="text-brand-400">Tic</span>
            <span className="text-white/60">·</span>
            <span className="text-rose-400">Tac</span>
            <span className="text-white/60">·</span>
            <span className="text-amber-400">Toe</span>
          </div>
          <p className="text-white/40 text-sm">Multiplayer • Real-time</p>
        </div>

        {/* Input card */}
        <div className="card space-y-5">
          <label htmlFor="nickname-input" className="block text-white/60 text-sm font-medium text-center">
            Choose your nickname
          </label>
          <input
            id="nickname-input"
            type="text"
            autoFocus
            className="input-field"
            placeholder="Enter nickname..."
            maxLength={20}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={busy}
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            id="continue-btn"
            className="btn-primary"
            onClick={handleContinue}
            disabled={busy || !name.trim()}
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting...
              </span>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
