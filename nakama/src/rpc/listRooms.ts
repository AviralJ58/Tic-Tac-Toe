// List rooms RPC
// Per AGENT_INIT.md § 7, lists available rooms for joining

export function rpcListRooms(
    ctx: nkruntime.Context,
    logger: nkruntime.Logger,
    nk: nkruntime.Nakama,
    payload: string
): string {
    try {
        // Placeholder: Query for matches with status=waiting, label filters
        // TODO: Implement match listing

        const response = {
            success: false,
            rooms: [],
            message: 'Not yet implemented'
        };
        return JSON.stringify(response);
    } catch (error) {
        logger.error('Error in listRooms: ' + error);
        return JSON.stringify({ success: false, rooms: [], error: String(error) });
    }
}