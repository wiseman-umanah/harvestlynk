/**
 * marketplace.test.ts — /api/v1/marketplace routes
 *
 * GET    /listings          — public browse, pagination, filters
 * GET    /listings/:id      — single listing
 * GET    /listings/my       — farmer's own listings
 * POST   /listings          — create (farmer + liveness required)
 * PATCH  /listings/:id      — update own listing
 * DELETE /listings/:id      — delete own listing
 */

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, wallets, listings } from "../db/schema.js";
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

const BASE = "/api/v1/marketplace";

async function insertUser(role: "farmer" | "buyer" = "farmer", livenessVerified = false) {
  const userId = randomUUID();
  const email = `mkt-${userId.slice(0, 8)}@market.test`;
  await db.insert(users).values({
    id: userId, firstName: "Farm", lastName: "User", email,
    passwordHash: "x", role, emailVerified: true, acceptedTerms: true,
    livenessVerified,
  });
  await db.insert(wallets).values({ userId, availableBalance: 0, pendingBalance: 0, totalPaidIn: 0, totalPaidOut: 0 });
  const token = await signAccessToken({ userId, email, role });
  return { userId, email, token };
}

function auth(t: string) { return { Authorization: `Bearer ${t}` }; }

const validListing = {
  product_name: "Fresh Tomatoes",
  category: "vegetables",
  quantity: 100,
  unit: "kg",
  price_per_unit: 50000,
  location_state: "Kano",
};

// ─── GET /listings (public) ───────────────────────────────────────────────────

