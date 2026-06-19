import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users, wallets } from "../db/schema.js";
import { hashPassword } from "../utils/password.js";
import { eq } from "drizzle-orm";
import { signEmailVerificationToken } from "../utils/jwt.js";
const BASE_AUTH = "/api/v1/auth";
const BASE_USERS = "/api/v1/users";
beforeEach(async () => {
    await db.delete(wallets);
});
async function createVerifiedUser(role = "farmer", email = "test@test.com") {
    await request(app).post(`${BASE_AUTH}/signup`).send({
        firstName: "Test",
        lastName: "User",
        email,
        password: "Password1",
        confirmPassword: "Password1",
        role,
    });
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const token = await signEmailVerificationToken(user.id, user.email);
    const res = await request(app).get(`${BASE_AUTH}/verify-email?token=${token}`);
    return { accessToken: res.body.accessToken, userId: user.id };
}
// ==================== GET /api/v1/users/:id ====================
describe("GET /api/v1/users/:id", () => {
    it("returns user by id with wallet null when no wallet", async () => {
        const [user] = await db.insert(users).values({
            firstName: "Fetched",
            lastName: "User",
            email: "fetched@test.com",
            passwordHash: await hashPassword("Password1"),
            role: "farmer",
        }).returning();
        const res = await request(app).get(`${BASE_USERS}/${user.id}`);
        expect(res.status).toBe(200);
        expect(res.body.id).toBe(user.id);
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
        }).returning();
        await db.insert(wallets).values({
            userId: user.id,
            availableBalance: 50000,
            pendingBalance: 0,
            totalPaidIn: 50000,
            totalPaidOut: 0,
        });
        const res = await request(app).get(`${BASE_USERS}/${user.id}`);
        expect(res.status).toBe(200);
        expect(res.body.wallet).not.toBeNull();
        expect(res.body.wallet.available_balance).toBe("50000");
    });
    it("returns 404 for unknown id", async () => {
        const res = await request(app).get(`${BASE_USERS}/nonexistent-id-xyz`);
        expect(res.status).toBe(404);
    });
});
// ==================== PATCH /api/v1/users ====================
describe("PATCH /api/v1/users", () => {
    it("returns 401 without auth", async () => {
        const res = await request(app).patch(`${BASE_USERS}/`).send({ fullName: "New Name" });
        expect(res.status).toBe(401);
    });
    it("updates profile fields", async () => {
        const { accessToken } = await createVerifiedUser();
        const res = await request(app)
            .patch(`${BASE_USERS}/`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send({
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
        const { accessToken } = await createVerifiedUser();
        const res = await request(app)
            .patch(`${BASE_USERS}/`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send({ bio: "x".repeat(501) });
        expect(res.status).toBe(400);
    });
    it("partial update — only sent fields change", async () => {
        const { accessToken } = await createVerifiedUser();
        await request(app)
            .patch(`${BASE_USERS}/`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send({ locationState: "Lagos" });
        const res = await request(app)
            .patch(`${BASE_USERS}/`)
            .set("Authorization", `Bearer ${accessToken}`)
            .send({ locationLga: "Ikeja" });
        expect(res.status).toBe(200);
        expect(res.body.location_lga).toBe("Ikeja");
    });
});
//# sourceMappingURL=users.test.js.map