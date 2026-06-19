import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
export declare function getNotifications(req: AuthRequest, res: Response): Promise<void>;
export declare function markAsRead(req: AuthRequest, res: Response): Promise<void>;
export declare function markAllAsRead(req: AuthRequest, res: Response): Promise<void>;
export declare function getUnreadCount(req: AuthRequest, res: Response): Promise<void>;
//# sourceMappingURL=notifications.controller.d.ts.map