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

const validListing = {
  product_name: "Yam",
  category: "tubers",
  quantity: 50,
  unit: "kg",
  price_per_unit: 400,
  location_state: "Benue",
};

// ==================== GET /api/v1/marketplace/listings/:id ====================

describe("GET /api/v1/marketplace/listings/:id", () => {
  it("returns 404 for non-existent listing", async () => {
    const res = await request(app).get(`${BASE_MARKET}/listings/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });

  it("returns listing with farmer info", async () => {
    const { accessToken } = await createFarmer("farmer@mktx.com");
    const create = await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await request(app).get(`${BASE_MARKET}/listings/${listingId}`);
    expect(res.status).toBe(200);
    expect(res.body.listing_id).toBe(listingId);
    expect(res.body.product_name).toBe("Yam");
    expect(res.body.farmer).toBeDefined();
    expect(res.body.farmer.name).toBeDefined();
  });
});

// ==================== PATCH /api/v1/marketplace/listings/:id ====================

describe("PATCH /api/v1/marketplace/listings/:id", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch(`${BASE_MARKET}/listings/some-id`).send({ product_name: "X" });
    expect(res.status).toBe(401);
  });

  it("farmer updates own listing", async () => {
    const { accessToken } = await createFarmer("farmer@mktx.com");
    const create = await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await request(app)
      .patch(`${BASE_MARKET}/listings/${listingId}`)
      .set(auth(accessToken))
      .send({ product_name: "Updated Yam", price_per_unit: 500 });
    expect(res.status).toBe(200);
    expect(res.body.product_name).toBe("Updated Yam");
    expect(res.body.price_per_unit).toBe(500);
    expect(res.body.total_price).toBe(50 * 500);
  });

  it("returns 403 when updating another farmer's listing", async () => {
    const { accessToken: token1 } = await createFarmer("farmer1@mktx.com");
    const { accessToken: token2 } = await createFarmer("farmer2@mktx.com");

    const create = await request(app).post(`${BASE_MARKET}/listings`).set(auth(token1)).send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await request(app).patch(`${BASE_MARKET}/listings/${listingId}`).set(auth(token2)).send({ product_name: "Corn" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent listing", async () => {
    const { accessToken } = await createFarmer("farmer@mktx.com");
    const res = await request(app)
      .patch(`${BASE_MARKET}/listings/00000000-0000-0000-0000-000000000000`)
      .set(auth(accessToken))
      .send({ product_name: "Corn" });
    expect(res.status).toBe(404);
  });

  it("can pause a listing", async () => {
    const { accessToken } = await createFarmer("farmer@mktx.com");
    const create = await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);
    const listingId = create.body.listing_id as string;

    const res = await request(app).patch(`${BASE_MARKET}/listings/${listingId}`).set(auth(accessToken)).send({ status: "paused" });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paused");
  });
});

// ==================== GET /api/v1/marketplace/listings (pagination) ====================

describe("GET /api/v1/marketplace/listings pagination", () => {
  it("returns paginated response with data, page, limit", async () => {
    const { accessToken } = await createFarmer("farmer@mktx.com");
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(accessToken)).send(validListing);

    const res = await request(app).get(`${BASE_MARKET}/listings?page=1&limit=10`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });

  it("returns empty data on page beyond results", async () => {
    const res = await request(app).get(`${BASE_MARKET}/listings?page=999&limit=10`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});
