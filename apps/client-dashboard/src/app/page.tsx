"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, UserCheck, AlertOctagon } from "lucide-react";
import MotionGraphicStage from "../components/MotionGraphicStage";

function IngressSecurityProtocolScanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [protocolState, setProtocolState] = useState<
    "evaluating" | "ready" | "failed"
  >("evaluating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const executeIngressHandshake = async () => {
      const activeSessionToken = searchParams.get("token");

      // Set to 9500ms to allow the full forward and backward kinetic bounce loop to finish
      const ANIMATION_DURATION = 9500;
      const startTime = Date.now();

      // Helper to calculate remaining delay so the redirect doesn't happen too early
      const delayRedirect = (route: string) => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, ANIMATION_DURATION - elapsedTime);
        setTimeout(() => router.push(route), remainingTime);
      };

      if (!activeSessionToken) {
        setProtocolState("failed");
        setErrorMessage("No Session Token Detected. Deflecting to Gate...");
        delayRedirect("/welcome");
        return;
      }

      try {
        const networkCoreVerificationResponse = await fetch(
          "http://localhost:8000/api/v1/verify-auth",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: activeSessionToken }),
          },
        );

        if (!networkCoreVerificationResponse.ok) {
          throw new Error(
            "Ingress verification matrix handshake failed configuration boundaries.",
          );
        }

        const parsingResultPayload =
          await networkCoreVerificationResponse.json();

        if (parsingResultPayload.success) {
          setProtocolState("ready");
          delayRedirect("/dashboard");
        } else {
          setProtocolState("failed");
          setErrorMessage("Unauthorized Session Token Parameters.");
          delayRedirect("/welcome");
        }
      } catch (err: any) {
        setProtocolState("failed");
        setErrorMessage(
          err.message || "Network Timeout reaching Python Core Telemetry Node.",
        );
        delayRedirect("/welcome");
      }
    };

    executeIngressHandshake();
  }, [searchParams, router]);

  return (
    <div className="relative z-10 w-full flex flex-col items-center justify-center">
      {/* Centralized Master Stage without the header/footer window wrappers */}
      <main className="w-full max-w-5xl flex flex-col items-center justify-center gap-12">
        <MotionGraphicStage />
      </main>
    </div>
  );
}

export default function StudioFlowAuthGate() {
  return (
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col justify-center items-center p-4 font-sans selection:bg-indigo-500/30 selection:text-theme-text relative overflow-hidden">
      {/* Dynamic ambient background glow specifically centered behind animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[150px]" />
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center z-10">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        }
      >
        <IngressSecurityProtocolScanner />
      </Suspense>
    </div>
  );
}
