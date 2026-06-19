type NotificationType = "order" | "payment" | "system";
export declare function createNotification(opts: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    referenceId?: string;
    referenceType?: string;
}): Promise<void>;
export {};
//# sourceMappingURL=notifications.d.ts.map