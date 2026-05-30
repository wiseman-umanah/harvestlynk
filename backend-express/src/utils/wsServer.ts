import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { verifyToken } from "./jwt.js";

const clients = new Map<string, Set<WebSocket>>();

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k?.trim()) out[k.trim()] = v.join("=").trim();
  }
  return out;
}

export function initWsServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", async (ws, req) => {
    const cookies = parseCookies(req.headers["cookie"] ?? "");
    const url = new URL(req.url!, "http://localhost");
    const token = cookies["jwt"] ?? url.searchParams.get("token");

    if (!token) { ws.close(1008, "Unauthorized"); return; }

    try {
      const payload = await verifyToken(token);
      const { userId } = payload;

      if (!clients.has(userId)) clients.set(userId, new Set());
      clients.get(userId)!.add(ws);

      ws.on("close", () => {
        clients.get(userId)?.delete(ws);
        if (clients.get(userId)?.size === 0) clients.delete(userId);
      });

      ws.send(JSON.stringify({ type: "connected" }));
    } catch {
      ws.close(1008, "Invalid token");
    }
  });

  return wss;
}

export function pushToUser(userId: string, data: object) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  const message = JSON.stringify(data);
  for (const ws of userClients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(message);
  }
}
