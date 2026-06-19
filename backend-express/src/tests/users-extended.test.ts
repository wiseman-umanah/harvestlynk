import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, listings, orders, farmerRatings } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken } from "../utils/jwt.js";

const BASE_AUTH = "/api/v1/auth";
const BASE_USERS = "/api/v1/users";
const BASE_MARKET = "/api/v1/marketplace";
const BASE_ORDERS = "/api/v1/orders";

beforeEach(async () => {
  await db.delete(farmerRatings);
  await db.delete(orders);
  await db.delete(listings);
});

async function createVerifiedUser(role: "farmer" | "buyer", email: string) {
  await request(app).post(`${BASE_AUTH}/signup`).send({
    firstName: role,
    lastName: "User",
    email,
    password: "Password1",
    confirmPassword: "Password1",
    role,
  });
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const token = await signEmailVerificationToken(user!.id, user!.email);
  const res = await request(app).get(`${BASE_AUTH}/verify-email?token=${token}`);
  return { accessToken: res.body.accessToken as string, userId: user!.id };
}

async function setLivenessVerified(userId: string) {
  await db.update(users).set({ livenessVerified: true }).where(eq(users.id, userId));
}

// ==================== GET /api/v1/users/me ====================

describe("GET /api/v1/users/me", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_USERS}/me`);
    expect(res.status).toBe(401);
  });

  it("returns current user's profile with wallet", async () => {
    const { accessToken } = await createVerifiedUser("farmer", "me1@usrext.com");
    const res = await request(app)
      .get(`${BASE_USERS}/me`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toContain("@usrext.com");
    expect(res.body.role).toBe("farmer");
    expect(res.body.id).toBeDefined();
  });
});

// ==================== GET /api/v1/users/me/stats ====================

describe("GET /api/v1/users/me/stats", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_USERS}/me/stats`);
    expect(res.status).toBe(401);
  });

  it("returns farmer stats with zero counts when no activity", async () => {
    const { accessToken } = await createVerifiedUser("farmer", "st1@usrext.com");
    const res = await request(app)
      .get(`${BASE_USERS}/me/stats`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.listings_count).toBe(0);
    expect(res.body.orders_received).toBe(0);
    expect(res.body.completed_orders).toBe(0);
    expect(res.body.total_revenue).toBe(0);
  });

  it("returns buyer stats with zero counts when no activity", async () => {
    const { accessToken } = await createVerifiedUser("buyer", "st2@usrext.com");
    const res = await request(app)
      .get(`${BASE_USERS}/me/stats`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.orders_placed).toBe(0);
    expect(res.body.completed_orders).toBe(0);
  });

  it("counts farmer listings correctly", async () => {
    const { accessToken, userId } = await createVerifiedUser("farmer", "st3@usrext.com");
    await setLivenessVerified(userId);
    await request(app)
      .post(`${BASE_MARKET}/listings`)
      .set("Authorization", `Bearer ${accessToken}`)
      .send({
        product_name: "Corn",
        category: "grains",
        quantity: 100,
        unit: "kg",
        price_per_unit: 200,
        location_state: "Kaduna",
      });

    const res = await request(app)
      .get(`${BASE_USERS}/me/stats`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.listings_count).toBe(1);
  });
});

// ==================== GET /api/v1/users/:id/ratings ====================

describe("GET /api/v1/users/:id/ratings", () => {
  it("returns 404 for unknown farmer", async () => {
    const res = await request(app).get(`${BASE_USERS}/00000000-0000-0000-0000-000000000000/ratings`);
    expect(res.status).toBe(404);
  });

  it("returns empty ratings for new farmer", async () => {
    const { userId } = await createVerifiedUser("farmer", "rt1@usrext.com");
    const res = await request(app).get(`${BASE_USERS}/${userId}/ratings`);
    expect(res.status).toBe(200);
    expect(res.body.total_reviews).toBe(0);
    expect(res.body.average_rating).toBeNull();
    expect(res.body.ratings).toEqual([]);
  });

  it("includes submitted ratings", async () => {
    const { accessToken: farmerToken, userId: farmerId } = await createVerifiedUser("farmer", "rt2f@usrext.com");
    await setLivenessVerified(farmerId);

    const listRes = await request(app)
      .post(`${BASE_MARKET}/listings`)
      .set("Authorization", `Bearer ${farmerToken}`)
      .send({
        product_name: "Pepper",
        category: "vegetables",
        quantity: 50,
        unit: "kg",
        price_per_unit: 500,
        location_state: "Lagos",
      });
    const listingId = listRes.body.listing_id as string;

    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "rt2b@usrext.com");
    const orderRes = await request(app)
      .post(`${BASE_ORDERS}`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
    const orderId = orderRes.body.order_id as string;

    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    await request(app)
      .post(`${BASE_ORDERS}/${orderId}/rate`)
      .set("Authorization", `Bearer ${buyerToken}`)
      .send({ rating: 5, review: "Excellent!" });

    const res = await request(app).get(`${BASE_USERS}/${farmerId}/ratings`);
    expect(res.status).toBe(200);
    expect(res.body.total_reviews).toBe(1);
    expect(res.body.average_rating).toBe(5);
    expect(res.body.ratings[0].review).toBe("Excellent!");
  });
});
