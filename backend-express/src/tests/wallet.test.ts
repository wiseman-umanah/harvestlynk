import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { wallets, transactions } from "../db/schema.js";

beforeEach(async () => {
  await db.delete(transactions);
  await db.delete(wallets);
});

const agent = () => request.agent(app);

async function loginAgent(role: "farmer" | "buyer" = "farmer") {
  const ag = agent();
  await ag.post("/api/auth/signup").send({
    firstName: "Wallet",
    lastName: "Tester",
    email: `wallet-${Date.now()}@test.com`,
    password: "Password1",
    confirmPassword: "Password1",
    role,
    acceptTerms: true,
  });
  return ag;
}

// ==================== GET /wallet/balance ====================

describe("GET /wallet/balance", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/wallet/balance");
    expect(res.status).toBe(401);
  });

  it("auto-creates wallet and returns zero balances", async () => {
    const ag = await loginAgent();
    const res = await ag.get("/wallet/balance");
    expect(res.status).toBe(200);
    expect(res.body.available_balance).toBe("0");
    expect(res.body.pending_balance).toBe("0");
    expect(res.body.total_paid_in).toBe("0");
    expect(res.body.wallet_id).toBeDefined();
  });

  it("returns existing wallet balance", async () => {
    const ag = await loginAgent();
    // Create wallet with balance via signup → getBalance auto-create, then manually update
    await ag.get("/wallet/balance"); // trigger auto-create
    // Directly update in DB
    await db.update(wallets).set({ availableBalance: 100000 });
    const res = await ag.get("/wallet/balance");
    expect(res.body.available_balance).toBe("100000");
  });
});

// ==================== GET /wallet/transactions ====================

describe("GET /wallet/transactions", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/wallet/transactions");
    expect(res.status).toBe(401);
  });

  it("returns empty array when no transactions", async () => {
    const ag = await loginAgent();
    const res = await ag.get("/wallet/transactions");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns transactions with correct shape", async () => {
    const ag = await loginAgent();
    // Trigger wallet creation then withdraw to create a transaction
    await ag.get("/wallet/balance");
    await db.update(wallets).set({ availableBalance: 50000 });
    await ag.post("/wallet/withdraw").send({
      amount: 10000,
      bank_name: "GTBank",
      bank_code: "058",
      account_number: "0123456789",
    });

    const res = await ag.get("/wallet/transactions");
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].type).toBe("debit");
    expect(res.body[0].amount).toBe("10000");
    expect(res.body[0].transaction_id).toBeDefined();
    expect(res.body[0].status).toBe("pending");
  });
});

// ==================== GET /wallet/verify-bank ====================

describe("GET /wallet/verify-bank", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).get("/wallet/verify-bank?bank_code=058&account_number=0123456789");
    expect(res.status).toBe(401);
  });

  it("returns 400 when params missing", async () => {
    const ag = await loginAgent();
    const res = await ag.get("/wallet/verify-bank");
    expect(res.status).toBe(400);
  });

  it("returns stub verify response", async () => {
    const ag = await loginAgent();
    const res = await ag.get("/wallet/verify-bank?bank_code=058&account_number=0123456789");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.account_name).toBeDefined();
  });
});

// ==================== POST /wallet/withdraw ====================

describe("POST /wallet/withdraw", () => {
  it("returns 401 without auth", async () => {
    const res = await request(app).post("/wallet/withdraw").send({
      amount: 1000, bank_name: "GTB", bank_code: "058", account_number: "0123456789",
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 if balance insufficient", async () => {
    const ag = await loginAgent();
    await ag.get("/wallet/balance"); // create wallet (balance = 0)
    const res = await ag.post("/wallet/withdraw").send({
      amount: 5000, bank_name: "GTBank", bank_code: "058", account_number: "0123456789",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  it("deducts balance and returns transaction_id", async () => {
    const ag = await loginAgent();
    await ag.get("/wallet/balance");
    await db.update(wallets).set({ availableBalance: 50000 });

    const res = await ag.post("/wallet/withdraw").send({
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
    const ag = await loginAgent();
    const res = await ag.post("/wallet/withdraw").send({
      amount: 0, bank_name: "GTBank", bank_code: "058", account_number: "0123456789",
    });
    expect(res.status).toBe(400);
  });

  it("rejects missing bank_code", async () => {
    const ag = await loginAgent();
    const res = await ag.post("/wallet/withdraw").send({
      amount: 1000, bank_name: "GTBank", account_number: "0123456789",
    });
    expect(res.status).toBe(400);
  });
});
