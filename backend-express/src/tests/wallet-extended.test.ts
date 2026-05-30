import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";

// ==================== GET /wallet/banks ====================

describe("GET /wallet/banks", () => {
  it("returns list of banks without auth (public endpoint)", async () => {
    const res = await request(app).get("/wallet/banks");
    expect(res.status).toBe(200);
    expect(res.body.banks).toBeDefined();
    expect(Array.isArray(res.body.banks)).toBe(true);
    expect(res.body.banks.length).toBeGreaterThan(0);
  });

  it("each bank has name and code", async () => {
    const res = await request(app).get("/wallet/banks");
    const banks: { name: string; code: string }[] = res.body.banks;
    banks.forEach((b) => {
      expect(b.name).toBeDefined();
      expect(b.code).toBeDefined();
    });
  });

  it("includes GTBank (code 058)", async () => {
    const res = await request(app).get("/wallet/banks");
    const banks: { name: string; code: string }[] = res.body.banks;
    const gtb = banks.find((b) => b.code === "058");
    expect(gtb).toBeDefined();
  });
});
