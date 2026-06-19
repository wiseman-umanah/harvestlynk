export interface JwtPayload {
    userId: string;
    email: string;
    role: "farmer" | "buyer";
}
export declare function signAccessToken(payload: JwtPayload): Promise<string>;
export declare function verifyToken(token: string): Promise<JwtPayload>;
export declare function signEmailVerificationToken(userId: string, email: string): Promise<string>;
export declare function verifyEmailVerificationToken(token: string): Promise<{
    userId: string;
    email: string;
}>;
export declare function signRevokeToken(sessionId: string): Promise<string>;
export declare function verifyRevokeToken(token: string): Promise<{
    sessionId: string;
}>;
//# sourceMappingURL=jwt.d.ts.map