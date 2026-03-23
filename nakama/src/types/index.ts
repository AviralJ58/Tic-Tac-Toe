// Type definitions for Tic-Tac-Toe
// Per AGENT_INIT.md § 4, core authoritative state model

/**
 * A single cell on the 3x3 board
 */
export type Cell = "X" | "O" | null;

/**
 * Match status per AGENT_INIT.md § 4
 */
export type MatchStatus = "waiting" | "in_progress" | "completed" | "abandoned";

/**
 * Game mode, MVP is "classic"
 */
export type GameMode = "classic" | "timed";

/**
 * A player in the match
 */
export interface PlayerState {
    userId: string;
    username?: string;
    symbol: "X" | "O";
    connected: boolean;
}

/**
 * Complete authoritative match state
 * Per AGENT_INIT.md § 4, all game logic is server-owned
 */
export interface MatchGameState extends nkruntime.MatchState {
    matchId: string;
    status: MatchStatus;
    mode: GameMode;
    board: Cell[]; // length 9
    players: {
        X?: PlayerState;
        O?: PlayerState;
    };
    currentTurn: "X" | "O";
    winner: "X" | "O" | "draw" | null;
    moveCount: number;
    createdAt: number;
    updatedAt: number;
    turnStartedAt?: number;
    turnDeadlineMs?: number;
}

/**
 * Opcodes for realtime client-server communication
 * Per AGENT_INIT.md § 8, explicit event protocol
 */
export enum ClientOpcode {
    MAKE_MOVE = 1,
    LEAVE_MATCH = 2
}

export enum ServerOpcode {
    STATE_SYNC = 1,
    ERROR = 2,
    PLAYER_JOINED = 3,
    PLAYER_LEFT = 4,
    GAME_STARTED = 5,
    GAME_FINISHED = 6,
    TIMER_UPDATE = 7
}