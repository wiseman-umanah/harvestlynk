import type { Response } from "express";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { wallets, transactions } from "../db/schema.js";
import type { AuthRequest } from "../middleware/auth.js";

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank Nigeria", code: "023" },
  { name: "Ecobank Nigeria", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank", code: "214" },
  { name: "Guaranty Trust Bank", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "50211" },
  { name: "Moniepoint MFB", code: "50515" },
  { name: "OPay", code: "999992" },
  { name: "PalmPay", code: "999991" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered Bank", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank of Nigeria", code: "032" },
  { name: "United Bank For Africa", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "VFD Microfinance Bank", code: "566" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

export function getBanks(_req: AuthRequest, res: Response) {
  res.json({ banks: NIGERIAN_BANKS });
}

export async function getBalance(req: AuthRequest, res: Response) {
  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, req.user!.userId))
    .limit(1);

  if (!wallet) {
    // Auto-create wallet if missing
    const [created] = await db
      .insert(wallets)
      .values({ userId: req.user!.userId, availableBalance: 0, pendingBalance: 0, totalPaidIn: 0, totalPaidOut: 0 })
      .returning();
    res.json({
      wallet_id: created!.walletId,
      user_id: created!.userId,
      available_balance: "0",
      pending_balance: "0",
      total_paid_in: "0",
      created_at: created!.createdAt,
      updated_at: created!.updatedAt,
    });
    return;
  }

  res.json({
    wallet_id: wallet.walletId,
    user_id: wallet.userId,
    available_balance: String(wallet.availableBalance),
    pending_balance: String(wallet.pendingBalance),
    total_paid_in: String(wallet.totalPaidIn),
    created_at: wallet.createdAt,
    updated_at: wallet.updatedAt,
  });
}

export async function getTransactions(req: AuthRequest, res: Response) {
  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, req.user!.userId))
    .orderBy(desc(transactions.createdAt))
    .limit(50);

  res.json(
    rows.map((t) => ({
      transaction_id: t.transactionId,
      wallet_id: t.walletId,
      user_id: t.userId,
      type: t.type,
      amount: String(t.amount),
      balance_before: String(t.balanceBefore),
      balance_after: String(t.balanceAfter),
      reference_id: t.referenceId,
      reference_type: t.referenceType,
      description: t.description,
      status: t.status,
      created_at: t.createdAt,
    }))
  );
}

export async function verifyBank(req: AuthRequest, res: Response) {
  const bank_code = typeof req.query["bank_code"] === "string" ? req.query["bank_code"] : undefined;
  const account_number = typeof req.query["account_number"] === "string" ? req.query["account_number"] : undefined;

  if (!bank_code || !account_number) {
    res.status(400).json({ error: "bank_code and account_number are required" });
    return;
  }

  // Stub — replace with real Paystack/Squad bank verify API call
  res.json({
    success: true,
    message: "Bank account verified",
    data: { account_name: "ACCOUNT HOLDER NAME" },
  });
}

const withdrawSchema = z.object({
  amount: z.number().int().positive("Amount must be a positive number (in kobo)"),
  bank_name: z.string().min(1),
  bank_code: z.string().min(1),
  account_number: z.string().min(10),
});

export async function withdraw(req: AuthRequest, res: Response) {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors });
    return;
  }

  const { amount } = parsed.data;

  const [wallet] = await db
    .select()
    .from(wallets)
    .where(eq(wallets.userId, req.user!.userId))
    .limit(1);

  if (!wallet) { res.status(404).json({ error: "Wallet not found" }); return; }
  if (wallet.availableBalance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const newBalance = wallet.availableBalance - amount;

  await db.update(wallets)
    .set({ availableBalance: newBalance, updatedAt: new Date() })
    .where(eq(wallets.walletId, wallet.walletId));

  const [tx] = await db.insert(transactions).values({
    walletId: wallet.walletId,
    userId: req.user!.userId,
    type: "debit",
    amount,
    balanceBefore: wallet.availableBalance,
    balanceAfter: newBalance,
    description: `Withdrawal to ${parsed.data.bank_name}`,
    status: "pending",
  }).returning();

  res.json({
    success: true,
    message: "Withdrawal initiated",
    transaction_id: tx!.transactionId,
    status: "pending",
  });
}
