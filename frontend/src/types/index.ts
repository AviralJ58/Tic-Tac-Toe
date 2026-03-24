// Frontend type definitions — mirrors backend types/opcodes
// Source of truth: nakama/src/types/index.ts

export type Cell = 'X' | 'O' | null;
export type MatchStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type GameMode = 'classic' | 'timed';
export type PlayerSymbol = 'X' | 'O';

export interface PlayerState {
  userId: string;
  username?: string;
  symbol: PlayerSymbol;
  connected: boolean;
}

/** Opcodes must match backend ClientOpcode / ServerOpcode exactly */
export enum ClientOpcode {
  MAKE_MOVE = 1,
  LEAVE_MATCH = 2,
}

export enum ServerOpcode {
  STATE_SYNC = 1,
  ERROR = 2,
  PLAYER_JOINED = 3,
  PLAYER_LEFT = 4,
  GAME_STARTED = 5,
  GAME_FINISHED = 6,
  TIMER_UPDATE = 7,
}

/** Payload shapes from server broadcast */
export interface StateSyncPayload {
  matchId: string;
  status: MatchStatus;
  board: Cell[];
  players: Record<string, PlayerState>;
  currentTurn: PlayerSymbol;
  winner?: PlayerSymbol | 'draw' | null;
  moveCount: number;
  mode: GameMode;
  turnDeadlineMs?: number;
}

export interface GameFinishedPayload {
  winner: PlayerSymbol | 'draw' | null;
  board: Cell[];
}

export interface ErrorPayload {
  message: string;
}

/** RPC response contracts */
export interface CreateRoomResponse {
  success: boolean;
  matchId?: string;
  error?: string;
}

export interface WaitingRoom {
  matchId: string;
  name: string;
  mode: GameMode;
  visibility: 'public' | 'private';
  playerCount: number;
  createdAt: number;
}

export interface ListRoomsResponse {
  success: boolean;
  rooms: WaitingRoom[];
  error?: string;
}

/** UI screen flow */
export type Screen = 'nickname' | 'lobby' | 'finding' | 'game' | 'result';
