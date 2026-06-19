import { verifyToken } from "../utils/jwt.js";
export async function authenticate(req, res, next) {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) {
        res.status(401).json({ error: "Not authenticated" });
        return;
    }
    try {
        req.user = await verifyToken(token);
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid or expired session" });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: "Insufficient permissions" });
            return;
        }
        next();
    };
}
//# sourceMappingURL=auth.js.map