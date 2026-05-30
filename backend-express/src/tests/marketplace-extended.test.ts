import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { listings } from "../db/schema.js";

beforeEach(async () => {
  await db.delete(listings);
});

const agentAs = async (role: "farmer" | "buyer", suffix = "") => {
  const ag = request.agent(app);
  await ag.post("/api/auth/signup").send({
    firstName: role,
    lastName: "User",
    email: `${role}${suffix}@mktx.com`,
    password: "Password1",
    confirmPassword: "Password1",
    role,
    acceptTerms: true,
  });
  return ag;
};

const validListing = {
  product_name: "Yam",
  category: "tubers",
  quantity: 50,
  unit: "kg",
  price_per_unit: 400,
  location_state: "Benue",
};

// ==================== GET /marketplace/listings/:id ====================

describe("GET /marketplace/listings/:id", () => {
  it("returns 404 for non-existent listing", async () => {
    const res = await request(app).get("/marketplace/listings/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("returns listing with farmer info", async () => {
    const farmer = await agentAs("farmer", "g1");
    const create = await farmer.post("/marketplace/listings").send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await request(app).get(`/marketplace/listings/${listingId}`);
    expect(res.status).toBe(200);
    expect(res.body.listing_id).toBe(listingId);
    expect(res.body.product_name).toBe("Yam");
    expect(res.body.farmer).toBeDefined();
    expect(res.body.farmer.name).toBeDefined();
  });
});

// ==================== PATCH /marketplace/listings/:id ====================

describe("PATCH /marketplace/listings/:id", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/marketplace/listings/some-id").send({ product_name: "X" });
    expect(res.status).toBe(401);
  });

  it("farmer updates own listing", async () => {
    const farmer = await agentAs("farmer", "u1");
    const create = await farmer.post("/marketplace/listings").send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await farmer.patch(`/marketplace/listings/${listingId}`).send({
      product_name: "Updated Yam",
      price_per_unit: 500,
    });
    expect(res.status).toBe(200);
    expect(res.body.product_name).toBe("Updated Yam");
    expect(res.body.price_per_unit).toBe(500);
    expect(res.body.total_price).toBe(50 * 500);
  });

  it("returns 403 when updating another farmer's listing", async () => {
    const farmer1 = await agentAs("farmer", "u2a");
    const farmer2 = await agentAs("farmer", "u2b");

    const create = await farmer1.post("/marketplace/listings").send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await farmer2.patch(`/marketplace/listings/${listingId}`).send({ product_name: "Corn" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent listing", async () => {
    const farmer = await agentAs("farmer", "u3");
    const res = await farmer.patch("/marketplace/listings/00000000-0000-0000-0000-000000000000").send({ product_name: "Corn" });
    expect(res.status).toBe(404);
  });

  it("can pause a listing", async () => {
    const farmer = await agentAs("farmer", "u4");
    const create = await farmer.post("/marketplace/listings").send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await farmer.patch(`/marketplace/listings/${listingId}`).send({ status: "paused" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paused");
  });
});

// ==================== GET /marketplace/listings (pagination) ====================

describe("GET /marketplace/listings pagination", () => {
  it("returns paginated response with data, page, limit", async () => {
    const farmer = await agentAs("farmer", "p1");
    await farmer.post("/marketplace/listings").send(validListing);

    const res = await request(app).get("/marketplace/listings?page=1&limit=10");
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it("returns empty data on page beyond results", async () => {
    const res = await request(app).get("/marketplace/listings?page=999&limit=10");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
