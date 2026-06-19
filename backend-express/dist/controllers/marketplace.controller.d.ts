import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
export declare function getAllListings(req: Request, res: Response): Promise<void>;
export declare function getListing(req: Request, res: Response): Promise<void>;
export declare function updateListing(req: AuthRequest, res: Response): Promise<void>;
export declare function createListing(req: AuthRequest, res: Response): Promise<void>;
export declare function getMyListings(req: AuthRequest, res: Response): Promise<void>;
export declare function deleteListing(req: AuthRequest, res: Response): Promise<void>;
export declare function uploadImage(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=marketplace.controller.d.ts.map