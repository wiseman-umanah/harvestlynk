import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
export declare function getUser(req: Request, res: Response): Promise<void>;
export declare function updateUser(req: AuthRequest, res: Response): Promise<void>;
export declare function uploadNinDocument(req: AuthRequest, res: Response): Promise<void>;
export declare function uploadOwnershipDocument(req: AuthRequest, res: Response): Promise<void>;
export declare function livenessCheck(req: AuthRequest, res: Response): Promise<void>;
export declare function uploadAvatar(req: AuthRequest, res: Response): Promise<void>;
export declare function getMe(req: AuthRequest, res: Response): Promise<void>;
export declare function getStats(req: AuthRequest, res: Response): Promise<void>;
export declare function getVerificationStatus(req: AuthRequest, res: Response): Promise<void>;
export declare function completeOAuthProfile(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=users.controller.d.ts.map