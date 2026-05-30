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
    email: `${role}${suffix}@ordext.com`,
    password: "Password1",
    confirmPassword: "Password1",
    role,
    acceptTerms: true,
  });
  return { ag, userId: res.body.user.id as string };
};

const listingBody = {
  product_name: "Cassava",
  category: "tubers",
  quantity: 200,
  unit: "kg",
  price_per_unit: 150,
  location_state: "Enugu",
};

async function setup(suffix: string) {
  const { ag: farmer, userId: farmerId } = await makeAgent("farmer", suffix + "f");
  const listRes = await farmer.post("/marketplace/listings").send(listingBody);
  const listingId = listRes.body.listing_id as string;
  const { ag: buyer } = await makeAgent("buyer", suffix + "b");
  const orderRes = await buyer.post("/orders").send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
  const orderId = orderRes.body.order_id as string;
  return { farmer, buyer, farmerId, listingId, orderId };
}

// ==================== PATCH /orders/:id/status ====================

describe("PATCH /orders/:id/status", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/orders/some-id/status");
    expect(res.status).toBe(401);
  });

  it("farmer advances status from payment_confirmed to processing", async () => {
    const { farmer, orderId } = await setup("s1");
    await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, orderId));

    const res = await farmer.patch(`/orders/${orderId}/status`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("processing");
    expect(res.body.escrow_state).toBe("secured_in_escrow");
  });

  it("farmer advances from processing to ready_for_pickup", async () => {
    const { farmer, orderId } = await setup("s2");
    await db.update(orders).set({ status: "processing" }).where(eq(orders.orderId, orderId));

    const res = await farmer.patch(`/orders/${orderId}/status`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ready_for_pickup");
  });

  it("returns 400 when status cannot be advanced (pending_payment)", async () => {
    const { farmer, orderId } = await setup("s3");
    // Status is pending_payment by default
    const res = await farmer.patch(`/orders/${orderId}/status`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot advance/i);
  });

  it("returns 404 when order belongs to another farmer", async () => {
    const { orderId } = await setup("s4");
    const { ag: otherFarmer } = await makeAgent("farmer", "s4other");
    await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, orderId));

    const res = await otherFarmer.patch(`/orders/${orderId}/status`);
    expect(res.status).toBe(404);
  });
});

// ==================== PATCH /orders/:id/cancel ====================

describe("PATCH /orders/:id/cancel", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/orders/some-id/cancel");
    expect(res.status).toBe(401);
  });

  it("buyer cancels own pending order", async () => {
    const { buyer, orderId } = await setup("c1");
    const res = await buyer.patch(`/orders/${orderId}/cancel`).send({ reason: "Changed my mind" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("farmer cancels an order", async () => {
    const { farmer, orderId } = await setup("c2");
    const res = await farmer.patch(`/orders/${orderId}/cancel`).send({ reason: "Out of stock" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("cancelled");
  });

  it("returns 404 when order does not belong to user", async () => {
    const { orderId } = await setup("c3");
    const { ag: stranger } = await makeAgent("buyer", "c3other");
    const res = await stranger.patch(`/orders/${orderId}/cancel`);
    expect(res.status).toBe(404);
  });

  it("returns 400 when order is already completed", async () => {
    const { buyer, orderId } = await setup("c4");
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));
    const res = await buyer.patch(`/orders/${orderId}/cancel`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot be cancelled/i);
  });
});

// ==================== POST /orders/:id/rate ====================

describe("POST /orders/:id/rate", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/orders/some-id/rate").send({ rating: 5 });
    expect(res.status).toBe(401);
  });

  it("buyer rates a completed order", async () => {
    const { buyer, orderId } = await setup("r1");
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await buyer.post(`/orders/${orderId}/rate`).send({
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
    const { buyer, orderId } = await setup("r2");
    // Status is pending_payment
    const res = await buyer.post(`/orders/${orderId}/rate`).send({ rating: 5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/completed orders/i);
  });

  it("returns 409 when order is already rated", async () => {
    const { buyer, orderId } = await setup("r3");
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    await buyer.post(`/orders/${orderId}/rate`).send({ rating: 3 });
    const res = await buyer.post(`/orders/${orderId}/rate`).send({ rating: 5 });
    expect(res.status).toBe(409);
  });

  it("returns 400 for rating out of range", async () => {
    const { buyer, orderId } = await setup("r4");
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await buyer.post(`/orders/${orderId}/rate`).send({ rating: 6 });
    expect(res.status).toBe(400);
  });

  it("returns 404 when order does not belong to buyer", async () => {
    const { orderId } = await setup("r5");
    const { ag: otherBuyer } = await makeAgent("buyer", "r5other");
    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    const res = await otherBuyer.post(`/orders/${orderId}/rate`).send({ rating: 5 });
    expect(res.status).toBe(404);
  });
});
