// List rooms RPC
// Per AGENT_INIT.md § 7, lists available rooms for joining

import { ListRoomsResponse, WaitingRoom } from '../types';

export function rpcListRooms(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        // Query for matches with "waiting" status
        // Use label filtering to find open games
        const limit = 100;

        // matchList signature: matchList(limit, authoritative, label, minSize, maxSize, query)
        // The 3rd arg is a label QUERY string, not the match handler name.
        // Use '*' or a partial match to find all authoritative matches, then filter in code.
        const matches = nk.matchList(limit, true, null, null, null, null);

        const rooms: WaitingRoom[] = matches
            .map((match: any) => {
                let labelProps: any = {};
                try {
                    labelProps = match.label ? JSON.parse(match.label) : {};
                } catch {}
                return {
                    matchId: match.matchId,
                    name: labelProps.roomName || match.properties?.roomName || `Game #${match.matchId.substring(0, 6)}`,
                    mode: labelProps.mode || match.properties?.mode || 'classic',
                    visibility: labelProps.visibility || match.properties?.visibility || 'public',
                    playerCount: match.size || 0,
                    createdAt: labelProps.createdAt || match.properties?.createdAt || Date.now(),
                    status: labelProps.status || match.properties?.status || 'waiting'
                };
            })
            .filter((room: any) => room.status === 'waiting' && room.visibility === 'public');

        logger.info(`Listed ${rooms.length} waiting rooms`);

        const response: ListRoomsResponse = {
            success: true,
            rooms
        };
        return JSON.stringify(response);
    } catch (error) {
        logger.error('Error in listRooms: ' + error);
        const response: ListRoomsResponse = {
            success: false,
            rooms: [],
            error: String(error)
        };
        return JSON.stringify(response);
    }
}