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

        // Update match label so listing shows correct status
        updateMatchLabel(gameState, dispatcher);

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
        if (message.opCode === ClientOpcode.MAKE_MOVE) {
            try {
                // Nakama's goja JS runtime delivers match data as an ArrayBuffer
                let dataStr: string;
                if (typeof message.data === 'string') {
                    dataStr = message.data;
                } else {
                    // Convert ArrayBuffer to string via Uint8Array
                    const bytes = new Uint8Array(message.data as unknown as ArrayBuffer);
                    const chars: string[] = [];
                    for (let i = 0; i < bytes.length; i++) {
                        chars.push(String.fromCharCode(bytes[i]));
                    }
                    dataStr = chars.join('');
                }

                logger.info(`[Match ${ctx.matchId}] Parsing move: ${dataStr}`);
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
                    updateMatchLabel(gameState, dispatcher);

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
                    updateMatchLabel(gameState, dispatcher);

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
        } else if (message.opCode === ClientOpcode.LEAVE_MATCH) {
            // Player explicitly leaving
            handlePlayerDeparture(gameState, message.sender.userId, dispatcher, logger);
            broadcastStateSync(gameState, dispatcher, logger);
        }
    }

    return { state: gameState };
};

/**
 * matchLeave: Handle player disconnect.
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
        handlePlayerDeparture(gameState, presence.userId, dispatcher, logger);
    }

    gameState.updatedAt = Date.now();
    broadcastStateSync(gameState, dispatcher, logger);

    return { state: gameState };
};

/**
 * Helper: Handle a player leaving explicitly or via disconnect.
 * Forfeits in-progress games, cleans up waiting rooms.
 */
function handlePlayerDeparture(gameState: MatchGameState, userId: string, dispatcher: nkruntime.MatchDispatcher, logger: nkruntime.Logger) {
    const playerEntry = Object.entries(gameState.players).find(([_, p]) => p?.userId === userId);
    if (!playerEntry) return;

    const [symbol, leavingPlayer] = playerEntry as [string, PlayerState];
    leavingPlayer.connected = false;

    if (gameState.status === 'in_progress') {
        const winnerSymbol = symbol === 'X' ? 'O' : 'X';
        gameState.winner = winnerSymbol as 'X' | 'O';
        gameState.status = 'completed';
        logger.info(`[Match ${gameState.matchId}] Player ${userId} forfeited. Game won by ${winnerSymbol}`);
        updateMatchLabel(gameState, dispatcher);

        const finishPayload = {
            winner: winnerSymbol,
            board: gameState.board
        };
        dispatcher.broadcastMessage(ServerOpcode.GAME_FINISHED, JSON.stringify(finishPayload));
    } else if (gameState.status === 'waiting') {
        if (symbol === 'X') delete gameState.players.X;
        if (symbol === 'O') delete gameState.players.O;
        
        logger.info(`[Match ${gameState.matchId}] Player ${userId} left waiting room`);

        if (Object.keys(gameState.players).length === 0) {
            gameState.status = 'abandoned';
            logger.info(`[Match ${gameState.matchId}] Room abandoned`);
        }
        updateMatchLabel(gameState, dispatcher);
    }
}



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

/**
 * Helper: Update match label to reflect current status
 * This ensures findOrCreateMatch / listRooms see correct match state
 */
function updateMatchLabel(gameState: MatchGameState, dispatcher: nkruntime.MatchDispatcher): void {
    dispatcher.matchLabelUpdate(JSON.stringify({
        mode: gameState.mode,
        status: gameState.status,
        updatedAt: gameState.updatedAt
    }));
}