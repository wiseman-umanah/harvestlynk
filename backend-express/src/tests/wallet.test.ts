import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, wallets, transactions } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken } from "../utils/jwt.js";

const BASE_AUTH = "/api/v1/auth";
const BASE_WALLET = "/api/v1/wallet";

beforeEach(async () => {
  await db.delete(transactions);
  await db.delete(wallets);
});

async function createVerifiedUser(role: "farmer" | "buyer" = "farmer") {
  const email = "wallet@test.com";
  await request(app).post(`${BASE_AUTH}/signup`).send({
    firstName: "Wallet",
    lastName: "Tester",
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

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ==================== GET /api/v1/wallet/balance ====================

describe("GET /api/v1/wallet/balance", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_WALLET}/balance`);
    expect(res.status).toBe(401);
  });

  it("auto-creates wallet and returns zero balances", async () => {
    const { accessToken } = await createVerifiedUser();
    const res = await request(app).get(`${BASE_WALLET}/balance`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.available_balance).toBe("0");
    expect(res.body.pending_balance).toBe("0");
    expect(res.body.total_paid_in).toBe("0");
    expect(res.body.wallet_id).toBeDefined();
  });

  it("returns existing wallet balance", async () => {
    const { accessToken } = await createVerifiedUser();
    await request(app).get(`${BASE_WALLET}/balance`).set(auth(accessToken)); // trigger auto-create
    await db.update(wallets).set({ availableBalance: 100000 });
    const res = await request(app).get(`${BASE_WALLET}/balance`).set(auth(accessToken));
    expect(res.body.available_balance).toBe("100000");
  });
});

// ==================== GET /api/v1/wallet/transactions ====================

describe("GET /api/v1/wallet/transactions", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_WALLET}/transactions`);
    expect(res.status).toBe(401);
  });

  it("returns empty array when no transactions", async () => {
    const { accessToken } = await createVerifiedUser();
    const res = await request(app).get(`${BASE_WALLET}/transactions`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns transactions with correct shape", async () => {
    const { accessToken } = await createVerifiedUser();
    await request(app).get(`${BASE_WALLET}/balance`).set(auth(accessToken)); // auto-create wallet
    await db.update(wallets).set({ availableBalance: 50000 });
    await request(app).post(`${BASE_WALLET}/withdraw`).set(auth(accessToken)).send({
      amount: 10000,
      bank_name: "GTBank",
      bank_code: "058",
      account_number: "0123456789",
    });

    const res = await request(app).get(`${BASE_WALLET}/transactions`).set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe("debit");
    expect(res.body[0].amount).toBe("10000");
    expect(res.body[0].transaction_id).toBeDefined();
    expect(res.body[0].status).toBe("pending");
  });
});

// ==================== GET /api/v1/wallet/verify-bank ====================

describe("GET /api/v1/wallet/verify-bank", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get(`${BASE_WALLET}/verify-bank?bank_code=058&account_number=0123456789`);
    expect(res.status).toBe(401);
  });

  it("returns 400 when params missing", async () => {
    const { accessToken } = await createVerifiedUser();
    const res = await request(app).get(`${BASE_WALLET}/verify-bank`).set(auth(accessToken));
    expect(res.status).toBe(400);
  });

  it("returns stub verify response", async () => {
    const { accessToken } = await createVerifiedUser();
    const res = await request(app)
      .get(`${BASE_WALLET}/verify-bank?bank_code=058&account_number=0123456789`)
      .set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.account_name).toBeDefined();
  });
});

// ==================== POST /api/v1/wallet/withdraw ====================

describe("POST /api/v1/wallet/withdraw", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post(`${BASE_WALLET}/withdraw`).send({
      amount: 1000, bank_name: "GTB", bank_code: "058", account_number: "0123456789",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 if balance insufficient", async () => {
    const { accessToken } = await createVerifiedUser();
    await request(app).get(`${BASE_WALLET}/balance`).set(auth(accessToken)); // create wallet (balance = 0)
    const res = await request(app).post(`${BASE_WALLET}/withdraw`).set(auth(accessToken)).send({
      amount: 5000, bank_name: "GTBank", bank_code: "058", account_number: "0123456789",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  it("deducts balance and returns transaction_id", async () => {
    const { accessToken } = await createVerifiedUser();
    await request(app).get(`${BASE_WALLET}/balance`).set(auth(accessToken));
    await db.update(wallets).set({ availableBalance: 50000 });

    const res = await request(app).post(`${BASE_WALLET}/withdraw`).set(auth(accessToken)).send({
      amount: 20000, bank_name: "GTBank", bank_code: "058", account_number: "0123456789",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.transaction_id).toBeDefined();
    expect(res.body.status).toBe("pending");

    const [wallet] = await db.select().from(wallets);
    expect(Number(wallet!.availableBalance)).toBe(30000);
  });

  it("rejects amount = 0", async () => {
    const { accessToken } = await createVerifiedUser();
    const res = await request(app).post(`${BASE_WALLET}/withdraw`).set(auth(accessToken)).send({
      amount: 0, bank_name: "GTBank", bank_code: "058", account_number: "0123456789",
    });
    expect(res.status).toBe(400);
  });

  it("rejects missing bank_code", async () => {
    const { accessToken } = await createVerifiedUser();
    const res = await request(app).post(`${BASE_WALLET}/withdraw`).set(auth(accessToken)).send({
      amount: 1000, bank_name: "GTBank", account_number: "0123456789",
    });
    expect(res.status).toBe(400);
  });
});
