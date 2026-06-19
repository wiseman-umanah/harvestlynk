import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
export declare function getBanks(_req: AuthRequest, res: Response): void;
export declare function getBalance(req: AuthRequest, res: Response): Promise<void>;
export declare function getTransactions(req: AuthRequest, res: Response): Promise<void>;
export declare function verifyBank(req: AuthRequest, res: Response): Promise<void>;
export declare function withdraw(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=wallet.controller.d.ts.map