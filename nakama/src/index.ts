// Tic-Tac-Toe Nakama runtime module
// Authoritative match server per AGENT_INIT.md
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

/**
 * InitModule: Nakama entry point called at runtime startup.
 * Registers match handler and RPC endpoints.
 * Per AGENT_INIT.md § 2, this is the single initialization point.
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

    logger.info('[InitModule] Tic-Tac-Toe runtime module initialized successfully');
  } catch (error) {
    logger.error(`[InitModule] Failed to initialize: ${error}`);
    throw error;
  }
}
