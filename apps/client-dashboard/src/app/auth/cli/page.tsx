"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Terminal, CheckCircle } from "lucide-react";

export default function CliAuthPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Authorizing CLI Bridge...");

  useEffect(() => {
    // In a real flow, you fetch the current user's session token from your auth provider or cookies here.
    // For this implementation, we grab the token from local storage or context.
    const activeToken =
      localStorage.getItem("studioflow_session_token") ||
      "dev_token_fallback_123";

    if (!activeToken) {
      setStatus("Unauthorized. Please log in to the dashboard first.");
      router.push("/welcome");
      return;
    }

    // Bounce the token over to the API route which redirects to the CLI local server
    setTimeout(() => {
      window.location.href = `/api/auth/cli-callback?token=${activeToken}`;
    }, 1500);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#060e20] flex flex-col items-center justify-center p-6 text-theme-muted antialiased selection:bg-cyan-500/20">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-outline)] rounded-2xl shadow-2xl p-8 max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-cyan-500 to-[var(--color-theme-secondary)] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Terminal className="w-8 h-8 text-theme-text" />
        </div>
        <h1 className="text-xl font-bold text-theme-text tracking-tight">
          StudioFlow CLI Authentication
        </h1>
        <p className="text-sm text-theme-muted font-mono flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" /> {status}
        </p>
      </div>
    </div>
  );
}
