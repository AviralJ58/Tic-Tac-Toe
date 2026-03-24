// Zustand store — single source of client-side truth
// All gameplay state comes from server via STATE_SYNC

import { create } from 'zustand';
import { Cell, Screen, PlayerSymbol, PlayerState, StateSyncPayload, MatchStatus } from '../types';

interface GameStore {
  // UI flow
  screen: Screen;
  setScreen: (screen: Screen) => void;

  // Auth
  userId: string | null;
  nickname: string;
  setAuth: (userId: string, nickname: string) => void;

  // Connection
  isConnected: boolean;
  isConnecting: boolean;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;

  // Match context
  matchId: string | null;
  playerSymbol: PlayerSymbol | null;
  setMatchId: (id: string) => void;

  // Authoritative game state (from server)
  board: Cell[];
  players: Record<string, PlayerState>;
  currentTurn: PlayerSymbol;
  winner: PlayerSymbol | 'draw' | null;
  status: MatchStatus;
  moveCount: number;

  // Apply server state sync
  updateFromStateSync: (payload: StateSyncPayload) => void;
  setGameFinished: (winner: PlayerSymbol | 'draw' | null) => void;

  // UI feedback
  error: string | null;
  isLoading: boolean;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Reset for new game
  resetMatch: () => void;
}

const initialMatchState = {
  matchId: null,
  playerSymbol: null,
  board: Array(9).fill(null) as Cell[],
  players: {} as Record<string, PlayerState>,
  currentTurn: 'X' as PlayerSymbol,
  winner: null,
  status: 'waiting' as MatchStatus,
  moveCount: 0,
  isLoading: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
  // UI flow
  screen: 'nickname',
  setScreen: (screen) => set({ screen }),

  // Auth
  userId: null,
  nickname: '',
  setAuth: (userId, nickname) => set({ userId, nickname }),

  // Connection
  isConnected: false,
  isConnecting: false,
  setConnected: (isConnected) => set({ isConnected }),
  setConnecting: (isConnecting) => set({ isConnecting }),

  // Match
  ...initialMatchState,
  setMatchId: (matchId) => set({ matchId }),

  updateFromStateSync: (payload: StateSyncPayload) => {
    const state = get();

    // Determine our symbol from server players list
    let playerSymbol = state.playerSymbol;
    if (!playerSymbol && state.userId) {
      for (const [symbol, player] of Object.entries(payload.players)) {
        if (player.userId === state.userId) {
          playerSymbol = symbol as PlayerSymbol;
          break;
        }
      }
    }

    // If game just started (we were on finding screen), switch to game screen
    const screen = payload.status === 'in_progress' && state.screen === 'finding'
      ? 'game'
      : payload.status === 'completed' && state.screen === 'game'
        ? 'result'
        : state.screen;

    set({
      board: payload.board,
      players: payload.players,
      currentTurn: payload.currentTurn,
      winner: payload.winner ?? null,
      status: payload.status,
      moveCount: payload.moveCount,
      playerSymbol,
      screen,
    });
  },

  setGameFinished: (winner) => {
    set({ winner, status: 'completed', screen: 'result' });
  },

  // UI feedback
  error: null,
  isLoading: false,
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  // Reset
  resetMatch: () => set({ ...initialMatchState }),
}));
