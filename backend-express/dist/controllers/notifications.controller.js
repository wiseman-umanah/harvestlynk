import { eq, and, desc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
export async function getNotifications(req, res) {
    const { type } = req.query;
    const rows = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.userId, req.user.userId), type && ["order", "payment", "system"].includes(type)
        ? eq(notifications.type, type)
        : undefined))
        .orderBy(desc(notifications.createdAt))
        .limit(50);
    res.json(rows.map((n) => ({
        notification_id: n.notificationId,
        user_id: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        is_read: n.isRead,
        reference_id: n.referenceId,
        reference_type: n.referenceType,
        created_at: n.createdAt,
    })));
}
export async function markAsRead(req, res) {
    const id = String(req.params["id"]);
    const [updated] = await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.notificationId, id), eq(notifications.userId, req.user.userId)))
        .returning();
    if (!updated) {
        res.status(404).json({ error: "Notification not found" });
        return;
    }
    res.json({ notification_id: updated.notificationId, is_read: true });
}
export async function markAllAsRead(req, res) {
    await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.userId, req.user.userId), eq(notifications.isRead, false)));
    res.json({ message: "All notifications marked as read" });
}
export async function getUnreadCount(req, res) {
    const [row] = await db
        .select({ count: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, req.user.userId), eq(notifications.isRead, false)));
    res.json({ count: Number(row?.count ?? 0) });
}
//# sourceMappingURL=notifications.controller.js.map