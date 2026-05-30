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
    firstName: role === "farmer" ? "Farm" : "Buy",
    lastName: "Er",
    email: `${role}${suffix}@mkt.com`,
    password: "Password1",
    confirmPassword: "Password1",
    role,
    acceptTerms: true,
  });
  return ag;
};

const validListing = {
  product_name: "Fresh Tomatoes",
  category: "vegetables",
  quantity: 100,
  unit: "kg",
  price_per_unit: 500,
  location_state: "Kano",
};

// ==================== GET /marketplace/listings ====================

describe("GET /marketplace/listings", () => {
  it("returns empty array when no listings", async () => {
    const res = await request(app).get("/marketplace/listings");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns only active listings", async () => {
    const farmer = await agentAs("farmer");
    await farmer.post("/marketplace/listings").send(validListing);
    await farmer.post("/marketplace/listings").send({ ...validListing, product_name: "Paused Yam", status: "paused" });

    const res = await request(app).get("/marketplace/listings");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].product_name).toBe("Fresh Tomatoes");
  });

  it("filters by category", async () => {
    const farmer = await agentAs("farmer", "2");
    await farmer.post("/marketplace/listings").send(validListing);
    await farmer.post("/marketplace/listings").send({ ...validListing, category: "grains", product_name: "Rice" });

    const res = await request(app).get("/marketplace/listings?category=grains");
    expect(res.status).toBe(200);
    expect(res.body.data.every((l: { category: string }) => l.category === "grains")).toBe(true);
  });

  it("filters by search term in product_name", async () => {
    const farmer = await agentAs("farmer", "3");
    await farmer.post("/marketplace/listings").send(validListing);
    await farmer.post("/marketplace/listings").send({ ...validListing, product_name: "Dried Pepper" });

    const res = await request(app).get("/marketplace/listings?search=tomato");
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].product_name).toBe("Fresh Tomatoes");
  });

  it("includes farmer info in response", async () => {
    const farmer = await agentAs("farmer", "4");
    await farmer.post("/marketplace/listings").send(validListing);

    const res = await request(app).get("/marketplace/listings");
    expect(res.body.data[0].farmer).toBeDefined();
    expect(res.body.data[0].farmer.name).toBeDefined();
  });
});

// ==================== POST /marketplace/listings ====================

describe("POST /marketplace/listings", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/marketplace/listings").send(validListing);
    expect(res.status).toBe(401);
  });

  it("returns 403 for buyer", async () => {
    const buyer = await agentAs("buyer");
    const res = await buyer.post("/marketplace/listings").send(validListing);
    expect(res.status).toBe(403);
  });

  it("creates listing as farmer", async () => {
    const farmer = await agentAs("farmer", "5");
    const res = await farmer.post("/marketplace/listings").send(validListing);
    expect(res.status).toBe(201);
    expect(res.body.listing_id).toBeDefined();
    expect(res.body.product_name).toBe("Fresh Tomatoes");
    expect(res.body.status).toBe("active");
    expect(res.body.total_price).toBe(100 * 500);
  });

  it("rejects missing product_name", async () => {
    const farmer = await agentAs("farmer", "6");
    const { product_name: _, ...body } = validListing;
    const res = await farmer.post("/marketplace/listings").send(body);
    expect(res.status).toBe(400);
    expect(res.body.details.product_name).toBeDefined();
  });

  it("rejects quantity = 0", async () => {
    const farmer = await agentAs("farmer", "7");
    const res = await farmer.post("/marketplace/listings").send({ ...validListing, quantity: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects negative price_per_unit", async () => {
    const farmer = await agentAs("farmer", "8");
    const res = await farmer.post("/marketplace/listings").send({ ...validListing, price_per_unit: -100 });
    expect(res.status).toBe(400);
  });
});

// ==================== GET /marketplace/listings/my ====================

describe("GET /marketplace/listings/my", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/marketplace/listings/my");
    expect(res.status).toBe(401);
  });

  it("returns only the logged-in farmer's listings", async () => {
    const farmer1 = await agentAs("farmer", "f1");
    const farmer2 = await agentAs("farmer", "f2");

    await farmer1.post("/marketplace/listings").send(validListing);
    await farmer2.post("/marketplace/listings").send({ ...validListing, product_name: "Other Farmer Goods" });

    const res = await farmer1.get("/marketplace/listings/my");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].product_name).toBe("Fresh Tomatoes");
  });

  it("returns empty array when farmer has no listings", async () => {
    const farmer = await agentAs("farmer", "f3");
    const res = await farmer.get("/marketplace/listings/my");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ==================== DELETE /marketplace/listings/:id ====================

describe("DELETE /marketplace/listings/:id", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).delete("/marketplace/listings/some-id");
    expect(res.status).toBe(401);
  });

  it("deletes own listing (204)", async () => {
    const farmer = await agentAs("farmer", "d1");
    const create = await farmer.post("/marketplace/listings").send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await farmer.delete(`/marketplace/listings/${listingId}`);
    expect(res.status).toBe(204);

    const check = await farmer.get("/marketplace/listings/my");
    expect(check.body).toEqual([]);
  });

  it("returns 403 when trying to delete another farmer's listing", async () => {
    const farmer1 = await agentAs("farmer", "d2");
    const farmer2 = await agentAs("farmer", "d3");

    const create = await farmer1.post("/marketplace/listings").send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await farmer2.delete(`/marketplace/listings/${listingId}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent listing", async () => {
    const farmer = await agentAs("farmer", "d4");
    const res = await farmer.delete("/marketplace/listings/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});
