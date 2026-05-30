import "dotenv/config";
import { db } from "../db/index.js";
import { users, wallets, listings, orders, notifications, transactions, farmerRatings, scans } from "../db/schema.js";
import { afterAll, beforeEach } from "vitest";

async function cleanAll() {
  await db.delete(notifications);
  await db.delete(farmerRatings);
  await db.delete(orders);
  await db.delete(transactions);
  await db.delete(scans);
  await db.delete(listings);
  await db.delete(wallets);
  await db.delete(users);
}

beforeEach(cleanAll);
afterAll(cleanAll);
