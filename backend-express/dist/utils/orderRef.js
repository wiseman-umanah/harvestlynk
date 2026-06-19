const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export function generateOrderRef() {
    const letters = Array.from({ length: 2 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join("");
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    return `${letters}-${digits}`;
}
//# sourceMappingURL=orderRef.js.map