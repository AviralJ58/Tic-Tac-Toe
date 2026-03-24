import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { findMatch, listRooms, createRoom, joinMatch, disconnect, fetchMyStats } from '../services/nakama';
import type { WaitingRoom } from '../types';

export default function LobbyScreen() {
  const [rooms, setRooms] = useState<WaitingRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [selectedMode, setSelectedMode] = useState<import('../types').GameMode>('classic');
  const [classicScore, setClassicScore] = useState<number | null>(null);
  const [timedScore, setTimedScore] = useState<number | null>(null);
  
  const nickname = useGameStore((s) => s.nickname);
  const setScreen = useGameStore((s) => s.setScreen);
  const setError = useGameStore((s) => s.setError);
  const error = useGameStore((s) => s.error);

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    setError(null);
    try {
      const availableRooms = await listRooms();
      setRooms(availableRooms);
    } catch (err: any) {
      console.error('[LobbyScreen] Error listing rooms:', err);
    } finally {
      setLoadingRooms(false);
    }
  }, [setError]);

  useEffect(() => {
    fetchRooms();
    
    // Fetch abbreviated scores for main menu
    async function loadScores() {
      try {
        const [cStats, tStats] = await Promise.all([
          fetchMyStats('classic'),
          fetchMyStats('timed')
        ]);
        if (cStats) setClassicScore(cStats.wins * 3 + cStats.draws);
        if (tStats) setTimedScore(tStats.wins * 3 + tStats.draws);
      } catch (err) {
        console.error("Failed to fetch lobby scores", err);
      }
    }
    loadScores();
  }, [fetchRooms]);

  const handleQuickMatch = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setScreen('finding');
      const matchId = await findMatch(nickname, selectedMode);
      await joinMatch(matchId);
    } catch (err: any) {
      console.error('[LobbyScreen] Quick match error:', err);
      setError(err.message || 'Failed to find match');
      setScreen('lobby');
    } finally {
      setBusy(false);
    }
  }, [nickname, selectedMode, setScreen, setError]);

  const handleCreateRoom = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setScreen('finding');
      const roomName = `${nickname}'s Game`;
      const matchId = await createRoom(roomName, selectedMode);
      await joinMatch(matchId);
    } catch (err: any) {
      console.error('[LobbyScreen] Create room error:', err);
      setError(err.message || 'Failed to create room');
      setScreen('lobby');
    } finally {
      setBusy(false);
    }
  }, [nickname, selectedMode, setScreen, setError]);

  const handleJoinRoom = useCallback(async (matchId: string) => {
    setBusy(true);
    setError(null);
    try {
      setScreen('finding');
      await joinMatch(matchId);
    } catch (err: any) {
      console.error('[LobbyScreen] Join room error:', err);
      setError(err.message || 'Failed to join room');
      setScreen('lobby');
    } finally {
      setBusy(false);
    }
  }, [setScreen, setError]);

  const handleLogout = useCallback(() => {
    disconnect();
    setScreen('nickname');
  }, [setScreen]);

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

      {/* Header */}
      <div className="absolute top-6 right-6 z-50 flex items-center gap-4">
        {/* Scores */}
        <div className="hidden sm:flex items-center gap-3 bg-black/20 border border-white/5 rounded-full px-4 py-2">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-white/40 leading-none">Classic</span>
            <span className="text-sm font-black text-brand-400">{classicScore !== null ? classicScore : '-'}</span>
          </div>
          <div className="w-[1px] h-6 bg-white/10"></div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase font-bold text-white/40 leading-none">Timed</span>
            <span className="text-sm font-black text-brand-400">{timedScore !== null ? timedScore : '-'}</span>
          </div>
        </div>

        <div className="relative group">
          <button className="flex items-center gap-3 bg-black/20 hover:bg-black/40 px-3 py-2 rounded-full transition-colors border border-white/5">
            <span className="text-white/80 font-medium">{nickname}</span>
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
              {nickname.charAt(0).toUpperCase()}
            </div>
          </button>
          
          <div className="absolute right-0 mt-2 w-48 bg-[#0B0F19] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden transform origin-top-right">
            <button
              onClick={() => setScreen('profile')}
              className="w-full text-left px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium border-b border-white/5"
            >
              My Profile
            </button>
            <button
              onClick={() => setScreen('leaderboard')}
              className="w-full text-left px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium border-b border-white/5"
            >
              Leaderboard
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-8 mt-16">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-white">Lobby</h1>
          <p className="text-white/40">Find an opponent or create a room</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/5 p-1 rounded-full flex gap-1">
            <button
              onClick={() => setSelectedMode('classic')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedMode === 'classic' 
                  ? 'bg-brand-500 text-white shadow-lg' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              Classic
            </button>
            <button
              onClick={() => setSelectedMode('timed')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                selectedMode === 'timed' 
                  ? 'bg-brand-500 text-white shadow-lg' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              Timed (30s)
            </button>
          </div>
        </div>

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleQuickMatch}
            disabled={busy}
            className="btn-primary py-4 hover:scale-105 transition-transform"
          >
            <div className="font-bold text-lg">Quick Match</div>
            <div className="text-xs text-white/50 font-normal mt-1">Join any waiting player</div>
          </button>
          
          <button
            onClick={handleCreateRoom}
            disabled={busy}
            className="bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 text-white rounded-2xl py-4 flex flex-col items-center justify-center transition-all hover:scale-105"
          >
            <div className="font-bold text-lg">Create Room</div>
            <div className="text-xs text-white/50 font-normal mt-1">Host a public match</div>
          </button>
        </div>

        {/* Room List Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-lg font-semibold text-white/90">Waiting Rooms</h2>
            <button 
              onClick={fetchRooms} 
              disabled={loadingRooms || busy}
              className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
            >
              {loadingRooms ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="card max-h-[40vh] overflow-y-auto space-y-2 p-3 hide-scrollbar">
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-white/30 text-sm">
                No rooms available right now.
                <br /> Create one or try a Quick Match!
              </div>
            ) : (
              rooms.map((room) => (
                <div 
                  key={room.matchId} 
                  className="bg-black/20 hover:bg-black/40 border border-white/5 rounded-xl p-3 flex justify-between items-center transition-colors group"
                >
                  <div className="truncate pr-4">
                    <div className="font-medium text-white/90 text-sm truncate">
                      {room.name}
                    </div>
                    <div className="text-xs text-white/40 mt-0.5">
                      {room.playerCount}/2 Players • {room.mode}
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.matchId)}
                    disabled={busy}
                    className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors opacity-90 group-hover:opacity-100 flex-shrink-0"
                  >
                    Join
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
