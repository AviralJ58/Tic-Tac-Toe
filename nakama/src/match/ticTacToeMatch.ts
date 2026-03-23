// Tic-Tac-Toe authoritative match handler
// Implements Nakama MatchHandler interface per AGENT_INIT.md § 5-6
// Orchestrates authoritative state, delegates pure logic to engine functions

import { MatchGameState, PlayerState, ClientOpcode, ServerOpcode, StateSyncPayload, GameFinishedPayload, MakeMovePayload } from '../types';
import * as boardEngine from '../engine/board';
import * as rulesEngine from '../engine/rules';

/**
 * matchInit: Initialize match state when a new match is created.
 * Per AGENT_INIT.md, matches start in "waiting" status.
 */
export const matchInit: nkruntime.MatchInitFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    params: { [key: string]: any }
): { state: nkruntime.MatchState; tickRate: number; label: string } {
    const state: MatchGameState = {
        matchId: ctx.matchId,
        status: 'waiting',
        mode: 'classic',
        board: boardEngine.createBoard(),
        players: {},
        currentTurn: 'X',
        winner: null,
        moveCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    logger.info(`[Match ${ctx.matchId}] Initialized in waiting status`);

    return {
        state,
        tickRate: 1,
        label: JSON.stringify({
            mode: state.mode,
            visibility: params.visibility || 'public',
            roomName: params.roomName || state.matchId,
            status: state.status,
            createdAt: state.createdAt
        })
    };
};

/**
 * matchJoinAttempt: Validate join request before player joins the match.
 */
export const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    presence: nkruntime.Presence,
    metadata: { [key: string]: any }
): { state: nkruntime.MatchState; accept: boolean; rejectMessage?: string } {
    const gameState = state as MatchGameState;

    // Only allow joins if match is waiting or in progress
    if (gameState.status !== 'waiting' && gameState.status !== 'in_progress') {
        return { state, accept: false, rejectMessage: 'Match not available for joining' };
    }

    // Only allow max 2 players
    const playerCount = Object.keys(gameState.players).length;
    if (playerCount >= 2) {
        return { state, accept: false, rejectMessage: 'Match is full' };
    }

    logger.info(`[Match ${ctx.matchId}] Player ${presence.userId} join attempt accepted`);
    return { state, accept: true };
};

/**
 * matchJoin: Called after a player successfully joins.
 * Assigns X/O symbols and transitions to in_progress when 2 players are present.
 */
export const matchJoin: nkruntime.MatchJoinFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } {
    const gameState = state as MatchGameState;

    for (const presence of presences) {
        const playerCount = Object.keys(gameState.players).length;
        const symbol = playerCount === 0 ? 'X' : 'O';

        gameState.players[symbol] = {
            userId: presence.userId,
            username: presence.username || `Player-${presence.userId.substring(0, 6)}`,
            symbol,
            connected: true
        };

        logger.info(`[Match ${ctx.matchId}] Player ${presence.userId} joined as ${symbol}`);
    }

    // Transition to in_progress when 2 players present
    if (Object.keys(gameState.players).length === 2) {
        gameState.status = 'in_progress';
        gameState.updatedAt = Date.now();
        logger.info(`[Match ${ctx.matchId}] Game started with 2 players`);

        // Broadcast game started to all players
        const payload: any = {
            status: 'in_progress'
        };
        dispatcher.broadcastMessage(ServerOpcode.GAME_STARTED, JSON.stringify(payload));

        // Send initial state sync
        broadcastStateSync(gameState, dispatcher, logger);
    }

    return { state: gameState };
};

/**
 * matchLoop: Main game tick - process messages and update state.
 * - Receives move messages from clients
 * - Validates moves using pure engine functions
 * - Updates board and match state
 * - Broadcasts updated state to all players
 */
