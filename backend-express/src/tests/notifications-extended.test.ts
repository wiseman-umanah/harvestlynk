import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { createNotification } from "../utils/notifications.js";

beforeEach(async () => {
  await db.delete(notifications);
});

const makeAgent = async (suffix: string) => {
  const ag = request.agent(app);
  const res = await ag.post("/api/auth/signup").send({
    firstName: "Notif",
    lastName: "User",
    email: `notif${suffix}@nftext.com`,
    password: "Password1",
    confirmPassword: "Password1",
    role: "farmer",
    acceptTerms: true,
  });
  return { ag, userId: res.body.user.id as string };
};

// ==================== GET /notifications/unread-count ====================

describe("GET /notifications/unread-count", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/notifications/unread-count");
    expect(res.status).toBe(401);
  });

  it("returns 0 when no notifications", async () => {
    const { ag } = await makeAgent("u1");
    const res = await ag.get("/notifications/unread-count");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
  });

  it("returns correct unread count", async () => {
    const { ag, userId } = await makeAgent("u2");
    await createNotification({ userId, type: "order", title: "A", message: "m" });
    await createNotification({ userId, type: "payment", title: "B", message: "m" });
    await createNotification({ userId, type: "system", title: "C", message: "m" });

    const res = await ag.get("/notifications/unread-count");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  it("decrements after read-all", async () => {
    const { ag, userId } = await makeAgent("u3");
    await createNotification({ userId, type: "order", title: "A", message: "m" });
    await createNotification({ userId, type: "payment", title: "B", message: "m" });

    await ag.patch("/notifications/read-all");

    const res = await ag.get("/notifications/unread-count");
    expect(res.body.count).toBe(0);
  });

  it("only counts for authenticated user", async () => {
    const { ag: ag1, userId: uid1 } = await makeAgent("u4a");
    const { userId: uid2 } = await makeAgent("u4b");

    await createNotification({ userId: uid1, type: "order", title: "For 1", message: "m" });
    await createNotification({ userId: uid2, type: "order", title: "For 2", message: "m" });
    await createNotification({ userId: uid2, type: "order", title: "For 2 again", message: "m" });

    const res = await ag1.get("/notifications/unread-count");
    expect(res.body.count).toBe(1);
  });
});
