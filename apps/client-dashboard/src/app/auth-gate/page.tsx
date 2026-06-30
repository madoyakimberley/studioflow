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
    const executeIngressHandshake = async () => {
      const activeSessionToken = searchParams.get("token");
      const targetUser = searchParams.get("user") || "admin";
      const needsOnboarding = searchParams.get("onboard") === "true";

      try {
        // ==========================================
        // 🛡️ DELEGATE TO SECURE SERVER ACTION
        // ==========================================
        let handshakeResult: any = { success: false };

        if (activeSessionToken) {
          // Flow A: Email/Password login (Token is in the URL)
          handshakeResult =
            await establishSecureSessionAction(activeSessionToken);
        } else {
          // Flow B: Google OAuth login (No URL token, check NextAuth cookies natively)
          const nextAuthCheck = await getVerifiedUserAndWorkspace();

          if (nextAuthCheck.success && nextAuthCheck.data) {
            handshakeResult = {
              success: true,
              user: {
                username: nextAuthCheck.data.userSlug,
                email: nextAuthCheck.data.userId, // Placed here to bypass super-admin type checks safely
              },
            };
          } else {
            handshakeResult = {
              success: false,
              error: nextAuthCheck.error || "No NextAuth session found.",
            };
          }
        }

        if (handshakeResult.success && handshakeResult.user) {
          await new Promise((r) => setTimeout(r, 4000));
          setProtocolState("ready");
          await new Promise((r) => setTimeout(r, 800));

          // ==========================================
          // 🛡️ DYNAMIC ENVIRONMENTAL SUPERADMIN CHECK
          // ==========================================
          const adminEmailsString = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
          const superAdminEmails = adminEmailsString
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean);

          const userEmailFromPayload = handshakeResult.user?.email || "";
          const isSuperAdmin = superAdminEmails.includes(userEmailFromPayload);

          let finalUserSlug = handshakeResult.user?.username || targetUser;
          if (isSuperAdmin && userEmailFromPayload) {
            finalUserSlug = userEmailFromPayload
              .split("@")[0]
              .replace(/[^a-zA-Z0-9]/g, "");
          }

          if (needsOnboarding) {
            router.push(`/onboarding/setup/?user=${finalUserSlug}`);
          } else {
            router.push(`/dashboard/${finalUserSlug}`);
          }
        } else {
          setProtocolState("failed");
          setErrorMessage(
            handshakeResult.error || "Unauthorized Session Token Parameters.",
          );

          // Delayed fallback so the user can actually read the error animation
          // before being kicked back to the home page.
          setTimeout(() => {
            router.push("/");
          }, 3500);
        }
      } catch (err: any) {
        setProtocolState("failed");
        setErrorMessage(err.message || "Network Timeout reaching Core Matrix.");
      }
    };

    executeIngressHandshake();
  }, [searchParams, router]);

  const progressPercentage =
    protocolState === "ready"
      ? 100
      : protocolState === "failed"
        ? 100
        : Math.round(
            ((currentStepIndex + 1) / SIMULATED_PIPELINE_STEPS.length) * 100,
          );

  return (
    <div className="relative z-10 w-full max-w-lg bg-theme-surface/80 backdrop-blur-2xl border border-theme-outline rounded-3xl shadow-2xl p-8 md:p-10 text-center flex flex-col items-center transition-colors duration-300">
      <div className="relative w-32 h-32 mx-auto mb-10 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-theme-primary via-theme-secondary to-theme-primary blur-xl opacity-30"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-2 rounded-2xl bg-theme-primary/10 border border-theme-primary/30"
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        <motion.div
          className="relative w-20 h-20 rounded-2xl bg-theme-bg border border-theme-outline flex items-center justify-center shadow-inner overflow-hidden"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 140, damping: 15 }}
        >
          {protocolState === "evaluating" && (
            <Workflow className="w-10 h-10 text-theme-primary animate-pulse" />
          )}
          {protocolState === "ready" && (
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
          )}
          {protocolState === "failed" && (
            <AlertOctagon className="w-10 h-10 text-rose-500" />
          )}
        </motion.div>
      </div>

      <div className="space-y-6 w-full">
        <div className="space-y-2">
          <h2 className="text-sm font-bold tracking-widest text-theme-text uppercase font-mono flex items-center justify-center gap-2">
            {protocolState === "evaluating" && (
              <>
                <Loader2 className="w-4 h-4 text-theme-primary animate-spin" />
                Negotiating Handshake
              </>
            )}
            {protocolState === "ready" && "Session Integrity Verified"}
            {protocolState === "failed" && "Ingress Guard Deflection"}
          </h2>
          <p className="text-xs text-theme-muted font-mono max-w-xs mx-auto leading-relaxed">
            {protocolState === "evaluating" &&
              "Establishing encrypted tunnel to core matrix..."}
            {protocolState === "ready" &&
              "Redirecting to primary operations terminal..."}
            {protocolState === "failed" &&
              (errorMessage || "Access Token signature validation failure.")}
          </p>
        </div>

        <div className="w-full bg-theme-bg border border-theme-outline rounded-xl overflow-hidden shadow-inner flex flex-col text-left">
          <div className="bg-theme-surface border-b border-theme-outline/50 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-theme-muted tracking-widest uppercase">
              <Terminal className="w-3.5 h-3.5" />
              <span>Boot Sequence</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {protocolState === "evaluating" && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${protocolState === "failed" ? "bg-rose-500" : "bg-theme-primary"}`}
                ></span>
              </span>
              <span className="text-[10px] font-mono text-theme-muted">
                NODE_V2
              </span>
            </div>
          </div>

          <div className="p-4 h-20 flex flex-col justify-end relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={
                  protocolState === "evaluating"
                    ? currentStepIndex
                    : protocolState
                }
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="font-mono text-xs flex items-start gap-3"
              >
                <span
                  className={`shrink-0 mt-0.5 ${protocolState === "failed" ? "text-rose-500" : "text-theme-secondary"}`}
                >
                  {protocolState === "failed" ? "✖" : "❯"}
                </span>
                <span
                  className={`leading-relaxed ${protocolState === "failed" ? "text-rose-400" : "text-theme-text"}`}
                >
                  {protocolState === "evaluating"
                    ? SIMULATED_PIPELINE_STEPS[currentStepIndex]
                    : protocolState === "ready"
                      ? "Process lifecycle completed successfully. Access granted."
                      : "FATAL: Connection securely terminated by host."}
                </span>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="h-1 w-full bg-theme-surface/50">
            <motion.div
              className={`h-full ${protocolState === "failed" ? "bg-rose-500" : "bg-theme-primary"}`}
              initial={{ width: "0%" }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ ease: "easeInOut", duration: 0.5 }}
            />
          </div>
        </div>
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
