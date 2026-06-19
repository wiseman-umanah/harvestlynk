export declare function sendVerificationEmail(opts: {
    to: string;
    name: string;
    verifyLink: string;
}): Promise<void>;
export declare function sendPasswordResetEmail(opts: {
    to: string;
    name: string;
    resetLink: string;
}): Promise<void>;
export declare function sendNewLoginAlert(opts: {
    to: string;
    name: string;
    ipAddress: string;
    userAgent: string;
    loginTime: Date;
    revokeLink: string;
}): Promise<void>;
//# sourceMappingURL=email.d.ts.map