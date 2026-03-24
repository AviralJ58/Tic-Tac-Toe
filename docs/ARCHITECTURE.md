# Architecture Deep Dive

This document expands on the systems design principles surrounding the server-authoritative multiplayer Tic-Tac-Toe.

## System Overview Diagram

![Architecture Diagram](images/architecture.png)

## The Server-Authoritative Decision
In traditional P2P multiplayer, resolving conflicts requires complex determinism or "host-advantage" trusts. In this game, **clients have zero authority**. 
- Clients explicitly send intents (`ClientOpcode.MAKE_MOVE`).
- The Server assesses the intent.
- The Server pushes absolute reality down to all players (`ServerOpcode.STATE_SYNC`).

## Protocol Opcodes
Messages sent over the WebSockets match data stream are identified by Opcodes:

**Client -> Server**
- `1 (MAKE_MOVE)`: The client is attempting to place an X or O at a specific tile index.

**Server -> Client**
- `100 (STATE_SYNC)`: Complete game state refresh. Contains the rigid `board` structure, the active player's turn, total move counts, and the configured deadline (for Timed games).
- `101 (GAME_FINISHED)`: Match concluded. Broadcasts the final winner symbol so clients can render the outcome screens.

## Frontend Architecture
The client is built using React and TypeScript, functioning as a strict **Thin Client**:
1. **Zustand State Management:** 
   - A singular, immutable global store (`gameStore.ts`) holds the local representation of the match, including pointers to the active `nakama.d.ts` session, socket connections, and the synced 2D board.
   - Using Zustand ensures minimal re-renders as socket events stream in at high velocity.
2. **Nakama JS SDK Integration:**
   - Wraps the frontend into a seamless WebSockets listener loop. Authentication, session caching, and polling the RPCs (`findOrCreateMatch`, `listRooms`) run through dedicated asynchronous helper wrappers securely managed in `services/nakama.ts`.
3. **Optimistic Overrides Disabled:**
   - Because the server acts as the absolute legal authority of the match state, frontend UI components (like `GameScreen`) deliberately do not optimistically register clicks. A click fires a `MAKE_MOVE` payload across the socket and ignores local alterations until the server formally sends back a `STATE_SYNC`.

## Match Lifecycle (The MatchHandler)
Nakama manages matches in memory via 6 dedicated callback hooks inside `/nakama/src/match/ticTacToeMatch.ts`:

1. `matchInit`: Sets up the memory for `MatchGameState`. Determines if the match is Classic or Timed.
2. `matchJoinAttempt`: Checks if the match has room. Capacity is strictly 2 players.
3. `matchJoin`: Welcomes the newly joined player, assigns them `X` or `O`, and checks if the game is ready to start.
4. `matchLoop`: The heartbeat function executing 1 time per second. It checks inactivity timers and forcefully declares timeout forfeits if the `turnDeadline` expires. It constantly dispatches `STATE_SYNC`.
5. `matchLeave`: Fired manually by a client leaving, or automatically by Nakama recognizing a broken socket. Instantly grants the remaining player the Win via forfeit.
6. `matchTerminate`: Memory cleanup phase.

## Storage and Economy
`Player Profiles` and `Leaderboards` run entirely isolated on the Server hook. 

1. **Storage Objects:** Each user has a JSON object inside the `stats` collection. Using `permissionRead: 2` (Public) and `permissionWrite: 0` (No client edits), the server safely increments Lifetime Wins securely at the end of every match conclusion.
2. **Leaderboards:** Configured as `INCREMENTAL` operations natively. `3 points` are issued to match winners, `1 point` exclusively to draws. 
