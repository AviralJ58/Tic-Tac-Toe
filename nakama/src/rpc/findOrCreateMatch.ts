// findOrCreateMatch RPC
// Server-side matchmaking: finds an existing waiting room or creates a new one.
// This eliminates race conditions from client-side list+join logic.

import { CreateRoomResponse } from '../types';

interface FindOrCreateRequest {
    nickname?: string;
    mode?: 'classic' | 'timed';
}

export function rpcFindOrCreateMatch(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        const request: FindOrCreateRequest = payload ? JSON.parse(payload) : {};
        const nickname = request.nickname || `Player-${(ctx.userId || '').substring(0, 6)}`;
        const mode = request.mode === 'timed' ? 'timed' : 'classic';

        // List all authoritative matches
        const matches = nk.matchList(100, true, null, null, null, null);

        // Find an existing waiting room with space (playerCount < 2)
        for (const match of matches) {
            let labelProps: any = {};
            try {
                labelProps = match.label ? JSON.parse(match.label) : {};
            } catch {}

            const status = labelProps.status || 'unknown';
            const size = match.size || 0;

            if (status === 'waiting' && size < 2 && labelProps.mode === mode) {
                logger.info(`[findOrCreateMatch] Found waiting match ${match.matchId} (${size} players), assigning to ${ctx.userId}`);
                const response: CreateRoomResponse = {
                    success: true,
                    matchId: match.matchId
                };
                return JSON.stringify(response);
            }
        }

        // No waiting room found — create a new one
        const matchId = nk.matchCreate('tic_tac_toe', {
            mode,
            visibility: 'public',
            createdBy: ctx.userId,
            roomName: `${nickname}'s Game`,
            status: 'waiting',
            createdAt: Date.now()
        });

        logger.info(`[findOrCreateMatch] Created new match ${matchId} for ${ctx.userId}`);

        const response: CreateRoomResponse = {
            success: true,
            matchId
        };
        return JSON.stringify(response);
    } catch (error) {
        logger.error('Error in findOrCreateMatch: ' + error);
        const response: CreateRoomResponse = {
            success: false,
            error: String(error)
        };
        return JSON.stringify(response);
    }
}
