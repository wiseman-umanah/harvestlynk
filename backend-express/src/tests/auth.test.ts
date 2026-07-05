/**
 * auth.test.ts
 *
 * Tests for /api/v1/auth routes that don't require live Supabase:
 *   - POST /signup      → local user created (Supabase signUp mocked)
 *   - GET  /verify-email → marks emailVerified, returns tokens (Supabase getUser mocked)
 *   - POST /change-password (uses authenticate which calls getUser mock)
 *   - GET  /health
 *
 * Routes that require real Supabase sessions (login, refresh, logout) are
 * excluded — they would only work in a live integration environment.
 */

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken, signAccessToken } from "../utils/jwt.js";

// ─── Supabase mock ────────────────────────────────────────────────────────────
// Intercepts every call to getSupabaseAdmin() across the whole app.
// For getUser we decode our locally signed JWT; for signUp we return a fake user.

vi.mock("../utils/supabase.js", () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser: async (token: string) => {
        try {
          const [, b64] = token.split(".");
          if (!b64) throw new Error("bad token");
          const payload = JSON.parse(
            Buffer.from(b64, "base64url").toString("utf8"),
          ) as { email?: string; userId?: string };
          if (payload.email) {
            return {
              data: {
                user: {
                  id: `sb-${payload.userId ?? "test"}`,
                  email: payload.email,
                  email_confirmed_at: new Date().toISOString(),
                },
              },
              error: null,
            };
          }
        } catch { /* fallthrough */ }
        return { data: { user: null }, error: { message: "invalid" } };
      },
      signUp: async (_opts: unknown) => {
        const id = randomUUID();
        const email = (_opts as { email: string }).email;
        return { data: { user: { id, email } }, error: null };
      },
      signInWithPassword: async () => ({
        data: { session: null, user: null },
        error: { message: "not mocked", status: 401 },
      }),
    },
  }),
  getAuthRedirectUrl: (path: string) => `http://localhost:3000${path}`,
  getSupabaseUserNameParts: () => ({ firstName: "Test", lastName: "User" }),
  isSupabaseEmailVerified: (u: { email_confirmed_at?: string | null }) =>
    !!u?.email_confirmed_at,
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE = "/api/v1/auth";

function makeUserPayload(role: "farmer" | "buyer" = "farmer") {
  const uid = randomUUID().slice(0, 8);
  return {
    firstName: "Test",
    lastName: "User",
    email: `test-${uid}@auth.test`,
    password: "Password1",
    confirmPassword: "Password1",
    role,
  };
}

/** Signs up and triggers verify-email via local JWT (no real email sent). */
async function signupAndVerify(role: "farmer" | "buyer" = "farmer") {
  const payload = makeUserPayload(role);
  const signupRes = await request(app).post(`${BASE}/signup`).send(payload);
  if (signupRes.status !== 201) throw new Error(`signup failed: ${JSON.stringify(signupRes.body)}`);

  const [user] = await db.select().from(users).where(eq(users.email, payload.email)).limit(1);
  if (!user) throw new Error("user not found after signup");

  const verifyToken = await signEmailVerificationToken(user.id, user.email);
  const verifyRes = await request(app).get(`${BASE}/verify-email?token=${verifyToken}`);
  return { verifyRes, user, payload };
}

/** Directly seeds a user and returns a local JWT (bypasses signup + Supabase). */
async function seedUserWithToken(role: "farmer" | "buyer" = "farmer") {
  const userId = randomUUID();
  const email = `seed-${userId.slice(0, 8)}@auth.test`;
  await db.insert(users).values({
    id: userId,
    firstName: "Seed",
    lastName: "User",
    email,
    passwordHash: "x",
    role,
    emailVerified: true,
    acceptedTerms: true,
  });
  const token = await signAccessToken({ userId, email, role });
  return { userId, email, token };
}

// ─── GET /health ──────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ─── POST /signup ─────────────────────────────────────────────────────────────

describe("POST /api/v1/auth/signup", () => {
  it("201 and returns message for valid farmer signup", async () => {
    const res = await request(app).post(`${BASE}/signup`).send(makeUserPayload("farmer"));
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/check your email/i);
    expect(res.body.accessToken).toBeUndefined();
  });

  it("201 for buyer signup", async () => {
    const res = await request(app).post(`${BASE}/signup`).send(makeUserPayload("buyer"));
    expect(res.status).toBe(201);
  });

  it("409 when email already exists", async () => {
    const payload = makeUserPayload();
    await request(app).post(`${BASE}/signup`).send(payload);
    const res = await request(app).post(`${BASE}/signup`).send(payload);
    expect(res.status).toBe(409);
  });

  it("400 when required fields missing", async () => {
    const res = await request(app).post(`${BASE}/signup`).send({ email: "bad@test.com" });
    expect(res.status).toBe(400);
  });

  it("400 when passwords don't match", async () => {
    const payload = { ...makeUserPayload(), confirmPassword: "WrongPass1" };
    const res = await request(app).post(`${BASE}/signup`).send(payload);
    expect(res.status).toBe(400);
  });

  it("400 when role is invalid", async () => {
    const res = await request(app).post(`${BASE}/signup`).send({ ...makeUserPayload(), role: "admin" });
    expect(res.status).toBe(400);
  });
});

// ─── GET /verify-email ────────────────────────────────────────────────────────

describe("GET /api/v1/auth/verify-email", () => {
  it("400 when no token provided", async () => {
    const res = await request(app).get(`${BASE}/verify-email`);
    expect(res.status).toBe(400);
  });

  it("returns accessToken + user after valid email verification", async () => {
    const { verifyRes } = await signupAndVerify();
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.accessToken).toBeDefined();
    expect(verifyRes.body.user.email).toBeDefined();
    expect(verifyRes.body.user.role).toBeDefined();
  });

  it("user is marked emailVerified after verification", async () => {
    const { user } = await signupAndVerify();
    const [updated] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(updated?.emailVerified).toBe(true);
  });
});

// ─── POST /change-password ────────────────────────────────────────────────────

describe("POST /api/v1/auth/change-password", () => {
  it("401 without auth", async () => {
    const res = await request(app)
      .patch(`${BASE}/change-password`)
      .send({ currentPassword: "old", newPassword: "New123!!" });
    expect(res.status).toBe(401);
  });

  it("400 when newPassword too short", async () => {
    const { token } = await seedUserWithToken();
    const res = await request(app)
      .patch(`${BASE}/change-password`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "whatever", newPassword: "short" });
    expect(res.status).toBe(400);
  });
});
