// Join room RPC
// Per AGENT_INIT.md § 6, joins an existing match room and transitions to in_progress if at capacity

export function rpcJoinRoom(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        // Placeholder: Parse roomId, validate match exists, join as player
        // TODO: Implement match join

        const response = {
            success: false,
            message: 'Not yet implemented'
        };
        return JSON.stringify(response);
    } catch (error) {
        logger.error('Error in joinRoom: ' + error);
        return JSON.stringify({ success: false, error: String(error) });
    }
}