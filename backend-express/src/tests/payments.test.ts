/**
 * payments.test.ts — /api/v1/payments webhook routes
 *
 * Tests the Nomba webhook handler with pre-seeded DB state (no Supabase).
 *
 * Covers:
 *  - payment_success webhook: credits farmer escrow atomically
 *  - Duplicate webhook (same nombaReference): idempotent — no double-credit
 *  - payment_failed webhook: acks 200, order stays pending_payment
 *  - payout_success webhook: marks payout as success
 *  - payout_failed webhook: marks payout failed, restores available balance
 */

import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createHmac, randomUUID } from "node:crypto";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, orders, wallets, payments, payouts, listings } from "../db/schema.js";
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
      signUp: async () => ({ data: { user: null }, error: { message: "not used" } }),
    },
  }),
  getAuthRedirectUrl: (p: string) => `http://localhost${p}`,
  getSupabaseUserNameParts: () => ({ firstName: "T", lastName: "U" }),
  isSupabaseEmailVerified: () => true,
}));

// ─── helpers ──────────────────────────────────────────────────────────────────

const BASE_PAYMENTS = "/api/v1/payments";
const BASE_MARKET = "/api/v1/marketplace";
const BASE_ORDERS = "/api/v1/orders";
const WEBHOOK_SECRET = process.env["NOMBA_WEBHOOK_SECRET"] ?? "test-webhook-secret";

async function insertUser(role: "farmer" | "buyer") {
  const userId = randomUUID();
  const email = `pmts-${userId.slice(0, 8)}@payments.test`;
  await db.insert(users).values({
    id: userId, firstName: role === "farmer" ? "Farm" : "Buy", lastName: "User",
    email, passwordHash: "x", role, emailVerified: true, acceptedTerms: true,
    livenessVerified: role === "farmer",
  });
  await db.insert(wallets).values({ userId, availableBalance: 0, pendingBalance: 0, totalPaidIn: 0, totalPaidOut: 0 });
  const token = await signAccessToken({ userId, email, role });
  return { userId, email, token };
}

function auth(t: string) { return { Authorization: `Bearer ${t}` }; }

function buildWebhook(payload: Record<string, unknown>, secret = WEBHOOK_SECRET) {
  const body = JSON.stringify(payload);
  const sig = createHmac("sha256", secret).update(body).digest("hex");
  return { rawBody: Buffer.from(body), signature: sig };
}

const listingBody = {
  product_name: "Yam",
  category: "tubers",
  quantity: 500,
  unit: "kg",
  price_per_unit: 80000,
  location_state: "Ogun",
};

/** Seeds a pending_payment order from scratch. */
async function setupOrder() {
  const farmer = await insertUser("farmer");
  const buyer = await insertUser("buyer");

  const listRes = await request(app)
    .post(`${BASE_MARKET}/listings`)
    .set(auth(farmer.token))
    .send(listingBody);
  if (!listRes.body.listing_id) throw new Error(`Listing failed: ${JSON.stringify(listRes.body)}`);

  const orderRes = await request(app)
    .post(BASE_ORDERS)
    .set(auth(buyer.token))
    .send({ listing_id: listRes.body.listing_id as string, quantity: 2, delivery_method: "pickup" });
  if (!orderRes.body.order_id) throw new Error(`Order failed: ${JSON.stringify(orderRes.body)}`);

  await db.update(orders).set({ status: "pending_payment" }).where(eq(orders.orderId, orderRes.body.order_id as string));

  return { farmer, buyer, orderId: orderRes.body.order_id as string };
}

// ─── payment_success — first credit ──────────────────────────────────────────

describe("POST /payments/nomba-webhook — payment_success", () => {
  it("credits farmer pendingBalance and advances order to payment_confirmed", async () => {
    const { farmer, orderId } = await setupOrder();
    const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
    const amountKobo = order!.totalAmount;
    const nombaRef = `NOMBA-NEW-${Date.now()}`;

    const [fwBefore] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);

    const { rawBody, signature } = buildWebhook({
      event: "payment_success",
      data: { orderReference: order!.orderRef, merchantTxRef: nombaRef },
    });

    const res = await request(app)
      .post(`${BASE_PAYMENTS}/nomba-webhook`)
      .set("Content-Type", "application/octet-stream")
      .set("nomba-signature", signature)
      .send(rawBody);

    expect(res.status).toBe(200);

    const [fwAfter] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    expect(Number(fwAfter!.pendingBalance)).toBe(Number(fwBefore!.pendingBalance) + amountKobo);

    const [orderAfter] = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
    expect(orderAfter?.status).toBe("payment_confirmed");
  });
});

// ─── payment_success — duplicate (idempotent) ─────────────────────────────────

