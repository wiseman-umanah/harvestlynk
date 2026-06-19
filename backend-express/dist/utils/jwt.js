import { SignJWT, jwtVerify } from "jose";
const secret = new TextEncoder().encode(process.env["JWT_SECRET"] ?? "change-this-secret");
export async function signAccessToken(payload) {
    return new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(secret);
}
export async function verifyToken(token) {
    const { payload } = await jwtVerify(token, secret);
    return payload;
}
export async function signEmailVerificationToken(userId, email) {
    return new SignJWT({ userId, email, type: "email_verify" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("10m")
        .sign(secret);
}
export async function verifyEmailVerificationToken(token) {
    const { payload } = await jwtVerify(token, secret);
    if (payload["type"] !== "email_verify")
        throw new Error("Invalid token type");
    return { userId: payload["userId"], email: payload["email"] };
}
export async function signRevokeToken(sessionId) {
    return new SignJWT({ sessionId, type: "revoke" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);
}
export async function verifyRevokeToken(token) {
    const { payload } = await jwtVerify(token, secret);
    if (payload["type"] !== "revoke")
        throw new Error("Invalid token type");
    return { sessionId: payload["sessionId"] };
}
//# sourceMappingURL=jwt.js.map