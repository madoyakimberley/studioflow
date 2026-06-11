"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Sparkles, Shield, Loader2 } from "lucide-react";

function SecurityScanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scanStatus, setScanStatus] = useState<
    "initializing" | "analyzing" | "redirecting" | "failed"
  >("initializing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const runSecurityProtocol = async () => {
      const token = searchParams.get("token");

      // 1. Silent redirect to philosophy if no token is present (Normal Link)
      if (!token) {
        router.push("/philosophy");
        return;
      }

      setScanStatus("analyzing");

      try {
        // 2. The Backend Handoff -> Ping the Python API Core
        const response = await fetch(
          "http://localhost:8000/api/v1/verify-auth",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          },
        );

        // Artificial delay to allow visual feedback of the "scan" effect
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (response.ok) {
          // 3. Identity Confirmed by Python backend
          setScanStatus("redirecting");
          localStorage.setItem("studioflow_role", "admin");

          // Brief pause to show the green shield success state before navigating
          setTimeout(() => {
            router.push("/dashboard");
          }, 800);
        } else {
          // 4. Python rejected the token or telemetry (Show Diagnostic Error)
          const errorData = await response
            .json()
            .catch(() => ({ detail: `HTTP ${response.status}` }));
          setScanStatus("failed");
          setErrorMessage(`Python API Rejected Token: ${errorData.detail}`);
        }
      } catch (error: any) {
        // 5. Fail securely on network errors (e.g., Python API is offline or CORS issue)
        setScanStatus("failed");
        setErrorMessage(
          `Network Error: Cannot reach http://localhost:8000. Is the FastAPI server running? (${error.message})`,
        );
      }
    };

    runSecurityProtocol();
  }, [router, searchParams]);

  return (
    <main className="z-10 text-center space-y-8 flex flex-col items-center max-w-md w-full px-6">
      <div
        className={`relative w-32 h-32 rounded-full overflow-hidden border-2 ${scanStatus === "failed" ? "border-rose-500" : "border-slate-800"} shadow-2xl mb-4`}
      >
        <Image
          src="/images/admin_pfp.jpg"
          alt="Admin Profile"
          fill
          priority
          loading="eager"
          sizes="128px"
          className={`object-cover ${scanStatus === "redirecting" ? "grayscale-0" : "grayscale"}`}
        />
        {/* Scanning overlay effect */}
        {scanStatus === "analyzing" && (
          <div className="absolute inset-0 bg-cyan-500/20 mix-blend-overlay animate-pulse" />
        )}
        {/* Failed overlay effect */}
        {scanStatus === "failed" && (
          <div className="absolute inset-0 bg-rose-500/30 mix-blend-overlay" />
        )}
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          {scanStatus === "initializing" && "Initializing..."}
          {scanStatus === "analyzing" && "Analyzing Context..."}
          {scanStatus === "redirecting" && "Identity Confirmed."}
          {scanStatus === "failed" && "Access Denied."}
        </h1>

        {/* Error Output Box */}
        {scanStatus === "failed" ? (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs font-mono text-left w-full mt-4 break-words">
            &gt;_ ERROR TRACE:
            <br />
            {errorMessage}
          </div>
        ) : (
          <p className="text-slate-400 italic text-sm h-6">
            {scanStatus === "analyzing" &&
              "Verifying cryptographic token and environmental telemetry..."}
            {scanStatus === "redirecting" && "Establishing secure session..."}
          </p>
        )}
      </div>

      <div className="h-12 flex items-center justify-center mt-4">
        {scanStatus === "analyzing" && (
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        )}
        {scanStatus === "redirecting" && (
          <Shield className="w-8 h-8 text-fuchsia-500" />
        )}
      </div>

      <div className="inline-flex items-center gap-2 border border-slate-800 bg-[#0b0e14] px-4 py-1.5 rounded-full text-xs text-slate-500 font-medium tracking-wide mt-8">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Zero-Touch
        Authentication Active
      </div>
    </main>
  );
}

// Main page component wrapping the Suspense boundary required for client-side routing params
export default function StudioFlowAuthGate() {
  return (
    <div className="min-h-screen bg-[#06070b] flex flex-col items-center justify-center font-serif text-slate-300 relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[500px] bg-gradient-to-b from-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

      <Suspense
        fallback={
          <div className="z-10 text-white">Loading secure environment...</div>
        }
      >
        <SecurityScanner />
      </Suspense>
    </div>
  );
}
