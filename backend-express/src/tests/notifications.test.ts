import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { notifications, listings, orders } from "../db/schema.js";
import { createNotification } from "../utils/notifications.js";

beforeEach(async () => {
  await db.delete(notifications);
  await db.delete(orders);
  await db.delete(listings);
});

const makeAgent = async (role: "farmer" | "buyer", suffix: string) => {
  const ag = request.agent(app);
  const res = await ag.post("/api/auth/signup").send({
    firstName: role,
    lastName: "User",
    email: `${role}${suffix}@notif.com`,
    password: "Password1",
    confirmPassword: "Password1",
    role,
    acceptTerms: true,
  });
  return { ag, userId: res.body.user.id as string };
};

// ==================== GET /notifications ====================

describe("GET /notifications", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/notifications");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no notifications", async () => {
    const { ag } = await makeAgent("farmer", "n1");
    const res = await ag.get("/notifications");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns user notifications with correct shape", async () => {
    const { ag, userId } = await makeAgent("farmer", "n2");
    await createNotification({ userId, type: "order", title: "New Order", message: "You got an order" });

    const res = await ag.get("/notifications");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].notification_id).toBeDefined();
    expect(res.body[0].title).toBe("New Order");
    expect(res.body[0].type).toBe("order");
    expect(res.body[0].is_read).toBe(false);
    expect(res.body[0].created_at).toBeDefined();
  });

  it("filters by type=order", async () => {
    const { ag, userId } = await makeAgent("farmer", "n3");
    await createNotification({ userId, type: "order", title: "Order", message: "msg" });
    await createNotification({ userId, type: "payment", title: "Payment", message: "msg" });
    await createNotification({ userId, type: "system", title: "System", message: "msg" });

    const res = await ag.get("/notifications?type=order");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe("order");
  });

  it("filters by type=payment", async () => {
    const { ag, userId } = await makeAgent("farmer", "n4");
    await createNotification({ userId, type: "order", title: "Order", message: "msg" });
    await createNotification({ userId, type: "payment", title: "Payment", message: "msg" });

    const res = await ag.get("/notifications?type=payment");
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe("payment");
  });

  it("ignores unknown type filter (returns all)", async () => {
    const { ag, userId } = await makeAgent("farmer", "n5");
    await createNotification({ userId, type: "order", title: "O", message: "m" });
    await createNotification({ userId, type: "system", title: "S", message: "m" });

    const res = await ag.get("/notifications?type=unknown");
    expect(res.body.length).toBe(2);
  });

  it("only returns notifications for the authenticated user", async () => {
    const { ag: ag1, userId: uid1 } = await makeAgent("farmer", "n6a");
    const { userId: uid2 } = await makeAgent("buyer", "n6b");
    await createNotification({ userId: uid1, type: "system", title: "For user1", message: "m" });
    await createNotification({ userId: uid2, type: "system", title: "For user2", message: "m" });

    const res = await ag1.get("/notifications");
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe("For user1");
  });
});

// ==================== PATCH /notifications/:id/read ====================

describe("PATCH /notifications/:id/read", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/notifications/some-id/read");
    expect(res.status).toBe(401);
  });

  it("marks a notification as read", async () => {
    const { ag, userId } = await makeAgent("farmer", "r1");
    await createNotification({ userId, type: "order", title: "Test", message: "msg" });

    const listRes = await ag.get("/notifications");
    const notifId = listRes.body[0].notification_id as string;

    const res = await ag.patch(`/notifications/${notifId}/read`);
    expect(res.status).toBe(200);
    expect(res.body.is_read).toBe(true);

    const check = await ag.get("/notifications");
    expect(check.body[0].is_read).toBe(true);
  });

  it("returns 404 for notification belonging to another user", async () => {
    const { userId: uid1 } = await makeAgent("farmer", "r2a");
    const { ag: ag2 } = await makeAgent("buyer", "r2b");

    await createNotification({ userId: uid1, type: "order", title: "Not yours", message: "m" });
    const [notif] = await db.select().from(notifications);

    const res = await ag2.patch(`/notifications/${notif!.notificationId}/read`);
    expect(res.status).toBe(404);
  });
});

// ==================== PATCH /notifications/read-all ====================

describe("PATCH /notifications/read-all", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/notifications/read-all");
    expect(res.status).toBe(401);
  });

  it("marks all notifications as read", async () => {
    const { ag, userId } = await makeAgent("farmer", "ra1");
    await createNotification({ userId, type: "order", title: "A", message: "m" });
    await createNotification({ userId, type: "payment", title: "B", message: "m" });
    await createNotification({ userId, type: "system", title: "C", message: "m" });

    const res = await ag.patch("/notifications/read-all");
    expect(res.status).toBe(200);

    const check = await ag.get("/notifications");
    expect(check.body.every((n: { is_read: boolean }) => n.is_read === true)).toBe(true);
  });

  it("only marks current user's notifications, not others", async () => {
    const { ag: ag1, userId: uid1 } = await makeAgent("farmer", "ra2a");
    const { userId: uid2 } = await makeAgent("buyer", "ra2b");

    await createNotification({ userId: uid1, type: "order", title: "For user1", message: "m" });
    await createNotification({ userId: uid2, type: "order", title: "For user2", message: "m" });

    await ag1.patch("/notifications/read-all");

    const all = await db.select().from(notifications);
    const user2Notif = all.find((n) => n.userId === uid2);
    expect(user2Notif?.isRead).toBe(false);
  });
});
