/**
 * users.test.ts — /api/v1/users routes
 *
 * GET  /users/:id          — public profile lookup
 * PATCH /users/            — update own profile (auth required)
 * GET  /users/me           — current user profile (auth required)
 * GET  /users/me/stats     — dashboard stats (auth required)
 * GET  /users/:id/ratings  — farmer ratings (public)
 * POST /orders/:id/rate    — rate a farmer after completed order
 */

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, wallets, listings, orders, farmerRatings } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signAccessToken } from "../utils/jwt.js";

// ─── Supabase mock ────────────────────────────────────────────────────────────

vi.mock("../utils/supabase.js", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser: async (token: string) => {
        try {
          const [, b64] = token.split(".");
          const payload = JSON.parse(Buffer.from(b64, "base64url").toString()) as { email?: string; userId?: string };
          if (payload.email)
            return { data: { user: { id: `sb-${payload.userId ?? "x"}`, email: payload.email, email_confirmed_at: new Date().toISOString() } }, error: null };
        } catch { /* */ }
        return { data: { user: null }, error: { message: "invalid" } };
      },
    },
  }),
  getAuthRedirectUrl: (p: string) => `http://localhost:3000${p}`,
  getSupabaseUserNameParts: () => ({ firstName: "T", lastName: "U" }),
  isSupabaseEmailVerified: () => true,
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE = "/api/v1/users";
const BASE_MARKET = "/api/v1/marketplace";
const BASE_ORDERS = "/api/v1/orders";

async function insertUser(role: "farmer" | "buyer" = "farmer", opts?: { livenessVerified?: boolean }) {
  const userId = randomUUID();
  const email = `user-${userId.slice(0, 8)}@users.test`;
  await db.insert(users).values({
    id: userId,
    firstName: "Test",
    lastName: "User",
    email,
    passwordHash: "x",
    role,
    emailVerified: true,
    acceptedTerms: true,
    livenessVerified: opts?.livenessVerified ?? false,
  });
  await db.insert(wallets).values({ userId, availableBalance: 0, pendingBalance: 0, totalPaidIn: 0, totalPaidOut: 0 });
  const token = await signAccessToken({ userId, email, role });
  return { userId, email, token };
}

function auth(token: string) { return { Authorization: `Bearer ${token}` }; }

const listingBody = {
  product_name: "Cassava",
  category: "tubers",
  quantity: 200,
  unit: "kg",
  price_per_unit: 15000,
  location_state: "Ogun",
};

// ─── GET /users/:id ───────────────────────────────────────────────────────────

