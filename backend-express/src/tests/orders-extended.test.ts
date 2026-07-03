import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, listings, orders, farmerRatings } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken } from "../utils/jwt.js";

const BASE_AUTH = "/api/v1/auth";
const BASE_MARKET = "/api/v1/marketplace";
const BASE_ORDERS = "/api/v1/orders";

beforeEach(async () => {
  await db.delete(farmerRatings);
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

async function createFarmer(email: string) {
  const { accessToken, userId } = await createVerifiedUser("farmer", email);
  await db.update(users).set({ livenessVerified: true }).where(eq(users.id, userId));
  return { accessToken, userId };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const listingBody = {
  product_name: "Cassava",
  category: "tubers",
  quantity: 200,
  unit: "kg",
  price_per_unit: 150,
  location_state: "Enugu",
};

async function setup() {
  const { accessToken: farmerToken, userId: farmerId } = await createFarmer("farmer@ordext.com");
  const listRes = await request(app)
    .post(`${BASE_MARKET}/listings`)
    .set(auth(farmerToken))
    .send(listingBody);
  const listingId = listRes.body.listing_id as string;

  const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@ordext.com");
  const orderRes = await request(app)
    .post(`${BASE_ORDERS}`)
    .set(auth(buyerToken))
    .send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
  const orderId = orderRes.body.order_id as string;

  return { farmerToken, buyerToken, farmerId, listingId, orderId };
}

// ==================== PATCH /api/v1/orders/:id/status ====================

describe("PATCH /api/v1/orders/:id/status", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch(`${BASE_ORDERS}/some-id/status`);
    expect(res.status).toBe(401);
  });

  it("farmer advances status from payment_confirmed to processing", async () => {
    const { farmerToken, orderId } = await setup();
    await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/status`).set(auth(farmerToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("processing");
    expect(res.body.escrow_state).toBe("secured_in_escrow");
  });

  it("farmer advances from processing to ready_for_pickup", async () => {
    const { farmerToken, orderId } = await setup();
    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/status`).set(auth(farmerToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready_for_pickup");
  });

  it("returns 400 when status cannot be advanced (pending_payment)", async () => {
    const { farmerToken, orderId } = await setup();

    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/status`).set(auth(farmerToken));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot advance/i);
  });

  it("returns 404 when order belongs to another farmer", async () => {
    const { orderId } = await setup();
    const { accessToken: otherFarmerToken } = await createVerifiedUser("farmer", "farmer2@ordext.com");
    await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/status`).set(auth(otherFarmerToken));
    expect(res.status).toBe(404);
  });
});

// ==================== PATCH /api/v1/orders/:id/cancel ====================

describe("PATCH /api/v1/orders/:id/cancel", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch(`${BASE_ORDERS}/some-id/cancel`);
    expect(res.status).toBe(401);
  });

  it("buyer cancels own pending order", async () => {
    const { buyerToken, orderId } = await setup();
    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/cancel`).set(auth(buyerToken)).send({ reason: "Changed my mind" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("farmer cancels an order", async () => {
    const { farmerToken, orderId } = await setup();
    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/cancel`).set(auth(farmerToken)).send({ reason: "Out of stock" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("returns 404 when order does not belong to user", async () => {
    const { orderId } = await setup();
    const { accessToken: strangerToken } = await createVerifiedUser("buyer", "buyer2@ordext.com");
    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/cancel`).set(auth(strangerToken));
    expect(res.status).toBe(404);
  });

  it("returns 400 when order is already completed", async () => {
    const { buyerToken, orderId } = await setup();
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));
    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/cancel`).set(auth(buyerToken));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be cancelled/i);
  });
});

// ==================== POST /api/v1/orders/:id/rate ====================

describe("POST /api/v1/orders/:id/rate", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post(`${BASE_ORDERS}/some-id/rate`).send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it("buyer rates a completed order", async () => {
    const { buyerToken, orderId } = await setup();
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await request(app).post(`${BASE_ORDERS}/${orderId}/rate`).set(auth(buyerToken)).send({
      rating: 4,
      review: "Good quality produce",
      quality_rating: 5,
      communication_rating: 4,
    });
    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(4);
    expect(res.body.review).toBe("Good quality produce");
    expect(res.body.rating_id).toBeDefined();
  });

  it("returns 400 for non-completed order", async () => {
    const { buyerToken, orderId } = await setup();
    const res = await request(app).post(`${BASE_ORDERS}/${orderId}/rate`).set(auth(buyerToken)).send({ rating: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/completed orders/i);
  });

  it("returns 409 when order is already rated", async () => {
    const { buyerToken, orderId } = await setup();
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    await request(app).post(`${BASE_ORDERS}/${orderId}/rate`).set(auth(buyerToken)).send({ rating: 3 });
    const res = await request(app).post(`${BASE_ORDERS}/${orderId}/rate`).set(auth(buyerToken)).send({ rating: 5 });
    expect(res.status).toBe(409);
  });

  it("returns 400 for rating out of range", async () => {
    const { buyerToken, orderId } = await setup();
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await request(app).post(`${BASE_ORDERS}/${orderId}/rate`).set(auth(buyerToken)).send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it("returns 404 when order does not belong to buyer", async () => {
    const { orderId } = await setup();
    const { accessToken: otherBuyerToken } = await createVerifiedUser("buyer", "buyer2@ordext.com");
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await request(app).post(`${BASE_ORDERS}/${orderId}/rate`).set(auth(otherBuyerToken)).send({ rating: 5 });
    expect(res.status).toBe(404);
  });
});
