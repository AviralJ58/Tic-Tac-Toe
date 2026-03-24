import { useState, useCallback, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { findMatch, listRooms, createRoom, joinMatch, disconnect } from '../services/nakama';
import type { WaitingRoom } from '../types';

export default function LobbyScreen() {
  const [rooms, setRooms] = useState<WaitingRoom[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);
  
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
  }, [fetchRooms]);

  const handleQuickMatch = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setScreen('finding');
      const matchId = await findMatch(nickname);
      await joinMatch(matchId);
    } catch (err: any) {
      console.error('[LobbyScreen] Quick match error:', err);
      setError(err.message || 'Failed to find match');
      setScreen('lobby');
    } finally {
      setBusy(false);
    }
  }, [nickname, setScreen, setError]);

  const handleCreateRoom = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setScreen('finding');
      const roomName = `${nickname}'s Game`;
      const matchId = await createRoom(roomName);
      await joinMatch(matchId);
    } catch (err: any) {
      console.error('[LobbyScreen] Create room error:', err);
      setError(err.message || 'Failed to create room');
      setScreen('lobby');
    } finally {
      setBusy(false);
    }
  }, [nickname, setScreen, setError]);

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
      {/* Header */}
      <div className="absolute top-6 left-6 right-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
            {nickname.charAt(0).toUpperCase()}
          </div>
          <span className="text-white/80 font-medium">{nickname}</span>
        </div>
        <button 
          onClick={handleLogout}
          className="text-white/40 hover:text-white/80 text-sm underline underline-offset-4 transition-colors"
        >
          Logout
        </button>
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
