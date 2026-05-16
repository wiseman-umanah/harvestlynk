"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi, usersApi } from "@/lib/api";

const CACHE_KEY = "hl_user_cache";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    async function handle() {
      try {
        const session = await authApi.getSession();
        if (!session?.user?.id) {
          router.push("/login");
          return;
        }

        const user = await usersApi.getUser(session.user.id);
        const desiredRole = searchParams.get("role") as "farmer" | "buyer" | null;

        if (!user.wallet) {
          // New OAuth user — create wallet and set role
          const role = desiredRole ?? "buyer";
          await usersApi.completeOAuthProfile({ role });
        }

        // Refresh user with wallet included
        const fresh = await usersApi.getUser(session.user.id);
        localStorage.setItem(CACHE_KEY, JSON.stringify(fresh));

        if (fresh.role === "farmer") {
          router.push(fresh.liveness_verified ? "/dashboard/farmer" : "/onboard/farmer");
        } else {
          router.push("/dashboard/buyer");
        }
      } catch {
        setError("Something went wrong completing sign-in. Please try again.");
      }
    }
    handle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-2xl text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Sign-in failed</h2>
          <p className="text-gray-400 text-sm mb-5">{error}</p>
          <a
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0D631B] text-white text-sm font-semibold hover:bg-[#0a4f15] transition-colors"
          >
            Back to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <i className="ri-loader-4-line animate-spin text-2xl text-[#0D631B]" />
        </div>
        <p className="text-gray-500 text-sm">Completing sign-in…</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
