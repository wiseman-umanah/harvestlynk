import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
export declare function createOrder(req: AuthRequest, res: Response): Promise<void>;
export declare function getMyBuyerOrders(req: AuthRequest, res: Response): Promise<void>;
export declare function getMyFarmerOrders(req: AuthRequest, res: Response): Promise<void>;
export declare function updateOrderStatus(req: AuthRequest, res: Response): Promise<void>;
export declare function cancelOrder(req: AuthRequest, res: Response): Promise<void>;
export declare function simulatePayment(req: AuthRequest, res: Response): Promise<void>;
export declare function confirmDelivery(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=orders.controller.d.ts.map