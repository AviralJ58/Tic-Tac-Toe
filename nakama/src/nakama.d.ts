// Type declarations for Nakama TypeScript runtime
// Minimal types for compilation purposes - actual runtime types are provided by Nakama

declare namespace nkruntime {
    interface Context {
        matchId: string;
        [key: string]: any;
    }

    interface Logger {
        info(msg: string): void;
        error(msg: string): void;
        warn(msg: string): void;
        debug(msg: string): void;
    }

    interface Nakama {
        matchCreate(moduleName: string, params?: any): string;
        matchJoin(matchId: string, userId: string): void;
        matchList(limit: number, authoritative?: boolean, label?: string): any[];
        [key: string]: any;
    }

    interface Initializer {
        registerMatch(id: string, handlers: any): void;
        registerRpc(id: string, fn: Function): void;
        [key: string]: any;
    }

    interface MatchState {
        [key: string]: any;
    }

    interface Presence {
        userId: string;
        sessionId: string;
        username?: string;
        [key: string]: any;
    }

    interface MatchMessage {
        code: number;
        sender: Presence;
        data: Uint8Array;
    }

    interface MatchDispatcher {
        broadcastMessage(opCode: number, data: any): void;
        matchLabelUpdate(label: string): void;
        [key: string]: any;
    }

    type MatchInitFunction = (
        ctx: Context,
        logger: Logger,
        nk: Nakama,
        params: { [key: string]: any }
    ) => { state: MatchState; tickRate: number; label: string };

    type MatchJoinAttemptFunction = (
        ctx: Context,
        logger: Logger,
        nk: Nakama,
        dispatcher: MatchDispatcher,
        tick: number,
        state: MatchState,
        presence: Presence,
        metadata: { [key: string]: any }
    ) => { state: MatchState; accept: boolean; rejectMessage?: string };

    type MatchJoinFunction = (
        ctx: Context,
        logger: Logger,
        nk: Nakama,
        dispatcher: MatchDispatcher,
        tick: number,
        state: MatchState,
        presences: Presence[]
    ) => { state: MatchState };

    type MatchLeaveFunction = (
        ctx: Context,
        logger: Logger,
        nk: Nakama,
        dispatcher: MatchDispatcher,
        tick: number,
        state: MatchState,
        presences: Presence[]
    ) => { state: MatchState };

    type MatchLoopFunction = (
        ctx: Context,
        logger: Logger,
        nk: Nakama,
        dispatcher: MatchDispatcher,
        tick: number,
        state: MatchState,
        messages: MatchMessage[]
    ) => { state: MatchState };

    type MatchTerminateFunction = (
        ctx: Context,
        logger: Logger,
        nk: Nakama,
        dispatcher: MatchDispatcher,
        tick: number,
        state: MatchState,
        graceSeconds: number
    ) => { state: MatchState };
}