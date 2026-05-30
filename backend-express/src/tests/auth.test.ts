import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../app.js";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { hashPassword } from "../utils/password.js";

const validFarmer = {
  firstName: "John",
  lastName: "Doe",
  email: "john@farm.com",
  phoneNumber: "+2348012345678",
  location: "Lagos",
  password: "Password1",
  confirmPassword: "Password1",
  role: "farmer",
  acceptTerms: true,
};

const validBuyer = {
  firstName: "Jane",
  lastName: "Smith",
  email: "jane@buy.com",
  password: "Password1",
  confirmPassword: "Password1",
  role: "buyer",
  acceptTerms: true,
};

// ==================== SIGNUP ====================

describe("POST /api/auth/signup", () => {
  describe("happy path", () => {
    it("creates a farmer account and returns token + user", async () => {
      const res = await request(app).post("/api/auth/signup").send(validFarmer);

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.token.split(".")).toHaveLength(3);
      expect(res.body.user.firstName).toBe("John");
      expect(res.body.user.lastName).toBe("Doe");
      expect(res.body.user.email).toBe("john@farm.com");
      expect(res.body.user.role).toBe("farmer");
      expect(res.body.user.phoneNumber).toBe("+2348012345678");
      expect(res.body.user.location).toBe("Lagos");
      expect(res.body.user.emailVerified).toBe(false);
      expect(res.body.user.trustScore).toBe(0);
      expect(res.body.user.id).toBeDefined();
      expect(res.body.user.createdAt).toBeDefined();
    });

    it("creates a buyer account and returns token + user", async () => {
      const res = await request(app).post("/api/auth/signup").send(validBuyer);

      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("buyer");
      expect(res.body.user.phoneNumber).toBeNull();
      expect(res.body.user.location).toBeNull();
    });

    it("never exposes passwordHash in response", async () => {
      const res = await request(app).post("/api/auth/signup").send(validFarmer);

      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it("normalises email to lowercase", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, email: "JOHN@FARM.COM" });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe("john@farm.com");
    });
  });

  describe("duplicate conflicts", () => {
    it("returns 409 when email already exists", async () => {
      await request(app).post("/api/auth/signup").send(validFarmer);
      const res = await request(app).post("/api/auth/signup").send(validFarmer);

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/email already exists/i);
    });

    it("returns 409 when phone number already exists", async () => {
      await request(app).post("/api/auth/signup").send(validFarmer);
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validBuyer, phoneNumber: "+2348012345678" });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/phone number already exists/i);
    });
  });

  describe("password rules", () => {
    it("rejects password shorter than 8 characters", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, password: "Pass1", confirmPassword: "Pass1" });

      expect(res.status).toBe(400);
      expect(res.body.details.password).toBeDefined();
    });

    it("rejects password with no uppercase letter", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, password: "password1", confirmPassword: "password1" });

      expect(res.status).toBe(400);
      expect(res.body.details.password).toBeDefined();
    });

    it("rejects password with no number", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, password: "Passwordonly", confirmPassword: "Passwordonly" });

      expect(res.status).toBe(400);
      expect(res.body.details.password).toBeDefined();
    });

    it("rejects when passwords do not match", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, confirmPassword: "DifferentPass1" });

      expect(res.status).toBe(400);
      expect(res.body.details.confirmPassword).toBeDefined();
    });
  });

  describe("email validation", () => {
    it("rejects malformed email (no @)", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, email: "notanemail" });

      expect(res.status).toBe(400);
      expect(res.body.details.email).toBeDefined();
    });

    it("rejects email missing domain", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, email: "test@" });

      expect(res.status).toBe(400);
      expect(res.body.details.email).toBeDefined();
    });
  });

  describe("phone number validation", () => {
    it("rejects phone shorter than 10 digits", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, phoneNumber: "+12345" });

      expect(res.status).toBe(400);
      expect(res.body.details.phoneNumber).toBeDefined();
    });

    it("rejects phone with non-numeric characters", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, phoneNumber: "+234-801-234" });

      expect(res.status).toBe(400);
      expect(res.body.details.phoneNumber).toBeDefined();
    });

    it("accepts phone without + prefix", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, phoneNumber: "08012345678" });

      expect(res.status).toBe(201);
    });
  });

  describe("missing required fields", () => {
    it("rejects missing firstName", async () => {
      const { firstName: _, ...body } = validFarmer;
      const res = await request(app).post("/api/auth/signup").send(body);

      expect(res.status).toBe(400);
      expect(res.body.details.firstName).toBeDefined();
    });

    it("rejects firstName shorter than 2 characters", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, firstName: "J" });

      expect(res.status).toBe(400);
      expect(res.body.details.firstName).toBeDefined();
    });

    it("rejects missing lastName", async () => {
      const { lastName: _, ...body } = validFarmer;
      const res = await request(app).post("/api/auth/signup").send(body);

      expect(res.status).toBe(400);
      expect(res.body.details.lastName).toBeDefined();
    });

    it("rejects missing email", async () => {
      const { email: _, ...body } = validFarmer;
      const res = await request(app).post("/api/auth/signup").send(body);

      expect(res.status).toBe(400);
      expect(res.body.details.email).toBeDefined();
    });

    it("rejects missing password", async () => {
      const { password: _, confirmPassword: __, ...body } = validFarmer;
      const res = await request(app).post("/api/auth/signup").send(body);

      expect(res.status).toBe(400);
      expect(res.body.details.password).toBeDefined();
    });

    it("rejects missing role", async () => {
      const { role: _, ...body } = validFarmer;
      const res = await request(app).post("/api/auth/signup").send(body);

      expect(res.status).toBe(400);
      expect(res.body.details.role).toBeDefined();
    });
  });

  describe("terms and conditions", () => {
    it("rejects acceptTerms = false", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, acceptTerms: false });

      expect(res.status).toBe(400);
      expect(res.body.details.acceptTerms).toBeDefined();
    });

    it("rejects missing acceptTerms", async () => {
      const { acceptTerms: _, ...body } = validFarmer;
      const res = await request(app).post("/api/auth/signup").send(body);

      expect(res.status).toBe(400);
      expect(res.body.details.acceptTerms).toBeDefined();
    });
  });

  describe("role validation", () => {
    it("rejects invalid role value", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validFarmer, role: "admin" });

      expect(res.status).toBe(400);
      expect(res.body.details.role).toBeDefined();
    });

    it("accepts role = farmer", async () => {
      const res = await request(app).post("/api/auth/signup").send({ ...validFarmer, role: "farmer" });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("farmer");
    });

    it("accepts role = buyer", async () => {
      const res = await request(app).post("/api/auth/signup").send({ ...validBuyer, role: "buyer" });
      expect(res.status).toBe(201);
      expect(res.body.user.role).toBe("buyer");
    });
  });
});