describe("GET /api/v1/users/:id", () => {
  it("returns 404 for unknown id", async () => {
    const res = await request(app).get(`${BASE}/00000000-0000-0000-0000-000000000000`);
    expect(res.status).toBe(404);
  });

  it("returns public profile without passwordHash", async () => {
    const { userId } = await insertUser();
    const res = await request(app).get(`${BASE}/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("includes wallet when present", async () => {
    const { userId } = await insertUser();
    const res = await request(app).get(`${BASE}/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.wallet).not.toBeNull();
    expect(res.body.wallet.available_balance).toBe("0");
  });

  it("wallet is null when user has no wallet", async () => {
    // Insert without wallet
    const userId = randomUUID();
    const email = `nowallet-${userId.slice(0, 8)}@users.test`;
    await db.insert(users).values({ id: userId, firstName: "No", lastName: "Wallet", email, passwordHash: "x", role: "buyer", emailVerified: true });
    const res = await request(app).get(`${BASE}/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body.wallet).toBeNull();
  });
});

// ─── PATCH /users/ ────────────────────────────────────────────────────────────

describe("PATCH /api/v1/users/", () => {
  it("401 without auth", async () => {
    const res = await request(app).patch(`${BASE}/`).send({ fullName: "Nobody" });
    expect(res.status).toBe(401);
  });

  it("updates fullName and returns updated profile", async () => {
    const { token } = await insertUser();
    const res = await request(app).patch(`${BASE}/`).set(auth(token)).send({ fullName: "Adaeze Obi" });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Adaeze Obi");
  });

  it("updates bio and location fields", async () => {
    const { token } = await insertUser();
    const res = await request(app)
      .patch(`${BASE}/`)
      .set(auth(token))
      .send({ bio: "I grow yams", locationState: "Anambra", locationLga: "Awka" });
    expect(res.status).toBe(200);
    expect(res.body.bio).toBe("I grow yams");
    expect(res.body.location_state).toBe("Anambra");
    expect(res.body.location_lga).toBe("Awka");
  });

  it("updates farmer-specific farmName", async () => {
    const { token } = await insertUser("farmer");
    const res = await request(app).patch(`${BASE}/`).set(auth(token)).send({ farmName: "Green Acres" });
    expect(res.status).toBe(200);
    expect(res.body.farmName).toBe("Green Acres");
  });

  it("rejects bio longer than 500 chars", async () => {
    const { token } = await insertUser();
    const res = await request(app).patch(`${BASE}/`).set(auth(token)).send({ bio: "x".repeat(501) });
    expect(res.status).toBe(400);
  });

  it("partial update — only sent fields change", async () => {
    const { token } = await insertUser();
    await request(app).patch(`${BASE}/`).set(auth(token)).send({ locationState: "Lagos" });
    const res = await request(app).patch(`${BASE}/`).set(auth(token)).send({ locationLga: "Ikeja" });
    expect(res.status).toBe(200);
    expect(res.body.location_lga).toBe("Ikeja");
    expect(res.body.location_state).toBe("Lagos");
  });

  it("updates bank details", async () => {
    const { token } = await insertUser();
    const res = await request(app)
      .patch(`${BASE}/`)
      .set(auth(token))
      .send({ bankName: "GTBank", bankAccountNumber: "0123456789", bankAccountName: "Test User" });
    expect(res.status).toBe(200);
    expect(res.body.bank_name).toBe("GTBank");
    expect(res.body.bank_account_number).toBe("0123456789");
  });
});

// ─── GET /users/me ────────────────────────────────────────────────────────────

describe("GET /api/v1/users/me", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/me`);
    expect(res.status).toBe(401);
  });

  it("returns authenticated user's full profile", async () => {
    const { token, userId, email } = await insertUser("buyer");
    const res = await request(app).get(`${BASE}/me`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe(email);
    expect(res.body.role).toBe("buyer");
    expect(res.body.passwordHash).toBeUndefined();
  });
});

// ─── GET /users/me/stats ──────────────────────────────────────────────────────

describe("GET /api/v1/users/me/stats", () => {
  it("401 without auth", async () => {
    const res = await request(app).get(`${BASE}/me/stats`);
    expect(res.status).toBe(401);
  });

  it("farmer stats return zero counts when no activity", async () => {
    const { token } = await insertUser("farmer");
    const res = await request(app).get(`${BASE}/me/stats`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.listings_count).toBe(0);
    expect(res.body.orders_received).toBe(0);
    expect(res.body.completed_orders).toBe(0);
    expect(res.body.total_revenue).toBe(0);
  });

  it("buyer stats return zero counts when no activity", async () => {
    const { token } = await insertUser("buyer");
    const res = await request(app).get(`${BASE}/me/stats`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.orders_placed).toBe(0);
    expect(res.body.completed_orders).toBe(0);
  });

  it("listings_count increments after creating a listing", async () => {
    const { token } = await insertUser("farmer", { livenessVerified: true });
    await request(app).post(`${BASE_MARKET}/listings`).set(auth(token)).send(listingBody);
    const res = await request(app).get(`${BASE}/me/stats`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.listings_count).toBe(1);
  });
});

// ─── GET /users/:id/ratings ───────────────────────────────────────────────────

describe("GET /api/v1/users/:id/ratings", () => {
  it("404 for unknown user", async () => {
    const res = await request(app).get(`${BASE}/00000000-0000-0000-0000-000000000000/ratings`);
    expect(res.status).toBe(404);
  });

  it("returns empty ratings for new farmer", async () => {
    const { userId } = await insertUser("farmer");
    const res = await request(app).get(`${BASE}/${userId}/ratings`);
    expect(res.status).toBe(200);
    expect(res.body.total_reviews).toBe(0);
    expect(res.body.average_rating).toBeNull();
    expect(res.body.ratings).toEqual([]);
  });

  it("includes rating after buyer rates a completed order", async () => {
    const { token: farmerToken, userId: farmerId } = await insertUser("farmer", { livenessVerified: true });
    const { token: buyerToken, userId: buyerId } = await insertUser("buyer");

    const listRes = await request(app).post(`${BASE_MARKET}/listings`).set(auth(farmerToken)).send(listingBody);
    const listingId = listRes.body.listing_id as string;

    const orderRes = await request(app)
      .post(BASE_ORDERS)
      .set(auth(buyerToken))
      .send({ listing_id: listingId, quantity: 5, delivery_method: "pickup" });
    const orderId = orderRes.body.order_id as string;

    await db.update(orders).set({ status: "completed" }).where(eq(orders.orderId, orderId));

    await request(app)
      .post(`${BASE_ORDERS}/${orderId}/rate`)
      .set(auth(buyerToken))
      .send({ rating: 4, review: "Good quality" });

    const res = await request(app).get(`${BASE}/${farmerId}/ratings`);
    expect(res.status).toBe(200);
    expect(res.body.total_reviews).toBe(1);
    expect(res.body.average_rating).toBe(4);
    expect(res.body.ratings[0].review).toBe("Good quality");
  });
});
