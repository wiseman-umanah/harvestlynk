import { db } from "../db/index.js";
import { notifications } from "../db/schema.js";
import { pushToUser } from "./wsServer.js";

type NotificationType = "order" | "payment" | "system";

export async function createNotification(opts: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: string;
  referenceType?: string;
}) {
  try {
    const [notif] = await db.insert(notifications).values(opts).returning();
    if (notif) {
      pushToUser(opts.userId, {
        type: "notification",
        notification: {
          notification_id: notif.notificationId,
          user_id: notif.userId,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          is_read: notif.isRead,
          reference_id: notif.referenceId,
          reference_type: notif.referenceType,
          created_at: notif.createdAt,
        },
      });
    }
  } catch {
    // silently ignore — notifications must never break the main flow
  }
}
