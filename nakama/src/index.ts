// Tic-Tac-Toe Nakama runtime module
// Authoritative match server
// Imports modular game logic (engine, match handlers, RPC handlers)

import {
  matchInit,
  matchJoinAttempt,
  matchJoin,
  matchLoop,
  matchLeave,
  matchTerminate,
  matchSignal
} from './match/ticTacToeMatch';

import { rpcCreateRoom } from './rpc/createRoom';
import { rpcListRooms } from './rpc/listRooms';
import { rpcJoinRoom } from './rpc/joinRoom';
import { rpcFindOrCreateMatch } from './rpc/findOrCreateMatch';

/**
 * InitModule: Nakama entry point called at runtime startup.
 * Registers match handler and RPC endpoints.
 * This is the single initialization point.
 */
export function InitModule(ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, initializer: nkruntime.Initializer): void {
  logger.info('[InitModule] Starting Tic-Tac-Toe runtime module');

  try {
    // Register match handler with all 7 lifecycle functions
    initializer.registerMatch('tic_tac_toe', {
      matchInit,
      matchJoinAttempt,
      matchJoin,
      matchLoop,
      matchLeave,
      matchTerminate,
      matchSignal
    });
    logger.info('[InitModule] ✓ Match handler "tic_tac_toe" registered');

    // Register RPC endpoints for room management
    initializer.registerRpc('createRoom', rpcCreateRoom);
    logger.info('[InitModule] ✓ RPC "createRoom" registered');

    initializer.registerRpc('listRooms', rpcListRooms);
    logger.info('[InitModule] ✓ RPC "listRooms" registered');

    initializer.registerRpc('joinRoom', rpcJoinRoom);
    logger.info('[InitModule] ✓ RPC "joinRoom" registered');

    initializer.registerRpc('findOrCreateMatch', rpcFindOrCreateMatch);
    logger.info('[InitModule] ✓ RPC "findOrCreateMatch" registered');

    // Initialize leaderboards
    const sortOrder = 'desc';
    const operator = 'incr';
    
    nk.leaderboardCreate('tictactoe_classic', true, sortOrder, operator, null, { mode: 'classic' });
    logger.info('[InitModule] ✓ Leaderboard "tictactoe_classic" created');

    nk.leaderboardCreate('tictactoe_timed', true, sortOrder, operator, null, { mode: 'timed' });
    logger.info('[InitModule] ✓ Leaderboard "tictactoe_timed" created');

    logger.info('[InitModule] Tic-Tac-Toe runtime module initialized successfully');
  } catch (error) {
    logger.error(`[InitModule] Failed to initialize: ${error}`);
    throw error;
  }
}