export const matchLoop: nkruntime.MatchLoopFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    messages: nkruntime.MatchMessage[]
): { state: nkruntime.MatchState } {
    const gameState = state as MatchGameState;

    if (gameState.status !== 'in_progress' || messages.length === 0) {
        return { state: gameState };
    }

    for (const message of messages) {
        if (message.code === ClientOpcode.MAKE_MOVE) {
            try {
                const dataStr = String.fromCharCode.apply(null, message.data as unknown as number[]);
                const moveData: MakeMovePayload = JSON.parse(dataStr);
                const position = moveData.position;

                // Validation: Is it the sender's turn?
                const currentPlayer = gameState.players[gameState.currentTurn];
                if (!currentPlayer || currentPlayer.userId !== message.sender.userId) {
                    logger.info(
                        `[Match ${ctx.matchId}] Invalid turn: ${message.sender.userId} tried to move but it's ${gameState.currentTurn}'s turn`
                    );
                    dispatcher.broadcastMessage(
                        ServerOpcode.ERROR,
                        JSON.stringify({ message: 'Not your turn' })
                    );
                    continue;
                }

                // Validation: Is the move valid?
                if (!boardEngine.isValidMove(gameState.board, position)) {
                    logger.info(`[Match ${ctx.matchId}] Invalid move at position ${position}`);
                    dispatcher.broadcastMessage(
                        ServerOpcode.ERROR,
                        JSON.stringify({ message: 'Invalid move' })
                    );
                    continue;
                }

                // Apply the move using pure engine function
                gameState.board = boardEngine.makeMove(gameState.board, position, gameState.currentTurn);
                gameState.moveCount += 1;
                gameState.updatedAt = Date.now();

                logger.info(
                    `[Match ${ctx.matchId}] ${gameState.currentTurn} moved to position ${position}`
                );

                // Check for winner or draw
                const winner = rulesEngine.checkWinner(gameState.board);
                const isDraw = rulesEngine.isDraw(gameState.board);

                if (winner) {
                    gameState.winner = winner;
                    gameState.status = 'completed';
                    logger.info(`[Match ${ctx.matchId}] Game won by ${winner}`);

                    // Broadcast game finished
                    const finishPayload: GameFinishedPayload = {
                        winner,
                        board: gameState.board
                    };
                    dispatcher.broadcastMessage(ServerOpcode.GAME_FINISHED, JSON.stringify(finishPayload));
                } else if (isDraw) {
                    gameState.winner = 'draw';
                    gameState.status = 'completed';
                    logger.info(`[Match ${ctx.matchId}] Game ended in draw`);

                    // Broadcast game finished
                    const finishPayload: GameFinishedPayload = {
                        winner: 'draw',
                        board: gameState.board
                    };
                    dispatcher.broadcastMessage(ServerOpcode.GAME_FINISHED, JSON.stringify(finishPayload));
                } else {
                    // Game continues, switch turn
                    gameState.currentTurn = rulesEngine.getNextTurn(gameState.currentTurn);
                }

                // Broadcast updated state to all players
                broadcastStateSync(gameState, dispatcher, logger);
            } catch (error) {
                logger.error(`[Match ${ctx.matchId}] Error processing move: ${error}`);
                dispatcher.broadcastMessage(
                    ServerOpcode.ERROR,
                    JSON.stringify({ message: 'Server error processing move' })
                );
            }
        } else if (message.code === ClientOpcode.LEAVE_MATCH) {
            // Player explicitly leaving - mark as disconnected
            const leavingPlayer = Object.values(gameState.players).find(p => p.userId === message.sender.userId);
            if (leavingPlayer) {
                leavingPlayer.connected = false;
                logger.info(`[Match ${ctx.matchId}] Player ${message.sender.userId} left explicitly`);
            }
        }
    }

    return { state: gameState };
};

/**
 * matchLeave: Handle player disconnect or explicit leave.
 * For MVP, mark as disconnected and continue game.
 */
export const matchLeave: nkruntime.MatchLeaveFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    presences: nkruntime.Presence[]
): { state: nkruntime.MatchState } {
    const gameState = state as MatchGameState;

    for (const presence of presences) {
        const player = Object.values(gameState.players).find(p => p.userId === presence.userId);
        if (player) {
            player.connected = false;
            logger.info(`[Match ${ctx.matchId}] Player ${presence.userId} disconnected`);
        }
    }

    gameState.updatedAt = Date.now();

    // Broadcast updated state with connection status
    broadcastStateSync(gameState, dispatcher, logger);

    // MVP: If both players disconnected for a while, the match will be cleaned up by Nakama's default behavior
    // For production, implement reconnect grace period or automatic forfeit

    return { state: gameState };
};

/**
 * matchTerminate: Called when match ends or duration expires.
 */
export const matchTerminate: nkruntime.MatchTerminateFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    graceSeconds: number
): { state: nkruntime.MatchState } {
    const gameState = state as MatchGameState;
    gameState.status = 'abandoned';
    logger.info(`[Match ${ctx.matchId}] Match terminated`);
    return { state: gameState };
};

/**
 * matchSignal: Handle signals from the Nakama runtime.
 */
export const matchSignal: nkruntime.MatchSignalFunction = function (
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    dispatcher: nkruntime.MatchDispatcher,
    tick: number,
    state: nkruntime.MatchState,
    data: string
): { state: nkruntime.MatchState; responseMessage?: string } {
    logger.info(`[Match ${ctx.matchId}] Signal received: ${data}`);
    return { state };
};

/**
 * Helper: Broadcast full game state to all players
 */
function broadcastStateSync(gameState: MatchGameState, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger): void {
    const payload: StateSyncPayload = {
        matchId: gameState.matchId,
        status: gameState.status,
        board: gameState.board,
        players: gameState.players,
        currentTurn: gameState.currentTurn,
        winner: gameState.winner,
        moveCount: gameState.moveCount
    };
    dispatcher.broadcastMessage(ServerOpcode.STATE_SYNC, JSON.stringify(payload));
}