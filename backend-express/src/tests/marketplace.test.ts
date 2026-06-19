import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, listings } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken } from "../utils/jwt.js";

const BASE_AUTH = "/api/v1/auth";
const BASE_MARKET = "/api/v1/marketplace";

beforeEach(async () => {
  await db.delete(listings);
});

async function createVerifiedUser(role: "farmer" | "buyer", email: string) {
  await request(app).post(`${BASE_AUTH}/signup`).send({
    firstName: role === "farmer" ? "Farm" : "Buy",
    lastName: "Er",
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

const validListing = {
  product_name: "Fresh Tomatoes",
  category: "vegetables",
  quantity: 100,
  unit: "kg",
  price_per_unit: 500,
  location_state: "Kano",
};

// ==================== GET /api/v1/marketplace/listings ====================

describe("GET /api/v1/marketplace/listings", () => {
  it("returns empty array when no listings", async () => {
    const res = await request(app).get(`${BASE_MARKET}/listings`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns only active listings", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send({ ...validListing, product_name: "Paused Yam", status: "paused" });

    const res = await request(app).get(`${BASE_MARKET}/listings`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].product_name).toBe("Fresh Tomatoes");
  });

  it("filters by category", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send({ ...validListing, category: "grains", product_name: "Rice" });

    const res = await request(app).get(`${BASE_MARKET}/listings?category=grains`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((l: { category: string }) => l.category === "grains")).toBe(true);
  });

  it("filters by search term in product_name", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send({ ...validListing, product_name: "Dried Pepper" });

    const res = await request(app).get(`${BASE_MARKET}/listings?search=tomato`);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].product_name).toBe("Fresh Tomatoes");
  });

  it("includes farmer info in response", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);

    const res = await request(app).get(`${BASE_MARKET}/listings`);
    expect(res.body.data[0].farmer).toBeDefined();
    expect(res.body.data[0].farmer.name).toBeDefined();
  });
});

// ==================== POST /api/v1/marketplace/listings ====================

describe("POST /api/v1/marketplace/listings", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post(`${BASE_MARKET}/listings`).send(validListing);
    expect(res.status).toBe(401);
  });

  it("returns 403 for buyer", async () => {
    const { accessToken } = await createVerifiedUser("buyer", "buyer@mkt.com");
    const res = await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);
    expect(res.status).toBe(403);
  });

  it("creates listing as farmer", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    const res = await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);
    expect(res.status).toBe(201);
    expect(res.body.listing_id).toBeDefined();
    expect(res.body.product_name).toBe("Fresh Tomatoes");
    expect(res.body.status).toBe("active");
    expect(res.body.total_price).toBe(100 * 500);
  });

  it("rejects missing product_name", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    const { product_name: _, ...body } = validListing;
    const res = await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(body);
    expect(res.status).toBe(400);
    expect(res.body.details.product_name).toBeDefined();
  });

  it("rejects quantity = 0", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    const res = await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send({ ...validListing, quantity: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects negative price_per_unit", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    const res = await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send({ ...validListing, price_per_unit: -100 });
    expect(res.status).toBe(400);
  });
});

// ==================== GET /api/v1/marketplace/listings/my ====================

describe("GET /api/v1/marketplace/listings/my", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_MARKET}/listings/my`);
    expect(res.status).toBe(401);
  });

  it("returns only the logged-in farmer's listings", async () => {
    const { accessToken: token1 } = await createFarmer("farmer1@mkt.com");
    const { accessToken: token2 } = await createFarmer("farmer2@mkt.com");

    await request(app).post(`${BASE_MARKET}/listings`).set(auth(token1)).send(validListing);
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(token2)).send({ ...validListing, product_name: "Other Farmer Goods" });

    const res = await request(app).get(`${BASE_MARKET}/listings/my`).set(auth(token1));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].product_name).toBe("Fresh Tomatoes");
  });

  it("returns empty array when farmer has no listings", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    const res = await request(app).get(`${BASE_MARKET}/listings/my`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ==================== DELETE /api/v1/marketplace/listings/:id ====================

describe("DELETE /api/v1/marketplace/listings/:id", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).delete(`${BASE_MARKET}/listings/some-id`);
    expect(res.status).toBe(401);
  });

  it("deletes own listing (204)", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    const create = await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await request(app).delete(`${BASE_MARKET}/listings/${listingId}`).set(auth(accessToken));
    expect(res.status).toBe(204);

    const check = await request(app).get(`${BASE_MARKET}/listings/my`).set(auth(accessToken));
    expect(check.body).toEqual([]);
  });

  it("returns 403 when trying to delete another farmer's listing", async () => {
    const { accessToken: token1 } = await createFarmer("farmer1@mkt.com");
    const { accessToken: token2 } = await createFarmer("farmer2@mkt.com");

    const create = await request(app).post(`${BASE_MARKET}/listings`).set(auth(token1)).send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await request(app).delete(`${BASE_MARKET}/listings/${listingId}`).set(auth(token2));
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent listing", async () => {
    const { accessToken } = await createFarmer("farmer@mkt.com");
    const res = await request(app).delete(`${BASE_MARKET}/listings/00000000-0000-0000-0000-000000000000`).set(auth(accessToken));
    expect(res.status).toBe(404);
  });
});
