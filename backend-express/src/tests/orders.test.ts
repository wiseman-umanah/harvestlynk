import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, listings, orders, wallets } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken } from "../utils/jwt.js";

const BASE_AUTH = "/api/v1/auth";
const BASE_MARKET = "/api/v1/marketplace";
const BASE_ORDERS = "/api/v1/orders";

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(listings);
  await db.delete(wallets);
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

async function createFarmer(email: string) {
  const { accessToken, userId } = await createVerifiedUser("farmer", email);
  await db.update(users).set({ livenessVerified: true }).where(eq(users.id, userId));
  return { accessToken, userId };
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

const listingBody = {
  product_name: "Garri",
  category: "grains",
  quantity: 500,
  unit: "kg",
  price_per_unit: 300,
  location_state: "Oyo",
};

async function setupFarmerAndListing(farmerEmail = "farmer@orders.com") {
  const { accessToken: farmerToken, userId: farmerId } = await createFarmer(farmerEmail);
  const listRes = await request(app)
    .post(`${BASE_MARKET}/listings`)
    .set(auth(farmerToken))
    .send(listingBody);
  return { farmerToken, farmerId, listingId: listRes.body.listing_id as string };
}

// ==================== POST /api/v1/orders ====================

describe("POST /api/v1/orders", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post(`${BASE_ORDERS}`).send({
      listing_id: "00000000-0000-0000-0000-000000000000",
      quantity: 10,
      delivery_method: "pickup",
    });
    expect(res.status).toBe(401);
  });

  it("buyer creates an order successfully", async () => {
    const { listingId } = await setupFarmerAndListing();
    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@orders.com");

    const res = await request(app).post(`${BASE_ORDERS}`).set(auth(buyerToken)).send({
      listing_id: listingId,
      quantity: 10,
      delivery_method: "pickup",
    });

    expect(res.status).toBe(201);
    expect(res.body.order_ref).toMatch(/^#[A-Z]{2}-\d{4}$/);
    expect(res.body.total_amount).toBe(10 * 300);
    expect(res.body.status).toBe("pending_payment");
    expect(res.body.escrow_state).toBe("awaiting_payment");
    expect(res.body.listing.product_name).toBe("Garri");
    expect(res.body.farmer.name).toBeDefined();
  });

  it("returns 404 for non-existent listing", async () => {
    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@orders.com");
    const res = await request(app).post(`${BASE_ORDERS}`).set(auth(buyerToken)).send({
      listing_id: "00000000-0000-0000-0000-000000000000",
      quantity: 5,
      delivery_method: "pickup",
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when farmer tries to buy own listing", async () => {
    const { farmerToken, listingId } = await setupFarmerAndListing();
    const res = await request(app).post(`${BASE_ORDERS}`).set(auth(farmerToken)).send({
      listing_id: listingId,
      quantity: 5,
      delivery_method: "pickup",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own listing/i);
  });

  it("rejects invalid delivery_method", async () => {
    const { listingId } = await setupFarmerAndListing();
    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@orders.com");
    const res = await request(app).post(`${BASE_ORDERS}`).set(auth(buyerToken)).send({
      listing_id: listingId,
      quantity: 5,
      delivery_method: "drone",
    });
    expect(res.status).toBe(400);
  });

  it("rejects quantity <= 0", async () => {
    const { listingId } = await setupFarmerAndListing();
    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@orders.com");
    const res = await request(app).post(`${BASE_ORDERS}`).set(auth(buyerToken)).send({
      listing_id: listingId,
      quantity: 0,
      delivery_method: "pickup",
    });
    expect(res.status).toBe(400);
  });
});

// ==================== GET /api/v1/orders/buyer ====================

describe("GET /api/v1/orders/buyer", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_ORDERS}/buyer`);
    expect(res.status).toBe(401);
  });

  it("returns buyer's orders", async () => {
    const { listingId } = await setupFarmerAndListing();
    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@orders.com");
    await request(app).post(`${BASE_ORDERS}`).set(auth(buyerToken)).send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });

    const res = await request(app).get(`${BASE_ORDERS}/buyer`).set(auth(buyerToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].order_ref).toMatch(/^#[A-Z]{2}-\d{4}$/);
    expect(res.body[0].escrow_state).toBe("awaiting_payment");
  });

  it("returns empty for buyer with no orders", async () => {
    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@orders.com");
    const res = await request(app).get(`${BASE_ORDERS}/buyer`).set(auth(buyerToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ==================== GET /api/v1/orders/my ====================

describe("GET /api/v1/orders/my", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_ORDERS}/my`);
    expect(res.status).toBe(401);
  });

  it("returns farmer's received orders", async () => {
    const { farmerToken, listingId } = await setupFarmerAndListing();
    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@orders.com");
    await request(app).post(`${BASE_ORDERS}`).set(auth(buyerToken)).send({
      listing_id: listingId,
      quantity: 20,
      delivery_method: "delivery",
      delivery_address: "123 Farm Rd",
    });

    const res = await request(app).get(`${BASE_ORDERS}/my`).set(auth(farmerToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].order_ref).toMatch(/^#[A-Z]{2}-\d{4}$/);
    expect(res.body[0].buyer.name).toBeDefined();
    expect(res.body[0].escrow_state).toBe("awaiting_payment");
  });
});

// ==================== PATCH /api/v1/orders/:id/confirm-delivery ====================

describe("PATCH /api/v1/orders/:id/confirm-delivery", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch(`${BASE_ORDERS}/some-id/confirm-delivery`);
    expect(res.status).toBe(401);
  });

  it("buyer confirms delivery — status becomes completed", async () => {
    const { listingId } = await setupFarmerAndListing();
    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@orders.com");

    const order = await request(app).post(`${BASE_ORDERS}`).set(auth(buyerToken)).send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
    const orderId = order.body.order_id as string;

    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/confirm-delivery`).set(auth(buyerToken));
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("completed");
  });

  it("returns 404 when orderId does not belong to buyer", async () => {
    const { listingId } = await setupFarmerAndListing();
    const { accessToken: buyerToken1 } = await createVerifiedUser("buyer", "buyer1@orders.com");
    const { accessToken: buyerToken2 } = await createVerifiedUser("buyer", "buyer2@orders.com");

    const order = await request(app).post(`${BASE_ORDERS}`).set(auth(buyerToken1)).send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
    const orderId = order.body.order_id as string;
    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/confirm-delivery`).set(auth(buyerToken2));
    expect(res.status).toBe(404);
  });

  it("returns 400 when order already completed", async () => {
    const { listingId } = await setupFarmerAndListing();
    const { accessToken: buyerToken } = await createVerifiedUser("buyer", "buyer@orders.com");

    const order = await request(app).post(`${BASE_ORDERS}`).set(auth(buyerToken)).send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
    const orderId = order.body.order_id as string;

    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE_ORDERS}/${orderId}/confirm-delivery`).set(auth(buyerToken));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already completed/i);
  });
});
