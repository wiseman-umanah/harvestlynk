/**
 * orders.test.ts — /api/v1/orders routes
 *
 * POST   /orders               — create order
 * GET    /orders/buyer         — buyer's order list
 * GET    /orders/my            — farmer's received orders
 * PATCH  /orders/:id/status    — farmer advances order status
 * PATCH  /orders/:id/confirm-delivery — buyer confirms delivery
 * POST   /orders/:id/rate      — buyer rates farmer
 */

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, wallets, listings, orders } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signAccessToken } from "../utils/jwt.js";

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

const BASE = "/api/v1/orders";
const BASE_MARKET = "/api/v1/marketplace";

async function insertUser(role: "farmer" | "buyer", livenessVerified = false) {
  const userId = randomUUID();
  const email = `ord-${userId.slice(0, 8)}@orders.test`;
  await db.insert(users).values({
    id: userId, firstName: role, lastName: "User", email,
    passwordHash: "x", role, emailVerified: true, acceptedTerms: true, livenessVerified,
  });
  await db.insert(wallets).values({ userId, availableBalance: 0, pendingBalance: 0, totalPaidIn: 0, totalPaidOut: 0 });
  const token = await signAccessToken({ userId, email, role });
  return { userId, email, token };
}

function auth(t: string) { return { Authorization: `Bearer ${t}` }; }

const listingBody = {
  product_name: "Garri",
  category: "grains",
  quantity: 500,
  unit: "kg",
  price_per_unit: 30000, // 300 NGN in kobo
  location_state: "Oyo",
};

async function setupFarmerAndListing() {
  const farmer = await insertUser("farmer", true);
  const listRes = await request(app).post(`${BASE_MARKET}/listings`).set(auth(farmer.token)).send(listingBody);
  return { ...farmer, listingId: listRes.body.listing_id as string };
}

// ─── POST /orders ─────────────────────────────────────────────────────────────

describe("POST /api/v1/orders", () => {
  it("401 without auth", async () => {
    const res = await request(app).post(BASE).send({ listing_id: randomUUID(), quantity: 1, delivery_method: "pickup" });
    expect(res.status).toBe(401);
  });

  it("buyer creates order successfully", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");

    const res = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 10, delivery_method: "pickup",
    });

    expect(res.status).toBe(201);
    expect(res.body.order_id).toBeDefined();
    expect(res.body.order_ref).toMatch(/^#[A-Z]{2}-\d{4}$/);
    expect(res.body.status).toBe("pending_payment");
    expect(res.body.escrow_state).toBe("awaiting_payment");
    expect(res.body.total_amount).toBe(10 * 30000);
    expect(res.body.listing.product_name).toBe("Garri");
    expect(res.body.farmer.name).toBeDefined();
  });

  it("404 for non-existent listing", async () => {
    const buyer = await insertUser("buyer");
    const res = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: "00000000-0000-0000-0000-000000000000", quantity: 1, delivery_method: "pickup",
    });
    expect(res.status).toBe(404);
  });

  it("400 when farmer tries to buy own listing", async () => {
    const { token: farmerToken, listingId } = await setupFarmerAndListing();
    const res = await request(app).post(BASE).set(auth(farmerToken)).send({
      listing_id: listingId, quantity: 1, delivery_method: "pickup",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own listing/i);
  });

  it("400 for invalid delivery_method", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const res = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 1, delivery_method: "helicopter",
    });
    expect(res.status).toBe(400);
  });

  it("400 for quantity <= 0", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const res = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 0, delivery_method: "pickup",
    });
    expect(res.status).toBe(400);
  });
});

// ─── GET /orders/buyer ────────────────────────────────────────────────────────

describe("GET /api/v1/orders/buyer", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/buyer`);
    expect(res.status).toBe(401);
  });

  it("returns buyer's order list", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    await request(app).post(BASE).set(auth(buyer.token)).send({ listing_id: listingId, quantity: 2, delivery_method: "pickup" });

    const res = await request(app).get(`${BASE}/buyer`).set(auth(buyer.token));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].order_ref).toMatch(/^#[A-Z]{2}-\d{4}$/);
  });

  it("returns empty array when buyer has no orders", async () => {
    const buyer = await insertUser("buyer");
    const res = await request(app).get(`${BASE}/buyer`).set(auth(buyer.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("does not include other buyer's orders", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer1 = await insertUser("buyer");
    const buyer2 = await insertUser("buyer");
    await request(app).post(BASE).set(auth(buyer1.token)).send({ listing_id: listingId, quantity: 2, delivery_method: "pickup" });

    const res = await request(app).get(`${BASE}/buyer`).set(auth(buyer2.token));
    expect(res.body).toEqual([]);
  });
});

// ─── GET /orders/my ───────────────────────────────────────────────────────────

describe("GET /api/v1/orders/my", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/my`);
    expect(res.status).toBe(401);
  });

  it("returns farmer's received orders", async () => {
    const { token: farmerToken, listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    await request(app).post(BASE).set(auth(buyer.token)).send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });

    const res = await request(app).get(`${BASE}/my`).set(auth(farmerToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].buyer.name).toBeDefined();
    expect(res.body[0].escrow_state).toBe("awaiting_payment");
  });

  it("returns empty for farmer with no received orders", async () => {
    const { token: farmerToken } = await setupFarmerAndListing();
    const res = await request(app).get(`${BASE}/my`).set(auth(farmerToken));
    expect(res.body).toEqual([]);
  });
});

