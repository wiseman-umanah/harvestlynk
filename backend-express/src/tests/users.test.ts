import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, wallets } from "../db/schema.js";
import { hashPassword } from "../utils/password.js";

// setup.ts wipes users beforeEach — we clean wallets ourselves
beforeEach(async () => {
  await db.delete(wallets);
});

const agent = () => request.agent(app);

async function registerAndLogin(role: "farmer" | "buyer" = "farmer") {
  const ag = agent();
  await ag.post("/api/auth/signup").send({
    firstName: "Test",
    lastName: "User",
    email: "test@test.com",
    password: "Password1",
    confirmPassword: "Password1",
    role,
    acceptTerms: true,
  });
  await ag.post("/api/auth/login").send({ email: "test@test.com", password: "Password1" });
  return ag;
}

// ==================== POST /users/signup (dashboard style) ====================

describe("POST /users/signup", () => {
  it("creates a farmer with fullName split into first/last", async () => {
    const res = await request(app).post("/users/signup").send({
      role: "farmer",
      fullName: "Chukwuemeka Obi",
      email: "emeka@farm.com",
      farmName: "Green Valley",
      location: "Enugu",
      phoneNumber: "08012345678",
      password: "Password1",
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Chukwuemeka Obi");
    expect(res.body.role).toBe("farmer");
    expect(res.body.farmName).toBe("Green Valley");
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("creates a buyer without farmName", async () => {
    const res = await request(app).post("/users/signup").send({
      role: "buyer",
      fullName: "Ada Nwosu",
      email: "ada@buy.com",
      password: "Password1",
    });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("buyer");
  });

  it("returns 409 on duplicate email", async () => {
    const body = { role: "buyer", fullName: "Test User", email: "dup@test.com", password: "Password1" };
    await request(app).post("/users/signup").send(body);
    const res = await request(app).post("/users/signup").send(body);
    expect(res.status).toBe(409);
  });

  it("rejects missing fullName", async () => {
    const res = await request(app).post("/users/signup").send({
      role: "farmer", email: "x@x.com", password: "Password1",
    });
    expect(res.status).toBe(400);
    expect(res.body.details.fullName).toBeDefined();
  });

  it("rejects fullName shorter than 2 chars", async () => {
    const res = await request(app).post("/users/signup").send({
      role: "farmer", fullName: "J", email: "j@x.com", password: "Password1",
    });
    expect(res.status).toBe(400);
  });

  it("rejects missing role", async () => {
    const res = await request(app).post("/users/signup").send({
      fullName: "John Doe", email: "j@x.com", password: "Password1",
    });
    expect(res.status).toBe(400);
    expect(res.body.details.role).toBeDefined();
  });

  it("sets httpOnly jwt cookie on success", async () => {
    const res = await request(app).post("/users/signup").send({
      role: "buyer", fullName: "Cookie Test", email: "cookie@test.com", password: "Password1",
    });
    expect(res.status).toBe(201);
    const setCookie = res.headers["set-cookie"] as string[] | string | undefined;
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
    expect(cookies.some((c) => c.startsWith("jwt="))).toBe(true);
  });
});

// ==================== GET /users/:id ====================

describe("GET /users/:id", () => {
  it("returns user by id with wallet null when no wallet", async () => {
    const [user] = await db.insert(users).values({
      firstName: "Fetched",
      lastName: "User",
      email: "fetched@test.com",
      passwordHash: await hashPassword("Password1"),
      role: "farmer",
      acceptedTerms: true,
    }).returning();

    const res = await request(app).get(`/users/${user!.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user!.id);
    expect(res.body.email).toBe("fetched@test.com");
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.wallet).toBeNull();
  });

  it("includes wallet when it exists", async () => {
    const [user] = await db.insert(users).values({
      firstName: "Wallet",
      lastName: "User",
      email: "wallet@test.com",
      passwordHash: await hashPassword("Password1"),
      role: "farmer",
      acceptedTerms: true,
    }).returning();

    await db.insert(wallets).values({
      userId: user!.id,
      availableBalance: 50000,
      pendingBalance: 0,
      totalPaidIn: 50000,
      totalPaidOut: 0,
    });

    const res = await request(app).get(`/users/${user!.id}`);
    expect(res.status).toBe(200);
    expect(res.body.wallet).not.toBeNull();
    expect(res.body.wallet.available_balance).toBe("50000");
  });

  it("returns 404 for unknown id", async () => {
    const res = await request(app).get("/users/nonexistent-id-xyz");
    expect(res.status).toBe(404);
  });
});

// ==================== PATCH /users/ ====================

describe("PATCH /users/", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).patch("/users/").send({ fullName: "New Name" });
    expect(res.status).toBe(401);
  });

  it("updates profile fields", async () => {
    const ag = await registerAndLogin();
    const res = await ag.patch("/users/").send({
      fullName: "Updated Name",
      bio: "I grow yams",
      locationState: "Anambra",
      bankName: "GTBank",
      bankAccountNumber: "0123456789",
      bankAccountName: "Test User",
    });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Updated Name");
    expect(res.body.bio).toBe("I grow yams");
    expect(res.body.location_state).toBe("Anambra");
    expect(res.body.bank_name).toBe("GTBank");
  });

  it("rejects bio longer than 500 chars", async () => {
    const ag = await registerAndLogin();
    const res = await ag.patch("/users/").send({ bio: "x".repeat(501) });
    expect(res.status).toBe(400);
  });

  it("partial update — only sent fields change", async () => {
    const ag = await registerAndLogin();
    await ag.patch("/users/").send({ locationState: "Lagos" });
    const res = await ag.patch("/users/").send({ locationLga: "Ikeja" });
    expect(res.status).toBe(200);
    expect(res.body.location_lga).toBe("Ikeja");
  });
});

// ==================== Auth alias paths ====================

describe("GET /api/auth/get-session", () => {
  it("returns null user when no cookie", async () => {
    const res = await request(app).get("/api/auth/get-session");
    expect(res.status).toBe(200);
    expect(res.body.user).toBeNull();
  });

  it("returns user when valid cookie present", async () => {
    const ag = await registerAndLogin();
    const res = await ag.get("/api/auth/get-session");
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("test@test.com");
  });
});

describe("POST /api/auth/sign-out", () => {
  it("clears jwt cookie", async () => {
    const ag = await registerAndLogin();
    const res = await ag.post("/api/auth/sign-out");
    expect(res.status).toBe(200);
    const setCookie = res.headers["set-cookie"] as string[] | string | undefined;
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie ?? ""];
    expect(cookies.some((c) => c.includes("jwt=;") || c.includes("jwt=;") || c.includes("Expires=Thu, 01 Jan 1970"))).toBe(true);
  });
});
