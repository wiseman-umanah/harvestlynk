"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { useState } from "react";

function Content() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    try {
      await authApi.resendVerification(email);
      setResent(true);
    } catch { /* ignore */ } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <i className="ri-mail-send-line text-4xl text-[#0D631B]" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h1>
        <p className="text-gray-500 text-sm mb-1">
          We sent a verification link to
        </p>
        {email && (
          <p className="text-[#0D631B] font-semibold text-sm mb-6">{email}</p>
        )}
        <p className="text-gray-400 text-sm mb-8">
          Click the link in the email to verify your account and log in. The link expires in 10 minutes.
        </p>

        <div className="space-y-3">
          {resent ? (
            <p className="text-green-600 text-sm font-medium py-2">
              <i className="ri-checkbox-circle-line mr-1" /> A new link has been sent.
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={!email || resending}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {resending ? (
                <><i className="ri-loader-4-line animate-spin mr-1" /> Sending…</>
              ) : (
                "Resend verification email"
              )}
            </button>
          )}

          <Link
            href="/login"
            className="block w-full py-3 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors text-center"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailSentPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}
