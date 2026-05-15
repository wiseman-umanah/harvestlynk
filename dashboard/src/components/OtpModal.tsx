"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  email: string;
  redirectTo: string;
  onClose: () => void;
}

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export default function OtpModal({ email, redirectTo, onClose }: Props) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState(() => generateCode());
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Alert the code once on mount to simulate SMS/email delivery
  useEffect(() => {
    alert(`[Simulated OTP] Your verification code is: ${code}`);
  }, [code]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = useCallback((i: number, val: string) => {
    // Only accept digits
    const digit = val.replace(/\D/g, "").slice(-1);
    setError(false);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = digit;
      return next;
    });
    if (digit && i < 5) {
      inputRefs.current[i + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (digits[i]) {
        setDigits((prev) => { const n = [...prev]; n[i] = ""; return n; });
      } else if (i > 0) {
        inputRefs.current[i - 1]?.focus();
        setDigits((prev) => { const n = [...prev]; n[i - 1] = ""; return n; });
      }
    }
    if (e.key === "ArrowLeft" && i > 0) inputRefs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputRefs.current[i + 1]?.focus();
  }, [digits]);

  // Handle paste of 6-digit code
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      setError(false);
      inputRefs.current[5]?.focus();
    }
  }, []);

  function handleVerify() {
    const entered = digits.join("");
    if (entered.length < 6) return;
    if (entered === code) {
      setVerifying(true);
      setTimeout(() => router.push(redirectTo), 700);
    } else {
      setError(true);
      setDigits(Array(6).fill(""));
      inputRefs.current[0]?.focus();
    }
  }

  function handleResend() {
    if (!canResend) return;
    const newCode = generateCode();
    setCode(newCode);
    setDigits(Array(6).fill(""));
    setError(false);
    setCountdown(60);
    setCanResend(false);
    inputRefs.current[0]?.focus();
    alert(`[Simulated OTP] Your new verification code is: ${newCode}`);
  }

  const mm = String(Math.floor(countdown / 60)).padStart(2, "0");
  const ss = String(countdown % 60).padStart(2, "0");
  const filled = digits.join("").length === 6;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 12 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5 sm:p-8 text-center"
      >
        {/* Header */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Account</h2>
        <p className="text-gray-500 text-sm mb-5">
          Enter the 6-digit verification code sent to your phone or email
        </p>

        {/* Email pill */}
        <div className="flex items-center justify-center gap-2 bg-green-50 text-[#0D631B] text-xs sm:text-sm font-medium px-3 py-2 sm:px-4 sm:py-2.5 rounded-full mb-6 truncate max-w-full">
          <i className="ri-mail-line flex-shrink-0" />
          <span className="truncate">Code sent to {email}</span>
        </div>

        {/* OTP inputs */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 mb-4" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-10 h-12 sm:w-12 sm:h-14 rounded-xl border-2 text-center text-lg sm:text-xl font-bold transition-colors focus:outline-none flex-shrink-0
                ${error
                  ? "border-red-400 bg-red-50 text-red-600"
                  : d
                    ? "border-[#0D631B] bg-green-50 text-[#0D631B]"
                    : "border-gray-200 bg-gray-50 text-gray-900 focus:border-[#0D631B] focus:bg-white"
                }`}
            />
          ))}
        </div>

        {/* Error message */}
        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-1.5 text-red-600 text-sm font-semibold mb-4"
            >
              <i className="ri-error-warning-line" />
              Invalid verification code. Please try again.
            </motion.p>
          )}
        </AnimatePresence>

        {/* Verify button */}
        <motion.button
          whileHover={{ scale: filled ? 1.02 : 1 }}
          whileTap={{ scale: filled ? 0.97 : 1 }}
          onClick={handleVerify}
          disabled={!filled || verifying}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#0D631B] text-white font-semibold text-base hover:bg-[#0a4f15] transition-colors disabled:opacity-50 mt-1 mb-5"
        >
          {verifying ? (
            <><i className="ri-loader-4-line animate-spin" /> Verifying...</>
          ) : (
            <>Verify Code <i className="ri-arrow-right-line" /></>
          )}
        </motion.button>

        {/* Resend */}
        <button
          onClick={handleResend}
          disabled={!canResend}
          className={`text-sm font-semibold mb-2 transition-colors ${canResend ? "text-[#0D631B] hover:underline cursor-pointer" : "text-gray-300 cursor-default"}`}
        >
          Resend Code
        </button>

        {!canResend && (
          <p className="flex items-center justify-center gap-1.5 text-gray-400 text-sm">
            <i className="ri-time-line" /> Resend in {mm}:{ss}
          </p>
        )}
      </motion.div>
    </div>
  );
}
