// Centralized Nakama service layer
// All Nakama client/socket logic lives here — no Nakama imports in components

import { Client, Session, Socket } from '@heroiclabs/nakama-js';
import { CreateRoomResponse, ClientOpcode, ServerOpcode, StateSyncPayload, GameFinishedPayload, ErrorPayload } from '../types';
import { useGameStore } from '../store/gameStore';

const NAKAMA_HOST = '127.0.0.1';
const NAKAMA_PORT = '7350';
const NAKAMA_USE_SSL = false;
const NAKAMA_SERVER_KEY = 'defaultkey';

const DEVICE_ID_KEY = 'ttt_device_id';
const SESSION_TOKEN_KEY = 'ttt_session_token';
const REFRESH_TOKEN_KEY = 'ttt_refresh_token';
const NICKNAME_KEY = 'ttt_nickname';

let client: Client | null = null;
let session: Session | null = null;
let socket: Socket | null = null;
let currentMatchId: string | null = null;

function getClient(): Client {
  if (!client) {
    client = new Client(NAKAMA_SERVER_KEY, NAKAMA_HOST, NAKAMA_PORT, NAKAMA_USE_SSL);
  }
  return client;
}

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

/** Clear saved session from localStorage */
function clearSession(): void {
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  session = null;
}

/** Authenticate with device ID (guest auth) */
export async function authenticate(nickname: string): Promise<void> {
  const store = useGameStore.getState();
  const c = getClient();
  const deviceId = getOrCreateDeviceId();

  // Try restoring an existing session first
  const existingToken = localStorage.getItem(SESSION_TOKEN_KEY);
  const existingRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (existingToken && existingRefresh) {
    try {
      const restored = Session.restore(existingToken, existingRefresh);
      // Add a 5-minute buffer so we don't use tokens that are about to expire
      const nowWithBuffer = Date.now() / 1000 + 300;
      if (!restored.isexpired(nowWithBuffer)) {
        session = restored;
        store.setAuth(session.user_id!, nickname);
        localStorage.setItem(NICKNAME_KEY, nickname);
        return;
      }
    } catch (e) {
      console.warn('[Nakama] Failed to restore session, re-authenticating:', e);
    }
    // If we reach here, the stored session is stale/invalid — clear it
    clearSession();
  }

  // Fresh auth
  session = await c.authenticateDevice(deviceId, true, nickname);
  localStorage.setItem(SESSION_TOKEN_KEY, session.token!);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token!);
  localStorage.setItem(NICKNAME_KEY, nickname);
  store.setAuth(session.user_id!, nickname);
}

/** Connect WebSocket */
export async function connectSocket(): Promise<void> {
  const store = useGameStore.getState();
  if (!session) throw new Error('Not authenticated');

  store.setConnecting(true);

  const c = getClient();
  socket = c.createSocket(NAKAMA_USE_SSL, false);

  socket.ondisconnect = () => {
    store.setConnected(false);
  };

  socket.onerror = (evt) => {
    console.error('[Nakama] Socket error:', evt);
  };

  // Register match data handler
  socket.onmatchdata = (matchData) => {
    handleMatchData(matchData);
  };

  socket.onmatchpresence = (presenceEvent) => {
    console.log('[Nakama] Presence event:', presenceEvent);
  };

  try {
    await socket.connect(session, true);
    store.setConnected(true);
    store.setConnecting(false);
  } catch (err) {
    console.warn('[Nakama] Socket connect failed, clearing session and retrying:', err);
    // The token may have been accepted by isexpired() but rejected by the server.
    // Clear the stale session and force a fresh authentication.
    clearSession();
    socket = null;
    store.setConnecting(false);
    throw new Error('Connection failed — please try again');
  }
}

/** Find or create a match via server-side RPC */
export async function findMatch(nickname: string): Promise<string> {
  if (!session || !client) throw new Error('Not authenticated');

  const payload = JSON.stringify({ nickname });
  const rpcResponse = await client.rpc(session, 'findOrCreateMatch', { nickname });
  
  let result: CreateRoomResponse;
  if (typeof rpcResponse.payload === 'string') {
    result = JSON.parse(rpcResponse.payload);
  } else {
    // If it's already an object, just cast it
    result = rpcResponse.payload as unknown as CreateRoomResponse;
  }

  if (!result.success || !result.matchId) {
    throw new Error(result.error || 'Failed to find/create match');
  }

  return result.matchId;
}

/** Join a match via WebSocket */
export async function joinMatch(matchId: string): Promise<void> {
  if (!socket) throw new Error('Socket not connected');

  const store = useGameStore.getState();
  const match = await socket.joinMatch(matchId);
  currentMatchId = matchId;
  store.setMatchId(matchId);

  // If match already has state in the label or presences, process it
  console.log('[Nakama] Joined match:', match.match_id, 'self:', match.self);
}

/** Send a move intent to the server */
export async function sendMove(position: number): Promise<void> {
  if (!socket || !currentMatchId) {
    console.warn('[Nakama] Cannot send move: socket or matchId missing');
    return;
  }

  try {
    const payload = JSON.stringify({ position });
    console.log('[Nakama] Sending move:', position, 'to match:', currentMatchId);
    await socket.sendMatchState(currentMatchId, ClientOpcode.MAKE_MOVE, payload);
    console.log('[Nakama] Move sent successfully');
  } catch (e) {
    console.error('[Nakama] Failed to send move:', e);
  }
}

/** Leave the current match */
export async function leaveMatch(): Promise<void> {
  if (!socket || !currentMatchId) return;

  try {
    await socket.leaveMatch(currentMatchId);
  } catch (e) {
    console.warn('[Nakama] Error leaving match:', e);
  }
  currentMatchId = null;
}

/** Disconnect socket and cleanup */
export function disconnect(): void {
  if (socket) {
    socket.disconnect(false);
    socket = null;
  }
  currentMatchId = null;
}

/** Get saved nickname from localStorage */
export function getSavedNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) || '';
}

// ─── Internal ────────────────────────────────────────────────────────────────

function handleMatchData(matchData: any): void {
  const store = useGameStore.getState();
  const opCode = matchData.op_code;

  // Decode binary data to string
  let dataStr = '';
  if (matchData.data) {
    if (typeof matchData.data === 'string') {
      dataStr = matchData.data;
    } else if (matchData.data instanceof Uint8Array) {
      dataStr = new TextDecoder().decode(matchData.data);
    } else {
      dataStr = String(matchData.data);
    }
  }

  try {
    switch (opCode) {
      case ServerOpcode.STATE_SYNC: {
        const payload: StateSyncPayload = JSON.parse(dataStr);
        store.updateFromStateSync(payload);
        break;
      }
      case ServerOpcode.GAME_STARTED: {
        store.setScreen('game');
        break;
      }
      case ServerOpcode.GAME_FINISHED: {
        const payload: GameFinishedPayload = JSON.parse(dataStr);
        // State sync will also arrive, but capture winner
        store.setGameFinished(payload.winner);
        break;
      }
      case ServerOpcode.ERROR: {
        const payload: ErrorPayload = JSON.parse(dataStr);
        store.setError(payload.message);
        break;
      }
      default:
        console.log('[Nakama] Unhandled opcode:', opCode, dataStr);
    }
  } catch (e) {
    console.error('[Nakama] Error handling match data:', e);
  }
}
