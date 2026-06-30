"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Workflow,
  Loader2,
  AlertOctagon,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import {
  establishSecureSessionAction,
  getVerifiedUserAndWorkspace,
} from "../action";

const SIMULATED_PIPELINE_STEPS = [
  "Initializing container runtime parameters...",
  "Creating isolated virtual node namespace environment...",
  "Running secure schema validation & database migrations...",
  "Synchronizing cryptographic version control handshakes...",
  "Mapping ingress routing rules to core telemetry proxy...",
  "Finalizing cluster authorization matrix lock...",
];

function IngressSecurityProtocolScanner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [protocolState, setProtocolState] = useState<
    "evaluating" | "ready" | "failed"
  >("evaluating");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (protocolState !== "evaluating") return;

    const sequenceInterval = setInterval(() => {
      setCurrentStepIndex((prev) =>
        prev < SIMULATED_PIPELINE_STEPS.length - 1 ? prev + 1 : prev,
      );
    }, 1200);

    return () => clearInterval(sequenceInterval);
  }, [protocolState]);

  useEffect(() => {
    async function executeSecurityHandshake() {
      try {
        const urlToken = searchParams.get("token");
        const onboard = searchParams.get("onboard");

        // Sync explicit new token from URL parameter to server session
        if (urlToken) {
          await establishSecureSessionAction(urlToken);
        }

        // Run verification checks against central database registry
        const verification = await getVerifiedUserAndWorkspace();

        if (verification.success && verification.data) {
          setProtocolState("ready");

          // Allow the terminal animation a brief moment to finish elegantly
          setTimeout(() => {
            if (onboard === "true") {
              router.push(`/dashboard/${verification.data.userSlug}/configs`);
            } else {
              router.push(`/dashboard/${verification.data.userSlug}`);
            }
          }, 1500);
        } else {
          // If workspace resolution failed, step out of the execution line
          setProtocolState("failed");
          setErrorMessage(
            verification.error || "Could not determine your workspace context.",
          );
        }
      } catch (err: any) {
        setProtocolState("failed");
        setErrorMessage(
          err.message || "An unexpected validation exception occurred.",
        );
      }
    }

    // Delay the actual handshake slightly to sync with the terminal UI sequence
    const initialDelay = setTimeout(() => {
      executeSecurityHandshake();
    }, 1000);

    return () => clearTimeout(initialDelay);
  }, [searchParams, router]);

  // 🌟 CRITICAL FIX: Breaks the error loop by destroying stale browser state
  const handleHardResetAndExit = () => {
    // 1. Manually destroy the corrupted client session token cookie
    document.cookie =
      "sf_auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;";

    // 2. Perform a hard location change to clear query parameters (?token=...)
    window.location.href = "/";
  };

  const progressPercentage =
    protocolState === "ready"
      ? 100
      : Math.min(
          95,
          Math.round(
            ((currentStepIndex + 1) / SIMULATED_PIPELINE_STEPS.length) * 100,
          ),
        );

  return (
    <div className="w-full max-w-md bg-theme-surface/30 backdrop-blur-md border border-theme-outline/50 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-theme-outline/30 flex items-center justify-between bg-theme-surface/20">
        <div className="flex items-center gap-2">
          <Workflow
            className={`w-5 h-5 ${
              protocolState === "failed"
                ? "text-rose-500"
                : "text-theme-primary animate-pulse"
            }`}
          />
          <span className="font-mono text-xs tracking-wider uppercase font-semibold text-theme-text/90">
            Ingress Security Protocol
          </span>
        </div>
        <div className="flex gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              protocolState === "failed"
                ? "bg-rose-500"
                : protocolState === "ready"
                  ? "bg-emerald-500"
                  : "bg-amber-500 animate-ping"
            }`}
          />
        </div>
      </div>

      <div className="p-6 font-mono text-xs space-y-4">
        {protocolState === "evaluating" && (
          <div className="space-y-2 min-h-[80px] flex flex-col justify-center">
            <div className="text-theme-muted flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-theme-primary" />
              <span>
                [STAGE {currentStepIndex + 1}/6]: Parsing Token Layers...
              </span>
            </div>
            <div className="text-theme-text font-medium leading-relaxed">
              &gt; {SIMULATED_PIPELINE_STEPS[currentStepIndex]}
            </div>
          </div>
        )}

        {protocolState === "ready" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-start gap-3"
          >
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold uppercase tracking-wide text-[11px]">
                Handshake Verified
              </div>
              <p className="text-emerald-500/80 mt-1 text-[11px]">
                Identity matched to runtime grid. Forwarding context to
                dashboard...
              </p>
            </div>
          </motion.div>
        )}

        {protocolState === "failed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold uppercase tracking-wide text-[11px]">
                  Handshake Fault Intercepted
                </div>
                <p className="text-rose-500/80 mt-1 text-[11px] font-sans break-words font-medium">
                  {errorMessage}
                </p>
              </div>
            </div>

            <button
              onClick={handleHardResetAndExit}
              className="w-full py-2.5 px-4 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl transition-all duration-200 font-bold uppercase text-[11px] tracking-wider flex items-center justify-center gap-2"
            >
              <Terminal className="w-3.5 h-3.5" />
              Purge Session State & Return to Login
            </button>
          </motion.div>
        )}
      </div>

      <div className="h-1 w-full bg-theme-surface/50">
        <motion.div
          className={`h-full ${
            protocolState === "failed" ? "bg-rose-500" : "bg-theme-primary"
          }`}
          initial={{ width: "0%" }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ ease: "easeInOut", duration: 0.5 }}
        />
      </div>
    </div>
  );
}

export default function StudioFlowAuthGate() {
  return (
    <div className="min-h-screen bg-theme-bg flex flex-col items-center justify-center p-6 antialiased selection:bg-theme-primary/20 relative overflow-hidden transition-colors duration-300">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-theme-primary/10 via-theme-bg/0 to-theme-bg/0 pointer-events-none transition-colors duration-300" />
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-4 text-theme-primary">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="font-mono text-xs tracking-widest uppercase">
              Initializing Secure Gate...
            </span>
          </div>
        }
      >
        <IngressSecurityProtocolScanner />
      </Suspense>
    </div>
  );
}
