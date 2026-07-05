/**
 * Global test setup — runs once per test file via vitest config.
 *
 * Strategy for authentication:
 *   Every test file that needs authenticated routes uses vi.mock to intercept
 *   getSupabaseAdmin().auth.getUser(). The mock decodes our local JWT (signed by
 *   signAccessToken) to extract the user's email, so authenticate() can look up
 *   the local DB row without any Supabase round-trip.
 *
 *   insertTestUser() seeds a user + wallet directly into the DB and returns a
 *   signed local JWT — no signup/verify-email HTTP flow required.
 */

import "dotenv/config";
import { db } from "../db/index.js";
import {
  users,
  wallets,
  listings,
  orders,
  notifications,
  transactions,
  walletLedgerEntries,
  farmerRatings,
  scans,
  refreshTokens,
  payments,
  payouts,
  virtualAccounts,
} from "../db/schema.js";
import { afterAll, beforeEach } from "vitest";

async function cleanAll() {
  await db.delete(notifications);
  await db.delete(farmerRatings);
  await db.delete(transactions);
  await db.delete(walletLedgerEntries);
  await db.delete(payments);
  await db.delete(payouts);
  await db.delete(orders);
  await db.delete(virtualAccounts);
  await db.delete(scans);
  await db.delete(listings);
  await db.delete(refreshTokens);
  await db.delete(wallets);
  await db.delete(users);
}

beforeEach(cleanAll);
afterAll(cleanAll);
