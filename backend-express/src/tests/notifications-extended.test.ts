import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, notifications } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken } from "../utils/jwt.js";
import { createNotification } from "../utils/notifications.js";

const BASE_AUTH = "/api/v1/auth";
const BASE_NOTIF = "/api/v1/notifications";

beforeEach(async () => {
  await db.delete(notifications);
});

async function createVerifiedUser(role: "farmer" | "buyer", email: string) {
  const uniqueEmail = `${email}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await request(app).post(`${BASE_AUTH}/signup`).send({
    firstName: "Notif",
    lastName: "User",
    email: uniqueEmail,
    password: "Password1",
    confirmPassword: "Password1",
    role,
  });
  const [user] = await db.select().from(users).where(eq(users.email, uniqueEmail.toLowerCase())).limit(1);
  const token = await signEmailVerificationToken(user!.id, user!.email);
  const res = await request(app).get(`${BASE_AUTH}/verify-email?token=${token}`);
  return { accessToken: res.body.accessToken as string, userId: user!.id };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ==================== GET /api/v1/notifications/unread-count ====================

describe("GET /api/v1/notifications/unread-count", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_NOTIF}/unread-count`);
    expect(res.status).toBe(401);
  });

  it("returns 0 when no notifications", async () => {
    const { accessToken } = await createVerifiedUser("farmer", "notif@nftext.com");
    const res = await request(app).get(`${BASE_NOTIF}/unread-count`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it("returns correct unread count", async () => {
    const { accessToken, userId } = await createVerifiedUser("farmer", "notif@nftext.com");
    await createNotification({ userId, type: "order", title: "A", message: "m" });
    await createNotification({ userId, type: "payment", title: "B", message: "m" });
    await createNotification({ userId, type: "system", title: "C", message: "m" });

    const res = await request(app).get(`${BASE_NOTIF}/unread-count`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  it("decrements after read-all", async () => {
    const { accessToken, userId } = await createVerifiedUser("farmer", "notif@nftext.com");
    await createNotification({ userId, type: "order", title: "A", message: "m" });
    await createNotification({ userId, type: "payment", title: "B", message: "m" });

    await request(app).patch(`${BASE_NOTIF}/read-all`).set(auth(accessToken));

    const res = await request(app).get(`${BASE_NOTIF}/unread-count`).set(auth(accessToken));
    expect(res.body.count).toBe(0);
  });

  it("only counts for authenticated user", async () => {
    const { accessToken: token1, userId: uid1 } = await createVerifiedUser("farmer", "notif1@nftext.com");
    const { userId: uid2 } = await createVerifiedUser("buyer", "notif2@nftext.com");

    await createNotification({ userId: uid1, type: "order", title: "For 1", message: "m" });
    await createNotification({ userId: uid2, type: "order", title: "For 2", message: "m" });
    await createNotification({ userId: uid2, type: "order", title: "For 2 again", message: "m" });

    const res = await request(app).get(`${BASE_NOTIF}/unread-count`).set(auth(token1));
    expect(res.body.count).toBe(1);
  });
});
