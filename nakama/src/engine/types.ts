/**
 * Shared game state and contract types
 */

export type Cell = 'X' | 'O' | null;
export type MatchStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';
export type GameMode = 'classic' | 'timed';
export type GameResult = 'X' | 'O' | 'draw' | null;

export interface PlayerState {
    userId: string;
    username?: string;
    symbol: 'X' | 'O';
    connected: boolean;
}

export interface MatchGameState {
    matchId: string;
    status: MatchStatus;
    mode: GameMode;
    board: Cell[]; // length 9
    players: {
        X?: PlayerState;
        O?: PlayerState;
    };
    currentTurn: 'X' | 'O';
    winner: GameResult;
    moveCount: number;
    createdAt: number;
    updatedAt: number;
    turnStartedAt?: number;
    turnDeadlineMs?: number;
}

/**
 * RPC and realtime message contracts
 */

export interface CreateRoomRequest {
    roomName?: string;
    mode?: GameMode;
    visibility?: 'public' | 'private';
}

export interface CreateRoomResponse {
    success: boolean;
    matchId?: string;
    error?: string;
}

export interface ListRoomsResponse {
    success: boolean;
    rooms: WaitingRoom[];
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

export interface JoinRoomRequest {
    matchId: string;
}

export interface JoinRoomResponse {
    success: boolean;
    matchId?: string;
    error?: string;
}

/**
 * Realtime message opcodes and payloads
 */

export enum OpCodeClientToServer {
    MAKE_MOVE = 1,
    LEAVE_MATCH = 2,
}

export enum OpCodeServerToClient {
    STATE_SYNC = 1,
    ERROR = 2,
    PLAYER_JOINED = 3,
    PLAYER_LEFT = 4,
    GAME_STARTED = 5,
    GAME_FINISHED = 6,
}

export interface MakeMovePayload {
    position: number; // 0-8
}

export interface StateSyncPayload {
    matchId: string;
    status: MatchStatus;
    board: Cell[];
    players: Record<string, PlayerState>;
    currentTurn: 'X' | 'O';
    winner?: GameResult;
    moveCount: number;
}

export interface ErrorPayload {
    message: string;
}

export interface PlayerJoinedPayload {
    userId: string;
    username?: string;
    symbol: 'X' | 'O';
}

export interface GameFinishedPayload {
    winner: GameResult;
    board: Cell[];
}
