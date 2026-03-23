// Join room RPC
// Per AGENT_INIT.md § 6, validates join possibility
// Note: Actual match join happens via socket matchJoin, after this RPC succeeds

import { JoinRoomRequest, JoinRoomResponse } from '../types';

export function rpcJoinRoom(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        const request: JoinRoomRequest = JSON.parse(payload);
        const { matchId } = request;

        if (!matchId) {
            const response: JoinRoomResponse = {
                success: false,
                error: 'matchId is required'
            };
            return JSON.stringify(response);
        }

        // Validate match exists and is joinable
        // In Nakama, we can list matches to check, but the real join happens via socket
        // For MVP, we do a basic validation
        try {
            const matches = nk.matchList(1, false, `matchId:${matchId}`);
            if (matches.length === 0) {
                const response: JoinRoomResponse = {
                    success: false,
                    error: 'Match not found'
                };
                return JSON.stringify(response);
            }

            const match = matches[0] as any;
            // Check if match is full
            if ((match.size || 0) >= 2) {
                const response: JoinRoomResponse = {
                    success: false,
                    error: 'Match is full'
                };
                return JSON.stringify(response);
            }
        } catch (e) {
            // If matchList doesn't work as expected, we'll let the actual join attempt handle it
            logger.info(`Could not pre-validate match ${matchId}, will attempt join`);
        }

        logger.info(`Validated join request for match ${matchId} from user ${ctx.userId}`);

        const response: JoinRoomResponse = {
            success: true,
            matchId
        };
        return JSON.stringify(response);
    } catch (error) {
        logger.error('Error in joinRoom: ' + error);
        const response: JoinRoomResponse = {
            success: false,
            error: String(error)
        };
        return JSON.stringify(response);
    }
}