"use client";
import { useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";

function CallbackHandler() {
  const router = useRouter();

  useEffect(() => {
    // Google OAuth is not yet configured — redirect back to login
    router.replace("/login");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <i className="ri-loader-4-line animate-spin text-2xl text-[#0D631B]" />
        </div>
        <p className="text-gray-500 text-sm">Redirecting…</p>
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
