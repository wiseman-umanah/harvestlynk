/**
 * notifications.test.ts — /api/v1/notifications routes
 *
 * GET    /notifications               — list all (with optional type filter)
 * GET    /notifications/unread-count  — count unread
 * PATCH  /notifications/:id/read      — mark single as read
 * PATCH  /notifications/read-all      — mark all as read
 */

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, wallets } from "../db/schema.js";
import { signAccessToken } from "../utils/jwt.js";
import { createNotification } from "../utils/notifications.js";

// ─── Supabase mock ────────────────────────────────────────────────────────────

vi.mock("../utils/supabase.js", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser: async (token: string) => {
        try {
          const [, b64] = token.split(".");
          const p = JSON.parse(Buffer.from(b64, "base64url").toString()) as { email?: string; userId?: string };
          if (p.email)
            return { data: { user: { id: `sb-${p.userId ?? "x"}`, email: p.email, email_confirmed_at: new Date().toISOString() } }, error: null };
        } catch { /* */ }
        return { data: { user: null }, error: { message: "invalid" } };
      },
    },
  }),
  getAuthRedirectUrl: (p: string) => `http://localhost${p}`,
  getSupabaseUserNameParts: () => ({ firstName: "T", lastName: "U" }),
  isSupabaseEmailVerified: () => true,
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE = "/api/v1/notifications";

async function insertUser(role: "farmer" | "buyer" = "farmer") {
  const userId = randomUUID();
  const email = `notif-${userId.slice(0, 8)}@notif.test`;
  await db.insert(users).values({
    id: userId, firstName: "N", lastName: "U", email,
    passwordHash: "x", role, emailVerified: true, acceptedTerms: true,
  });
  await db.insert(wallets).values({ userId, availableBalance: 0, pendingBalance: 0, totalPaidIn: 0, totalPaidOut: 0 });
  const token = await signAccessToken({ userId, email, role });
  return { userId, email, token };
}

function auth(t: string) { return { Authorization: `Bearer ${t}` }; }

// ─── GET /notifications ───────────────────────────────────────────────────────

describe("GET /api/v1/notifications", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(BASE);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no notifications", async () => {
    const { token } = await insertUser();
    const res = await request(app).get(BASE).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns notification with correct shape", async () => {
    const { userId, token } = await insertUser();
    await createNotification({ userId, type: "order", title: "New Order", message: "You got one" });

    const res = await request(app).get(BASE).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].notification_id).toBeDefined();
    expect(res.body[0].title).toBe("New Order");
    expect(res.body[0].type).toBe("order");
    expect(res.body[0].is_read).toBe(false);
    expect(res.body[0].created_at).toBeDefined();
  });

  it("filters by type=order", async () => {
    const { userId, token } = await insertUser();
    await createNotification({ userId, type: "order",   title: "Order",   message: "msg" });
    await createNotification({ userId, type: "payment", title: "Payment", message: "msg" });
    await createNotification({ userId, type: "system",  title: "System",  message: "msg" });

    const res = await request(app).get(`${BASE}?type=order`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe("order");
  });

  it("filters by type=payment", async () => {
    const { userId, token } = await insertUser();
    await createNotification({ userId, type: "order",   title: "O", message: "m" });
    await createNotification({ userId, type: "payment", title: "P", message: "m" });

    const res = await request(app).get(`${BASE}?type=payment`).set(auth(token));
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe("payment");
  });

  it("returns only notifications for the authenticated user", async () => {
    const u1 = await insertUser();
    const u2 = await insertUser();
    await createNotification({ userId: u1.userId, type: "system", title: "For U1", message: "m" });

    const res = await request(app).get(BASE).set(auth(u2.token));
    expect(res.body).toEqual([]);
  });

  it("returns newest notifications first", async () => {
    const { userId, token } = await insertUser();
    await createNotification({ userId, type: "order",   title: "First",  message: "m" });
    await createNotification({ userId, type: "payment", title: "Second", message: "m" });

    const res = await request(app).get(BASE).set(auth(token));
    expect(res.body[0].title).toBe("Second");
  });
});

// ─── GET /unread-count ────────────────────────────────────────────────────────

describe("GET /api/v1/notifications/unread-count", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/unread-count`);
    expect(res.status).toBe(401);
  });

  it("returns 0 when no notifications", async () => {
    const { token } = await insertUser();
    const res = await request(app).get(`${BASE}/unread-count`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it("returns correct unread count", async () => {
    const { userId, token } = await insertUser();
    await createNotification({ userId, type: "order",   title: "A", message: "m" });
    await createNotification({ userId, type: "payment", title: "B", message: "m" });

    const res = await request(app).get(`${BASE}/unread-count`).set(auth(token));
    expect(res.body.count).toBe(2);
  });

  it("decrements count after marking one as read", async () => {
    const { userId, token } = await insertUser();
    await createNotification({ userId, type: "order",   title: "A", message: "m" });
    await createNotification({ userId, type: "payment", title: "B", message: "m" });

    const listRes = await request(app).get(BASE).set(auth(token));
    const nid = listRes.body[0].notification_id as string;
    await request(app).patch(`${BASE}/${nid}/read`).set(auth(token));

    const countRes = await request(app).get(`${BASE}/unread-count`).set(auth(token));
    expect(countRes.body.count).toBe(1);
  });
});

// ─── PATCH /notifications/:id/read ───────────────────────────────────────────

describe("PATCH /api/v1/notifications/:id/read", () => {
  it("401 without auth", async () => {
    const res = await request(app).patch(`${BASE}/some-id/read`);
    expect(res.status).toBe(401);
  });

  it("marks notification as read", async () => {
    const { userId, token } = await insertUser();
    await createNotification({ userId, type: "system", title: "Test", message: "m" });

    const listRes = await request(app).get(BASE).set(auth(token));
    const nid = listRes.body[0].notification_id as string;

    const res = await request(app).patch(`${BASE}/${nid}/read`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.is_read).toBe(true);
  });

  it("404 for notification belonging to another user", async () => {
    const u1 = await insertUser();
    const u2 = await insertUser();
    await createNotification({ userId: u1.userId, type: "system", title: "U1", message: "m" });

    const listRes = await request(app).get(BASE).set(auth(u1.token));
    const nid = listRes.body[0].notification_id as string;

    const res = await request(app).patch(`${BASE}/${nid}/read`).set(auth(u2.token));
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /notifications/read-all ───────────────────────────────────────────

describe("PATCH /api/v1/notifications/read-all", () => {
  it("401 without auth", async () => {
    const res = await request(app).patch(`${BASE}/read-all`);
    expect(res.status).toBe(401);
  });

  it("marks all unread notifications as read", async () => {
    const { userId, token } = await insertUser();
    await createNotification({ userId, type: "order",   title: "A", message: "m" });
    await createNotification({ userId, type: "payment", title: "B", message: "m" });
    await createNotification({ userId, type: "system",  title: "C", message: "m" });

    const res = await request(app).patch(`${BASE}/read-all`).set(auth(token));
    expect(res.status).toBe(200);

    const countRes = await request(app).get(`${BASE}/unread-count`).set(auth(token));
    expect(countRes.body.count).toBe(0);
  });

  it("succeeds even when no notifications exist", async () => {
    const { token } = await insertUser();
    const res = await request(app).patch(`${BASE}/read-all`).set(auth(token));
    expect(res.status).toBe(200);
  });
});
