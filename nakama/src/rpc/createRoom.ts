// Create room RPC
// Creates a new authoritative match room in "waiting" status

import { CreateRoomRequest, CreateRoomResponse } from '../types';

export function rpcCreateRoom(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        const request: CreateRoomRequest = JSON.parse(payload);
        const roomName = request.roomName || `Game by ${(ctx.userId || 'Unknown').substring(0, 8)}`;
        const mode = request.mode || 'classic';
        const visibility = request.visibility || 'public';

        // Create authoritative match with labels for filtering
        const matchId = nk.matchCreate('tic_tac_toe', {
            mode,
            visibility,
            createdBy: ctx.userId,
            roomName,
            status: 'waiting',
            createdAt: Date.now()
            // Label helps with filtering/listing
        });

        logger.info(`Created match ${matchId}: "${roomName}" (${mode}, ${visibility})`);

        const response: CreateRoomResponse = {
            success: true,
            matchId
        };
        return JSON.stringify(response);
    } catch (error) {
        logger.error('Error in createRoom: ' + error);
        const response: CreateRoomResponse = {
            success: false,
            error: String(error)
        };
        return JSON.stringify(response);
    }
}