import type { Request, Response } from "express";
import { users } from "../db/schema.js";
import type { AuthRequest } from "../middleware/auth.js";
export declare const authUser: (user: typeof users.$inferSelect) => {
    id: string;
    name: string;
    email: string;
    role: "farmer" | "buyer";
    image: string | null;
    emailVerified: boolean;
};
export declare const safeUser: (user: typeof users.$inferSelect) => {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    role: "farmer" | "buyer";
    phoneNumber: string | null;
    farmName: string | null;
    location: string | null;
    image: string | null;
    emailVerified: boolean;
    trustScore: number;
    location_state: string | null;
    location_lga: string | null;
    location_village: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    liveness_verified: boolean;
    preferred_language: string | null;
    bio: string | null;
    createdAt: Date;
    updatedAt: Date;
};
export declare function signup(req: Request, res: Response): Promise<void>;
export declare function login(req: Request, res: Response): Promise<void>;
export declare function verifyEmail(req: Request, res: Response): Promise<void>;
export declare function resendVerification(req: Request, res: Response): Promise<void>;
export declare function refresh(req: Request, res: Response): Promise<void>;
export declare function logout(req: Request, res: Response): Promise<void>;
export declare function revokeSession(req: Request, res: Response): Promise<void>;
export declare function getSessions(req: Request & {
    user?: {
        userId: string;
    };
}, res: Response): Promise<void>;
export declare function forgotPassword(req: Request, res: Response): Promise<void>;
export declare function resetPassword(req: Request, res: Response): Promise<void>;
export declare function changePassword(req: AuthRequest, res: Response): Promise<void>;
export declare function revokeOtherSessions(req: Request & {
    user?: {
        userId: string;
    };
}, res: Response): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map