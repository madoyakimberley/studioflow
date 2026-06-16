"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Workflow,
  Loader2,
  UserCheck,
  AlertOctagon,
  Terminal,
  Server,
} from "lucide-react";

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

  // Rotate informative log sequences to reassure users the pipeline is processing
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
    const executeIngressHandshake = async () => {
      const activeSessionToken = searchParams.get("token");
      const targetUser = searchParams.get("user") || "admin";
      const needsOnboarding = searchParams.get("onboard") === "true";

      if (!activeSessionToken) {
        router.push("/");
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
          // Keep screen slightly engaged if everything returns immediately to showcase logs
          await new Promise((r) => setTimeout(r, 4000));
          setProtocolState("ready");
          await new Promise((r) => setTimeout(r, 800));

          if (needsOnboarding) {
            router.push(`/environment-setup?user=${targetUser}`);
          } else {
            router.push(`/dashboard/${targetUser}`);
          }
        } else {
          setProtocolState("failed");
          setErrorMessage("Unauthorized Session Token Parameters.");
        }
      } catch (err: any) {
        setProtocolState("failed");
        setErrorMessage(
          err.message || "Network Timeout reaching Python Core Telemetry Node.",
        );
      }
    };

    executeIngressHandshake();
  }, [searchParams, router]);

  return (
    <div className="text-center space-y-6 max-w-md w-full px-4">
      <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#a078ff] via-cyan-500 to-[#e364a7] blur-lg opacity-40"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-1 rounded-2xl bg-gradient-to-bl from-cyan-500/20 via-transparent to-fuchsia-500/20 animate-pulse border border-slate-800"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        <motion.div
          className="relative w-20 h-20 rounded-2xl bg-[#0a0c16] border border-slate-800 flex items-center justify-center shadow-2xl"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 15 }}
        >
          <Workflow className="w-10 h-10 text-white drop-shadow-[0_0_10px_rgba(160,120,255,0.6)]" />
        </motion.div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-bold tracking-wider text-white uppercase font-mono flex items-center justify-center gap-2">
          {protocolState === "evaluating" && (
            <>
              <Loader2 className="w-4 h-4 text-[#a078ff] animate-spin" />
              Evaluating Cluster State...
            </>
          )}
          {protocolState === "ready" && "Session Integrity Verified"}
          {protocolState === "failed" && "Ingress Guard Deflection"}
        </h2>

        {/* Live Active Log Output Window Block */}
        <div className="bg-[#070b14] border border-[#161f33] rounded-xl p-4 text-left font-mono text-xs text-slate-400 space-y-2 shadow-inner max-w-sm mx-auto">
          <div className="flex items-center justify-between border-b border-slate-900 pb-2 mb-2 text-[10px] text-slate-500 tracking-tight">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3" /> PIPELINE LOGS
            </span>
            <span>NODE_V2_ACTIVE</span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              className="text-cyan-400 font-medium min-h-[32px] flex items-start gap-2"
            >
              <span className="text-[#e364a7] shrink-0">❯</span>
              <span>
                {protocolState === "evaluating"
                  ? SIMULATED_PIPELINE_STEPS[currentStepIndex]
                  : "Process lifecycle completed successfully."}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-xs text-slate-500 font-mono leading-relaxed max-w-xs mx-auto">
          {protocolState === "evaluating" &&
            "This process isolates data nodes and mounts configurations. Please remain connected."}
          {protocolState === "ready" &&
            "Redirecting to primary multi-tenant operations terminal framework..."}
          {protocolState === "failed" &&
            (errorMessage || "Access Token signature validation failure.")}
        </p>
      </div>

      <div className="h-4 flex items-center justify-center">
        {protocolState === "ready" && (
          <UserCheck className="w-5 h-5 text-emerald-400" />
        )}
        {protocolState === "failed" && (
          <AlertOctagon className="w-5 h-5 text-rose-500" />
        )}
      </div>
    </div>
  );
}

export default function StudioFlowAuthGate() {
  return (
    <div className="min-h-screen bg-[#030407] flex flex-col items-center justify-center p-6 text-slate-300 antialiased selection:bg-cyan-500/20">
      <Suspense
        fallback={<Loader2 className="w-6 h-6 text-slate-700 animate-spin" />}
      >
        <IngressSecurityProtocolScanner />
      </Suspense>
    </div>
  );
}