// ─── PATCH /orders/:id/status ─────────────────────────────────────────────────

describe("PATCH /api/v1/orders/:id/status", () => {
  it("farmer cannot advance unpaid order to processing", async () => {
    const { token: farmerToken, listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const orderRes = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 2, delivery_method: "pickup",
    });
    const orderId = orderRes.body.order_id as string;

    const res = await request(app).patch(`${BASE}/${orderId}/status`).set(auth(farmerToken)).send({ status: "processing" });
    expect(res.status).toBe(400);
  });

  it("farmer can advance payment_confirmed to processing", async () => {
    const { token: farmerToken, listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const orderRes = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 2, delivery_method: "pickup",
    });
    const orderId = orderRes.body.order_id as string;
    await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE}/${orderId}/status`).set(auth(farmerToken)).send({ status: "processing" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("processing");
  });

  it("farmer can advance processing to ready_for_pickup", async () => {
    const { token: farmerToken, listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const orderRes = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 2, delivery_method: "pickup",
    });
    const orderId = orderRes.body.order_id as string;
    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE}/${orderId}/status`).set(auth(farmerToken)).send({ status: "ready_for_pickup" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready_for_pickup");
  });
});

// ─── PATCH /orders/:id/confirm-delivery ──────────────────────────────────────

describe("PATCH /api/v1/orders/:id/confirm-delivery", () => {
  it("401 without auth", async () => {
    const res = await request(app).patch(`${BASE}/some-id/confirm-delivery`);
    expect(res.status).toBe(401);
  });

  it("buyer confirms delivery → status becomes completed", async () => {
    const { token: farmerToken, userId: farmerId, listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const orderRes = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 2, delivery_method: "pickup",
    });
    const orderId = orderRes.body.order_id as string;
    const amountKobo = 2 * 30000;

    // Seed escrow state (farmer has pending balance)
    await db.update(wallets).set({ pendingBalance: amountKobo }).where(eq(wallets.userId, farmerId));
    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE}/${orderId}/confirm-delivery`).set(auth(buyer.token));
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("completed");
    // Farmer's pending balance should have been converted to available
    const [fw] = await db.select().from(wallets).where(eq(wallets.userId, farmerId)).limit(1);
    expect(Number(fw!.availableBalance)).toBe(amountKobo);
    expect(Number(fw!.pendingBalance)).toBe(0);
  });

  it("404 when order belongs to different buyer", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer1 = await insertUser("buyer");
    const buyer2 = await insertUser("buyer");

    const orderRes = await request(app).post(BASE).set(auth(buyer1.token)).send({
      listing_id: listingId, quantity: 2, delivery_method: "pickup",
    });
    const orderId = orderRes.body.order_id as string;
    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE}/${orderId}/confirm-delivery`).set(auth(buyer2.token));
    expect(res.status).toBe(404);
  });

  it("400 when order is already completed", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const orderRes = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 2, delivery_method: "pickup",
    });
    const orderId = orderRes.body.order_id as string;
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await request(app).patch(`${BASE}/${orderId}/confirm-delivery`).set(auth(buyer.token));
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already completed/i);
  });
});

// ─── POST /orders/:id/rate ────────────────────────────────────────────────────

describe("POST /api/v1/orders/:id/rate", () => {
  it("buyer can rate a completed order", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const orderRes = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 2, delivery_method: "pickup",
    });
    const orderId = orderRes.body.order_id as string;
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await request(app)
      .post(`${BASE}/${orderId}/rate`)
      .set(auth(buyer.token))
      .send({ rating: 5, review: "Excellent produce!" });

    expect(res.status).toBe(201);
    expect(res.body.rating).toBe(5);
    expect(res.body.review).toBe("Excellent produce!");
  });

  it("400 when order is not completed", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const orderRes = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 2, delivery_method: "pickup",
    });
    const orderId = orderRes.body.order_id as string;

    const res = await request(app)
      .post(`${BASE}/${orderId}/rate`)
      .set(auth(buyer.token))
      .send({ rating: 4, review: "Too early" });

    expect(res.status).toBe(400);
  });

  it("400 for rating out of range", async () => {
    const { listingId } = await setupFarmerAndListing();
    const buyer = await insertUser("buyer");
    const orderRes = await request(app).post(BASE).set(auth(buyer.token)).send({
      listing_id: listingId, quantity: 2, delivery_method: "pickup",
    });
    const orderId = orderRes.body.order_id as string;
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await request(app)
      .post(`${BASE}/${orderId}/rate`)
      .set(auth(buyer.token))
      .send({ rating: 6 });

    expect(res.status).toBe(400);
  });
});