describe("GET /api/v1/marketplace/listings", () => {
  it("returns empty data array when no listings", async () => {
    const res = await request(app).get(`${BASE}/listings`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("returns active listing after creation", async () => {
    const { token } = await insertUser("farmer", true);
    await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    const res = await request(app).get(`${BASE}/listings`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].product_name).toBe("Fresh Tomatoes");
  });

  it("does not return paused listings", async () => {
    const { token } = await insertUser("farmer", true);
    await request(app).post(`${BASE}/listings`).set(auth(token)).send({ ...validListing, status: "paused" });
    const res = await request(app).get(`${BASE}/listings`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it("filters by category", async () => {
    const { token } = await insertUser("farmer", true);
    await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    await request(app).post(`${BASE}/listings`).set(auth(token)).send({ ...validListing, category: "grains", product_name: "Rice" });

    const res = await request(app).get(`${BASE}/listings?category=vegetables`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((l: { category: string }) => l.category === "vegetables")).toBe(true);
  });

  it("filters by search term", async () => {
    const { token } = await insertUser("farmer", true);
    await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    await request(app).post(`${BASE}/listings`).set(auth(token)).send({ ...validListing, product_name: "Yam" });

    const res = await request(app).get(`${BASE}/listings?search=tomato`);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].product_name).toMatch(/tomato/i);
  });

  it("all listings are returned (location_state filter not implemented in API)", async () => {
    const { token } = await insertUser("farmer", true);
    await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing); // Kano
    await request(app).post(`${BASE}/listings`).set(auth(token)).send({ ...validListing, location_state: "Lagos", product_name: "Lagos Yam" });

    // The controller does not filter by location_state — both listings are returned
    const res = await request(app).get(`${BASE}/listings?location_state=Kano`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  it("response includes pagination metadata", async () => {
    const { token } = await insertUser("farmer", true);
    await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    const res = await request(app).get(`${BASE}/listings`);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("limit");
  });
});

// ─── GET /listings/:id ────────────────────────────────────────────────────────

describe("GET /api/v1/marketplace/listings/:id", () => {
  it("returns 404 for unknown listing", async () => {
    const res = await request(app).get(`${BASE}/listings/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });

  it("returns listing with farmer details", async () => {
    const { token } = await insertUser("farmer", true);
    const createRes = await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    const listingId = createRes.body.listing_id as string;

    const res = await request(app).get(`${BASE}/listings/${listingId}`);
    expect(res.status).toBe(200);
    expect(res.body.listing_id).toBe(listingId);
    expect(res.body.farmer).toBeDefined();
    expect(res.body.farmer.name).toBeDefined();
  });

  it("view count is not auto-incremented by GET (reads are non-mutating)", async () => {
    const { token } = await insertUser("farmer", true);
    const createRes = await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    const listingId = createRes.body.listing_id as string;

    await request(app).get(`${BASE}/listings/${listingId}`);
    await request(app).get(`${BASE}/listings/${listingId}`);
    const [row] = await db.select({ views: listings.views }).from(listings).where(eq(listings.listingId, listingId)).limit(1);
    // Controller does not increment views — stays at 0
    expect(row!.views).toBe(0);
  });
});

// ─── GET /listings/my ─────────────────────────────────────────────────────────

describe("GET /api/v1/marketplace/listings/my", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/listings/my`);
    expect(res.status).toBe(401);
  });

  it("returns empty array when farmer has no listings", async () => {
    const { token } = await insertUser("farmer");
    const res = await request(app).get(`${BASE}/listings/my`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns only farmer's own listings", async () => {
    const { token: f1 } = await insertUser("farmer", true);
    const { token: f2 } = await insertUser("farmer", true);
    await request(app).post(`${BASE}/listings`).set(auth(f1)).send(validListing);
    await request(app).post(`${BASE}/listings`).set(auth(f2)).send({ ...validListing, product_name: "Other Farm Product" });

    const res = await request(app).get(`${BASE}/listings/my`).set(auth(f1));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].product_name).toBe("Fresh Tomatoes");
  });

  it("403 when buyer tries to access farmer route", async () => {
    const { token } = await insertUser("buyer");
    const res = await request(app).get(`${BASE}/listings/my`).set(auth(token));
    expect(res.status).toBe(403);
  });
});

// ─── POST /listings ───────────────────────────────────────────────────────────

describe("POST /api/v1/marketplace/listings", () => {
  it("401 without auth", async () => {
    const res = await request(app).post(`${BASE}/listings`).send(validListing);
    expect(res.status).toBe(401);
  });

  it("403 for buyer", async () => {
    const { token } = await insertUser("buyer");
    const res = await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    expect(res.status).toBe(403);
  });

  it("403 for unverified farmer (liveness not done)", async () => {
    const { token } = await insertUser("farmer", false);
    const res = await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    expect(res.status).toBe(403);
  });

  it("201 creates listing for verified farmer", async () => {
    const { token } = await insertUser("farmer", true);
    const res = await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    expect(res.status).toBe(201);
    expect(res.body.listing_id).toBeDefined();
    expect(res.body.product_name).toBe("Fresh Tomatoes");
    expect(res.body.status).toBe("active");
  });

  it("400 when required fields missing", async () => {
    const { token } = await insertUser("farmer", true);
    const res = await request(app).post(`${BASE}/listings`).set(auth(token)).send({ product_name: "Incomplete" });
    expect(res.status).toBe(400);
  });

  it("400 when price_per_unit <= 0", async () => {
    const { token } = await insertUser("farmer", true);
    const res = await request(app).post(`${BASE}/listings`).set(auth(token)).send({ ...validListing, price_per_unit: 0 });
    expect(res.status).toBe(400);
  });

  it("creates listing with paused status when specified", async () => {
    const { token } = await insertUser("farmer", true);
    const res = await request(app).post(`${BASE}/listings`).set(auth(token)).send({ ...validListing, status: "paused" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("paused");
  });
});

// ─── PATCH /listings/:id ──────────────────────────────────────────────────────

describe("PATCH /api/v1/marketplace/listings/:id", () => {
  it("updates product_name and price", async () => {
    const { token } = await insertUser("farmer", true);
    const createRes = await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    const id = createRes.body.listing_id as string;

    const res = await request(app)
      .patch(`${BASE}/listings/${id}`)
      .set(auth(token))
      .send({ product_name: "Updated Tomatoes", price_per_unit: 60000 });

    expect(res.status).toBe(200);
    expect(res.body.product_name).toBe("Updated Tomatoes");
    expect(res.body.price_per_unit).toBe(60000);
  });

  it("403 when trying to update another farmer's listing", async () => {
    const { token: f1 } = await insertUser("farmer", true);
    const { token: f2 } = await insertUser("farmer", true);
    const createRes = await request(app).post(`${BASE}/listings`).set(auth(f1)).send(validListing);
    const id = createRes.body.listing_id as string;

    // Controller returns 403 (not 404) for ownership mismatch
    const res = await request(app).patch(`${BASE}/listings/${id}`).set(auth(f2)).send({ product_name: "Hack" });
    expect(res.status).toBe(403);
  });
});

// ─── DELETE /listings/:id ─────────────────────────────────────────────────────

describe("DELETE /api/v1/marketplace/listings/:id", () => {
  it("deletes own listing (204 no-content)", async () => {
    const { token } = await insertUser("farmer", true);
    const createRes = await request(app).post(`${BASE}/listings`).set(auth(token)).send(validListing);
    const id = createRes.body.listing_id as string;

    // Controller returns 204 (no body) on successful delete
    const res = await request(app).delete(`${BASE}/listings/${id}`).set(auth(token));
    expect(res.status).toBe(204);

    const [row] = await db.select().from(listings).where(eq(listings.listingId, id)).limit(1);
    expect(row).toBeUndefined();
  });

  it("403 when deleting another farmer's listing", async () => {
    const { token: f1 } = await insertUser("farmer", true);
    const { token: f2 } = await insertUser("farmer", true);
    const createRes = await request(app).post(`${BASE}/listings`).set(auth(f1)).send(validListing);
    const id = createRes.body.listing_id as string;

    // Controller returns 403 (not 404) for ownership mismatch
    const res = await request(app).delete(`${BASE}/listings/${id}`).set(auth(f2));
    expect(res.status).toBe(403);
  });
});
