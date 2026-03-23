// Tic-Tac-Toe authoritative match handler
// Implements Nakama MatchHandler interface per AGENT_INIT.md § 5-6

import { MatchGameState, PlayerState } from '../types';

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
        board: Array(9).fill(null),
        players: {},
        currentTurn: 'X',
        winner: null,
        moveCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };

    return {
        state,
        tickRate: 1,
        label: 'waiting'
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

    // Only allow joins if match is waiting
    if (gameState.status !== 'waiting' && gameState.status !== 'in_progress') {
        return { state, accept: false, rejectMessage: 'Match not available for joining' };
    }

    // Only allow max 2 players
    const playerCount = Object.keys(gameState.players).length;
    if (playerCount >= 2) {
        return { state, accept: false, rejectMessage: 'Match is full' };
    }

    return { state, accept: true };
};

/**
 * matchJoin: Called after a player successfully joins.
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
    // Placeholder: Player assignment logic to be implemented
    return { state };
};

/**
 * matchLeave: Handle player disconnect or explicit leave.
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
    // Placeholder: Disconnect handling logic to be implemented
    return { state };
};

/**
 * matchLoop: Main game tick - process messages and update state.
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
    // Placeholder: Match loop logic to be implemented
    // - Process MAKE_MOVE messages
    // - Validate moves
    // - Update board
    // - Check win/draw
    // - Broadcast state to clients
    return { state };
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
    // Placeholder: Cleanup and persistence logic to be implemented
    return { state };
};