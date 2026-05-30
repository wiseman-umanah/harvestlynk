import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env["JWT_SECRET"] ?? "change-this-secret");

export interface JwtPayload {
  userId: string;
  email: string;
  role: "farmer" | "buyer";
}

export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as JwtPayload;
}
