import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { listings, orders, farmerRatings } from "../db/schema.js";
import { eq } from "drizzle-orm";

beforeEach(async () => {
  await db.delete(farmerRatings);
  await db.delete(orders);
  await db.delete(listings);
});

const makeAgent = async (role: "farmer" | "buyer", suffix: string) => {
  const ag = request.agent(app);
  const res = await ag.post("/api/auth/signup").send({
    firstName: role,
    lastName: "User",
    email: `${role}${suffix}@usrext.com`,
    password: "Password1",
    confirmPassword: "Password1",
    role,
    acceptTerms: true,
  });
  return { ag, userId: res.body.user.id as string };
};

// ==================== GET /users/me ====================

describe("GET /users/me", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/users/me");
    expect(res.status).toBe(401);
  });

  it("returns current user's profile with wallet", async () => {
    const { ag } = await makeAgent("farmer", "m1");
    const res = await ag.get("/users/me");
    expect(res.status).toBe(200);
    expect(res.body.email).toContain("@usrext.com");
    expect(res.body.role).toBe("farmer");
    expect(res.body.id).toBeDefined();
  });
});

// ==================== GET /users/me/stats ====================

describe("GET /users/me/stats", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/users/me/stats");
    expect(res.status).toBe(401);
  });

  it("returns farmer stats with zero counts when no activity", async () => {
    const { ag } = await makeAgent("farmer", "st1");
    const res = await ag.get("/users/me/stats");
    expect(res.status).toBe(200);
    expect(res.body.listings_count).toBe(0);
    expect(res.body.orders_received).toBe(0);
    expect(res.body.completed_orders).toBe(0);
    expect(res.body.total_revenue).toBe(0);
  });

  it("returns buyer stats with zero counts when no activity", async () => {
    const { ag } = await makeAgent("buyer", "st2");
    const res = await ag.get("/users/me/stats");
    expect(res.status).toBe(200);
    expect(res.body.orders_placed).toBe(0);
    expect(res.body.completed_orders).toBe(0);
  });

  it("counts farmer listings correctly", async () => {
    const { ag } = await makeAgent("farmer", "st3");
    await ag.post("/marketplace/listings").send({
      product_name: "Corn",
      category: "grains",
      quantity: 100,
      unit: "kg",
      price_per_unit: 200,
      location_state: "Kaduna",
    });

    const res = await ag.get("/users/me/stats");
    expect(res.status).toBe(200);
    expect(res.body.listings_count).toBe(1);
  });
});

// ==================== GET /users/:id/ratings ====================

describe("GET /users/:id/ratings", () => {
  it("returns 404 for unknown farmer", async () => {
    const res = await request(app).get("/users/00000000-0000-0000-0000-000000000000/ratings");
    expect(res.status).toBe(404);
  });

  it("returns empty ratings for new farmer", async () => {
    const { userId } = await makeAgent("farmer", "rt1");
    const res = await request(app).get(`/users/${userId}/ratings`);
    expect(res.status).toBe(200);
    expect(res.body.total_reviews).toBe(0);
    expect(res.body.average_rating).toBeNull();
    expect(res.body.ratings).toEqual([]);
  });

  it("includes submitted ratings", async () => {
    const { ag: farmer, userId: farmerId } = await makeAgent("farmer", "rt2f");
    const listRes = await farmer.post("/marketplace/listings").send({
      product_name: "Pepper",
      category: "vegetables",
      quantity: 50,
      unit: "kg",
      price_per_unit: 500,
      location_state: "Lagos",
    });
    const listingId = listRes.body.listing_id as string;

    const { ag: buyer } = await makeAgent("buyer", "rt2b");
    const orderRes = await buyer.post("/orders").send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
    const orderId = orderRes.body.order_id as string;
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    await buyer.post(`/orders/${orderId}/rate`).send({ rating: 5, review: "Excellent!" });

    const res = await request(app).get(`/users/${farmerId}/ratings`);
    expect(res.status).toBe(200);
    expect(res.body.total_reviews).toBe(1);
    expect(res.body.average_rating).toBe(5);
    expect(res.body.ratings[0].review).toBe("Excellent!");
  });
});
