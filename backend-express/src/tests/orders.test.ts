import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { listings, orders, wallets } from "../db/schema.js";

beforeEach(async () => {
  await db.delete(orders);
  await db.delete(listings);
  await db.delete(wallets);
});

const makeAgent = async (role: "farmer" | "buyer", suffix: string) => {
  const ag = request.agent(app);
  await ag.post("/api/auth/signup").send({
    firstName: role,
    lastName: "User",
    email: `${role}${suffix}@orders.com`,
    password: "Password1",
    confirmPassword: "Password1",
    role,
    acceptTerms: true,
  });
  return ag;
};

const listingBody = {
  product_name: "Garri",
  category: "grains",
  quantity: 500,
  unit: "kg",
  price_per_unit: 300,
  location_state: "Oyo",
};

async function setupFarmerAndListing(suffix: string) {
  const farmer = await makeAgent("farmer", suffix);
  const listRes = await farmer.post("/marketplace/listings").send(listingBody);
  return { farmer, listingId: listRes.body.listing_id as string };
}

// ==================== POST /orders ====================

describe("POST /orders", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/orders").send({
      listing_id: "00000000-0000-0000-0000-000000000000",
      quantity: 10,
      delivery_method: "pickup",
    });
    expect(res.status).toBe(401);
  });

  it("buyer creates an order successfully", async () => {
    const { listingId } = await setupFarmerAndListing("o1");
    const buyer = await makeAgent("buyer", "o1");

    const res = await buyer.post("/orders").send({
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
    const buyer = await makeAgent("buyer", "o2");
    const res = await buyer.post("/orders").send({
      listing_id: "00000000-0000-0000-0000-000000000000",
      quantity: 5,
      delivery_method: "pickup",
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when farmer tries to buy own listing", async () => {
    const { farmer, listingId } = await setupFarmerAndListing("o3");
    const res = await farmer.post("/orders").send({
      listing_id: listingId,
      quantity: 5,
      delivery_method: "pickup",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/own listing/i);
  });

  it("rejects invalid delivery_method", async () => {
    const { listingId } = await setupFarmerAndListing("o4");
    const buyer = await makeAgent("buyer", "o4");
    const res = await buyer.post("/orders").send({
      listing_id: listingId,
      quantity: 5,
      delivery_method: "drone",
    });
    expect(res.status).toBe(400);
  });

  it("rejects quantity <= 0", async () => {
    const { listingId } = await setupFarmerAndListing("o5");
    const buyer = await makeAgent("buyer", "o5");
    const res = await buyer.post("/orders").send({
      listing_id: listingId,
      quantity: 0,
      delivery_method: "pickup",
    });
    expect(res.status).toBe(400);
  });
});

// ==================== GET /orders/buyer ====================

describe("GET /orders/buyer", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/orders/buyer");
    expect(res.status).toBe(401);
  });

  it("returns buyer's orders", async () => {
    const { listingId } = await setupFarmerAndListing("b1");
    const buyer = await makeAgent("buyer", "b1");
    await buyer.post("/orders").send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });

    const res = await buyer.get("/orders/buyer");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].order_ref).toMatch(/^#[A-Z]{2}-\d{4}$/);
    expect(res.body[0].escrow_state).toBe("awaiting_payment");
  });

  it("returns empty for buyer with no orders", async () => {
    const buyer = await makeAgent("buyer", "b2");
    const res = await buyer.get("/orders/buyer");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ==================== GET /orders/my ====================

describe("GET /orders/my", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/orders/my");
    expect(res.status).toBe(401);
  });

  it("returns farmer's received orders", async () => {
    const { farmer, listingId } = await setupFarmerAndListing("m1");
    const buyer = await makeAgent("buyer", "m1");
    await buyer.post("/orders").send({ listing_id: listingId, quantity: 20, delivery_method: "delivery", delivery_address: "123 Farm Rd" });

    const res = await farmer.get("/orders/my");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].order_ref).toMatch(/^#[A-Z]{2}-\d{4}$/);
    expect(res.body[0].buyer.name).toBeDefined();
    expect(res.body[0].escrow_state).toBe("awaiting_payment");
  });
});

// ==================== PATCH /orders/:id/confirm-delivery ====================

describe("PATCH /orders/:id/confirm-delivery", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/orders/some-id/confirm-delivery");
    expect(res.status).toBe(401);
  });

  it("buyer confirms delivery — status becomes completed", async () => {
    const { listingId } = await setupFarmerAndListing("c1");
    const buyer = await makeAgent("buyer", "c1");

    const order = await buyer.post("/orders").send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
    const orderId = order.body.order_id as string;

    // Force status to processing so confirm works
    await db.update(orders).set({ status: "processing" }).where(
      (await import("drizzle-orm")).eq(orders.orderId, orderId)
    );

    const res = await buyer.patch(`/orders/${orderId}/confirm-delivery`);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe("completed");
  });

  it("returns 404 when orderId does not belong to buyer", async () => {
    const { listingId } = await setupFarmerAndListing("c2");
    const buyer1 = await makeAgent("buyer", "c2a");
    const buyer2 = await makeAgent("buyer", "c2b");

    const order = await buyer1.post("/orders").send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
    const orderId = order.body.order_id as string;
    await db.update(orders).set({ status: "processing" }).where(
      (await import("drizzle-orm")).eq(orders.orderId, orderId)
    );

    const res = await buyer2.patch(`/orders/${orderId}/confirm-delivery`);
    expect(res.status).toBe(404);
  });

  it("returns 400 when order already completed", async () => {
    const { listingId } = await setupFarmerAndListing("c3");
    const buyer = await makeAgent("buyer", "c3");

    const order = await buyer.post("/orders").send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
    const orderId = order.body.order_id as string;

    await db.update(orders).set({ status: "completed" }).where(
      (await import("drizzle-orm")).eq(orders.orderId, orderId)
    );

    const res = await buyer.patch(`/orders/${orderId}/confirm-delivery`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already completed/i);
  });
});