// ==================== LOGIN ====================

describe("POST /api/auth/login", () => {
  describe("happy path", () => {
    it("logs in and returns token + user", async () => {
      await request(app).post("/api/auth/signup").send(validFarmer);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "john@farm.com", password: "Password1" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.token.split(".")).toHaveLength(3);
      expect(res.body.user.email).toBe("john@farm.com");
      expect(res.body.user.role).toBe("farmer");
    });

    it("never exposes passwordHash in login response", async () => {
      await request(app).post("/api/auth/signup").send(validFarmer);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "john@farm.com", password: "Password1" });

      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it("normalises email to lowercase on login", async () => {
      await request(app).post("/api/auth/signup").send(validFarmer);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "JOHN@FARM.COM", password: "Password1" });

      expect(res.status).toBe(200);
    });
  });

  describe("bad credentials", () => {
    it("returns 401 for nonexistent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "ghost@nowhere.com", password: "Password1" });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it("returns 401 for wrong password", async () => {
      await request(app).post("/api/auth/signup").send(validFarmer);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "john@farm.com", password: "WrongPass1" });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/invalid email or password/i);
    });

    it("does not reveal whether email exists when password is wrong", async () => {
      await request(app).post("/api/auth/signup").send(validFarmer);

      const wrongPassRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "john@farm.com", password: "WrongPass1" });

      const noUserRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "ghost@nowhere.com", password: "WrongPass1" });

      expect(wrongPassRes.body.error).toBe(noUserRes.body.error);
    });
  });

  describe("banned account", () => {
    it("returns 403 when user is banned", async () => {
      const passwordHash = await hashPassword("Password1");
      await db.insert(users).values({
        firstName: "Bad",
        lastName: "Actor",
        email: "banned@test.com",
        passwordHash,
        role: "buyer",
        acceptedTerms: true,
        banned: true,
        banReason: "Fraud",
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "banned@test.com", password: "Password1" });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/suspended/i);
      expect(res.body.reason).toBe("Fraud");
    });
  });

  describe("validation", () => {
    it("rejects missing email", async () => {
      const res = await request(app).post("/api/auth/login").send({ password: "Password1" });

      expect(res.status).toBe(400);
      expect(res.body.details.email).toBeDefined();
    });

    it("rejects malformed email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "notanemail", password: "Password1" });

      expect(res.status).toBe(400);
      expect(res.body.details.email).toBeDefined();
    });

    it("rejects empty password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "john@farm.com", password: "" });

      expect(res.status).toBe(400);
      expect(res.body.details.password).toBeDefined();
    });
  });
});

// ==================== HEALTH ====================

describe("GET /health", () => {
  it("returns ok status", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });
});
