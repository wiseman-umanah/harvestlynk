import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, notifications, listings, orders } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken } from "../utils/jwt.js";
import { createNotification } from "../utils/notifications.js";

const BASE_AUTH = "/api/v1/auth";
const BASE_NOTIF = "/api/v1/notifications";

beforeEach(async () => {
  await db.delete(notifications);
  await db.delete(orders);
  await db.delete(listings);
});

async function createVerifiedUser(role: "farmer" | "buyer", email: string) {
  const uniqueEmail = `${email}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await request(app).post(`${BASE_AUTH}/signup`).send({
    firstName: role,
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

// ==================== GET /api/v1/notifications ====================

describe("GET /api/v1/notifications", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_NOTIF}`);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no notifications", async () => {
    const { accessToken } = await createVerifiedUser("farmer", "farmer@notif.com");
    const res = await request(app).get(`${BASE_NOTIF}`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns user notifications with correct shape", async () => {
    const { accessToken, userId } = await createVerifiedUser("farmer", "farmer@notif.com");
    await createNotification({ userId, type: "order", title: "New Order", message: "You got an order" });

    const res = await request(app).get(`${BASE_NOTIF}`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].notification_id).toBeDefined();
    expect(res.body[0].title).toBe("New Order");
    expect(res.body[0].type).toBe("order");
    expect(res.body[0].is_read).toBe(false);
    expect(res.body[0].created_at).toBeDefined();
  });

  it("filters by type=order", async () => {
    const { accessToken, userId } = await createVerifiedUser("farmer", "farmer@notif.com");
    await createNotification({ userId, type: "order", title: "Order", message: "msg" });
    await createNotification({ userId, type: "payment", title: "Payment", message: "msg" });
    await createNotification({ userId, type: "system", title: "System", message: "msg" });

    const res = await request(app).get(`${BASE_NOTIF}?type=order`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe("order");
  });

  it("filters by type=payment", async () => {
    const { accessToken, userId } = await createVerifiedUser("farmer", "farmer@notif.com");
    await createNotification({ userId, type: "order", title: "Order", message: "msg" });
    await createNotification({ userId, type: "payment", title: "Payment", message: "msg" });

    const res = await request(app).get(`${BASE_NOTIF}?type=payment`).set(auth(accessToken));
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe("payment");
  });

  it("ignores unknown type filter (returns all)", async () => {
    const { accessToken, userId } = await createVerifiedUser("farmer", "farmer@notif.com");
    await createNotification({ userId, type: "order", title: "O", message: "m" });
    await createNotification({ userId, type: "system", title: "S", message: "m" });

    const res = await request(app).get(`${BASE_NOTIF}?type=unknown`).set(auth(accessToken));
    expect(res.body.length).toBe(2);
  });

  it("only returns notifications for the authenticated user", async () => {
    const { accessToken: token1, userId: uid1 } = await createVerifiedUser("farmer", "farmer@notif.com");
    const { userId: uid2 } = await createVerifiedUser("buyer", "buyer@notif.com");
    await createNotification({ userId: uid1, type: "system", title: "For user1", message: "m" });
    await createNotification({ userId: uid2, type: "system", title: "For user2", message: "m" });

    const res = await request(app).get(`${BASE_NOTIF}`).set(auth(token1));
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("For user1");
  });
});

// ==================== PATCH /api/v1/notifications/:id/read ====================

describe("PATCH /api/v1/notifications/:id/read", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch(`${BASE_NOTIF}/some-id/read`);
    expect(res.status).toBe(401);
  });

  it("marks a notification as read", async () => {
    const { accessToken, userId } = await createVerifiedUser("farmer", "farmer@notif.com");
    await createNotification({ userId, type: "order", title: "Test", message: "msg" });

    const listRes = await request(app).get(`${BASE_NOTIF}`).set(auth(accessToken));
    const notifId = listRes.body[0].notification_id as string;

    const res = await request(app).patch(`${BASE_NOTIF}/${notifId}/read`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.is_read).toBe(true);

    const check = await request(app).get(`${BASE_NOTIF}`).set(auth(accessToken));
    expect(check.body[0].is_read).toBe(true);
  });

  it("returns 404 for notification belonging to another user", async () => {
    const { userId: uid1 } = await createVerifiedUser("farmer", "farmer@notif.com");
    const { accessToken: token2 } = await createVerifiedUser("buyer", "buyer@notif.com");

    await createNotification({ userId: uid1, type: "order", title: "Not yours", message: "m" });
    const [notif] = await db.select().from(notifications);

    const res = await request(app).patch(`${BASE_NOTIF}/${notif!.notificationId}/read`).set(auth(token2));
    expect(res.status).toBe(404);
  });
});

// ==================== PATCH /api/v1/notifications/read-all ====================

describe("PATCH /api/v1/notifications/read-all", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch(`${BASE_NOTIF}/read-all`);
    expect(res.status).toBe(401);
  });

  it("marks all notifications as read", async () => {
    const { accessToken, userId } = await createVerifiedUser("farmer", "farmer@notif.com");
    await createNotification({ userId, type: "order", title: "A", message: "m" });
    await createNotification({ userId, type: "payment", title: "B", message: "m" });
    await createNotification({ userId, type: "system", title: "C", message: "m" });

    const res = await request(app).patch(`${BASE_NOTIF}/read-all`).set(auth(accessToken));
    expect(res.status).toBe(200);

    const check = await request(app).get(`${BASE_NOTIF}`).set(auth(accessToken));
    expect(check.body.every((n: { is_read: boolean }) => n.is_read === true)).toBe(true);
  });

  it("only marks current user's notifications, not others", async () => {
    const { accessToken: token1, userId: uid1 } = await createVerifiedUser("farmer", "farmer@notif.com");
    const { userId: uid2 } = await createVerifiedUser("buyer", "buyer@notif.com");

    await createNotification({ userId: uid1, type: "order", title: "For user1", message: "m" });
    await createNotification({ userId: uid2, type: "order", title: "For user2", message: "m" });

    await request(app).patch(`${BASE_NOTIF}/read-all`).set(auth(token1));

    const all = await db.select().from(notifications);
    const user2Notif = all.find((n) => n.userId === uid2);
    expect(user2Notif?.isRead).toBe(false);
  });
});
