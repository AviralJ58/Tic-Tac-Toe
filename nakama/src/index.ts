// Tic-Tac-Toe Nakama runtime module
// All game logic and RPC handlers

// ============ MATCH HANDLER ============

function matchInit(ctx: any, logger: any, nk: any, params: any): any {
  return {
    state: {
      matchId: ctx.matchId,
      status: 'waiting',
      board: Array(9).fill(null),
      players: {},
      currentTurn: 'X',
      winner: null,
      moves: 0
    },
    tickRate: 10,
    label: 'tic_tac_toe_match'
  };
}

function matchJoinAttempt(ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, presence: any, metadata: any): any {
  return {
    state: state,
    accept: Object.keys(state.players).length < 2,
    reason: Object.keys(state.players).length >= 2 ? 'Match is full' : ''
  };
}

function matchJoin(ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, presences: any[]): any {
  for (let presence of presences) {
    const playerCount = Object.keys(state.players).length;
    state.players[presence.userId] = {
      userId: presence.userId,
      username: presence.username,
      symbol: playerCount === 0 ? 'X' : 'O'
    };

    if (Object.keys(state.players).length === 2) {
      state.status = 'playing';
      state.currentTurn = 'X';
    }
  }

  return state;
}

function matchLoop(ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, messages: any[]): any {
  if (state.status !== 'playing' || messages.length === 0) {
    return state;
  }

  for (let message of messages) {
    const moveData = JSON.parse(message.data);
    const position = moveData.position;

    // Validate move
    if (position < 0 || position > 8 || state.board[position] !== null) {
      continue;
    }

    state.board[position] = state.currentTurn;
    state.moves += 1;

    // Check winner
    const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (let line of lines) {
      const [a, b, c] = line;
      if (state.board[a] && state.board[a] === state.board[b] && state.board[a] === state.board[c]) {
        state.winner = state.board[a];
        state.status = 'finished';
      }
    }

    // Check draw
    if (state.moves === 9 && !state.winner) {
      state.status = 'finished';
      state.winner = 'draw';
    }

    // Next turn
    if (state.status === 'playing') {
      state.currentTurn = state.currentTurn === 'X' ? 'O' : 'X';
    }

    dispatcher.broadcastMessage(1, JSON.stringify({
      board: state.board,
      currentTurn: state.currentTurn,
      status: state.status,
      winner: state.winner
    }));
  }

  return state;
}

function matchLeave(ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, presences: any[]): any {
  for (let presence of presences) {
    delete state.players[presence.userId];
  }

  return Object.keys(state.players).length > 0 ? state : null;
}

function matchTerminate(ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, graceSeconds: number): any {
  return state;
}

function matchSignal(ctx: any, logger: any, nk: any, dispatcher: any, tick: number, state: any, data: string): string {
  logger.info('Match signal received: ' + data);
  return '';
}

// ============ RPC HANDLERS ============

function createRoom(ctx: any, logger: any, nk: any, payload: string): string {
  try {
    const data = JSON.parse(payload);
    return JSON.stringify({
      success: true,
      room: {
        roomId: 'room_' + Math.random().toString(36).substr(2, 9),
        name: data.roomName || 'Untitled Game'
      }
    });
  } catch (e) {
    return JSON.stringify({ success: false, error: String(e) });
  }
}

function listRooms(ctx: any, logger: any, nk: any, payload: string): string {
  return JSON.stringify({ success: true, rooms: [] });
}

function joinRoom(ctx: any, logger: any, nk: any, payload: string): string {
  try {
    const data = JSON.parse(payload);
    return JSON.stringify({ success: true, message: 'Joined room' });
  } catch (e) {
    return JSON.stringify({ success: false, error: String(e) });
  }
}

// ============ NAKAMA INITIALIZATION ============
// InitModule is called by Nakama at runtime startup
function InitModule(ctx: any, logger: any, nk: any, initializer: any): void {
  logger.info('Initializing Tic-Tac-Toe runtime module');

  // Register match handler
  initializer.registerMatch(
    'tic_tac_toe',
    {
      matchInit,
      matchJoinAttempt,
      matchJoin,
      matchLoop,
      matchLeave,
      matchTerminate,
      matchSignal
    }
  );

  // Register RPC handlers
  initializer.registerRpc('createRoom', createRoom);
  initializer.registerRpc('listRooms', listRooms);
  initializer.registerRpc('joinRoom', joinRoom);

  logger.info('Tic-Tac-Toe runtime module initialized successfully');
}
