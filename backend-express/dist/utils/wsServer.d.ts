import { WebSocket } from "ws";
import type { Server } from "http";
export declare function initWsServer(server: Server): import("ws").Server<typeof WebSocket, typeof import("node:http").IncomingMessage>;
export declare function pushToUser(userId: string, data: object): void;
//# sourceMappingURL=wsServer.d.ts.map