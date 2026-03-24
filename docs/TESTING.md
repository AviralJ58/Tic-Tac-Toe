# Testing Guide

This guide details exactly how to verify the networking loops and structural mechanics of the Tic-Tac-Toe engine during local development.

## 1. Local Testing Environment
You need to operate multiple clients locally.
- Fire up the React app (`npm run dev`) at `http://localhost:5173`.
- Open 1 standard Browser Window.
- Open 1 **Incognito/Private** Browser Window.
- Log in to both pages using different unique Nicknames. This ensures Nakama generates distinct Session IDs.

## 2. Testing Matchmaking Flow
- **Quick Match:** Have both clients simultaneously hit "Quick Match". The server's RPC should pair them into an automatically generated hidden room in under 1 second.
- **Custom Rooms:** Have Player A hit "Create Room". Keep Player B actively looking at the Lobby. Player B should click "Refresh". The room list should populate, allowing Player B to manually select "Join" into Player A's hosted match.

## 3. Testing Gameplay Logic
- Verify turn switching. Attempts by Player B to act during Player A's turn should be swallowed transparently by the server.
- Verify placement collision (attempts to overwrite an already claimed cell should be ignored).
- Execute a known Win condition (three parallel marks). Ensure the `GAME_FINISHED` broadcast resolves instantly to the Result screening.

## 4. Testing Edge Cases (Disconnects and Timeouts)
- **Timeout Forfeits:** Create a `Timed (30s)` room. Start the game. Do nothing on Player A's turn. Wait exactly 30 seconds. The server's tick loop should detect the timestamp expiry, broadcast the forfeit, and award the win strictly to Player B.
- **Connection Drops:** Start a match. Immediately close Player A's tab entirely (simulating an internet outage). In ~1 second, Player B's client should announce they have Won via Forfeit.

## 5. Testing Persistence Integrity
- Post-match, return to the Lobby and click the Profile dropdown.
- Verify the total Score appropriately increased. Compare the Win/Loss records.
- Head to the Global Leaderboard screen. Your points should be seamlessly sorted and logged without manual intervention.