describe("POST /payments/nomba-webhook — idempotent duplicate", () => {
  it("does not double-credit when same nombaReference received again", async () => {
    const { farmer, orderId } = await setupOrder();
    const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
    const amountKobo = order!.totalAmount;
    const nombaRef = `NOMBA-IDEM-${Date.now()}`;

    // Simulate first webhook already processed
    await db.update(wallets)
      .set({ pendingBalance: amountKobo })
      .where(eq(wallets.userId, farmer.userId));
    await db.insert(payments).values({
      orderId, buyerId: order!.buyerId, farmerId: order!.farmerId,
      amount: amountKobo, nombaReference: nombaRef,
      status: "success", paymentMethod: "checkout",
      paidAt: new Date(), webhookReceivedAt: new Date(),
    });
    await db.update(orders).set({ status: "payment_confirmed" }).where(eq(orders.orderId, orderId));

    const [wBefore] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    const pendingBefore = wBefore!.pendingBalance;

    const { rawBody, signature } = buildWebhook({
      event: "payment_success",
      data: { orderReference: order!.orderRef, merchantTxRef: nombaRef },
    });

    const res = await request(app)
      .post(`${BASE_PAYMENTS}/nomba-webhook`)
      .set("Content-Type", "application/octet-stream")
      .set("nomba-signature", signature)
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/already processed/i);

    const [wAfter] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    expect(wAfter!.pendingBalance).toBe(pendingBefore);
  });
});

// ─── payment_failed ───────────────────────────────────────────────────────────

describe("POST /payments/nomba-webhook — payment_failed", () => {
  it("acks 200 and leaves order in pending_payment", async () => {
    const { orderId } = await setupOrder();
    const [order] = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);

    const { rawBody, signature } = buildWebhook({
      event: "payment_failed",
      data: { orderReference: order!.orderRef },
    });

    const res = await request(app)
      .post(`${BASE_PAYMENTS}/nomba-webhook`)
      .set("Content-Type", "application/octet-stream")
      .set("nomba-signature", signature)
      .send(rawBody);

    expect(res.status).toBe(200);

    const [after] = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
    expect(after?.status).toBe("pending_payment");
  });
});

// ─── payout_success ───────────────────────────────────────────────────────────

describe("POST /payments/nomba-webhook — payout_success", () => {
  it("marks payout as success", async () => {
    const { farmer } = await setupOrder();
    const transferRef = `XFER-OK-${Date.now()}`;

    const [payout] = await db.insert(payouts).values({
      farmerId: farmer.userId,
      grossAmount: 50000,
      commissionAmount: 0,
      netAmount: 50000,
      commissionRate: "0.0000",
      nombaReference: transferRef,
      merchantTxRef: transferRef,
      status: "processing",
    }).returning();

    const { rawBody, signature } = buildWebhook({
      event: "payout_success",
      data: { merchantTxRef: transferRef },
    });

    const res = await request(app)
      .post(`${BASE_PAYMENTS}/nomba-webhook`)
      .set("Content-Type", "application/octet-stream")
      .set("nomba-signature", signature)
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const [updated] = await db.select().from(payouts).where(eq(payouts.payoutId, payout!.payoutId)).limit(1);
    expect(updated?.status).toBe("success");
  });
});

// ─── payout_failed ────────────────────────────────────────────────────────────

describe("POST /payments/nomba-webhook — payout_failed", () => {
  it("marks payout failed and restores available balance", async () => {
    const { farmer } = await setupOrder();
    const netAmount = 75000;
    const transferRef = `XFER-FAIL-${Date.now()}`;

    const [fwBefore] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    const availableBefore = fwBefore!.availableBalance;

    const [payout] = await db.insert(payouts).values({
      farmerId: farmer.userId,
      grossAmount: netAmount,
      commissionAmount: 0,
      netAmount,
      commissionRate: "0.0000",
      nombaReference: transferRef,
      merchantTxRef: transferRef,
      status: "processing",
    }).returning();

    const { rawBody, signature } = buildWebhook({
      event: "payout_failed",
      data: { merchantTxRef: transferRef, description: "Bank rejected" },
    });

    const res = await request(app)
      .post(`${BASE_PAYMENTS}/nomba-webhook`)
      .set("Content-Type", "application/octet-stream")
      .set("nomba-signature", signature)
      .send(rawBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const [updated] = await db.select().from(payouts).where(eq(payouts.payoutId, payout!.payoutId)).limit(1);
    expect(updated?.status).toBe("failed");

    const [fwAfter] = await db.select().from(wallets).where(eq(wallets.userId, farmer.userId)).limit(1);
    expect(Number(fwAfter!.availableBalance)).toBe(Number(availableBefore) + netAmount);
  });
});
