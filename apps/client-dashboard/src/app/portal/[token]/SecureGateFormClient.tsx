"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  sendPortalVerificationCodeAction,
  verifyPortalAccessCodeAction,
} from "../../portal-actions";
import { Loader2, Key, RefreshCw } from "lucide-react";

interface FormProps {
  projectId: number;
  projectSlug: string;
}

export default function SecureGateFormClient({
  projectId,
  projectSlug,
}: FormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pinCode, setPinCode] = useState("");
  const [isPendingVerify, startVerifyTransition] = useTransition();
  const [isPendingTransit, startTransitTransition] = useTransition();
  const autoSubmitAttempted = useRef(false);

  const handleVerification = (codeToVerify: string) => {
    startVerifyTransition(async () => {
      // Passes the parameters securely straight into the server action
      const res = await verifyPortalAccessCodeAction(projectId, codeToVerify);
      if (res.success) {
        toast.success("Portal Unlocked!", {
          style: {
            background: "var(--color-theme-surface)",
            color: "var(--color-theme-primary)",
            border: "1px solid var(--color-theme-outline)",
          },
        });
        router.refresh();
      } else {
        toast.error(res.message || "Invalid Access Code", {
          style: {
            background: "var(--color-theme-surface)",
            color: "var(--color-theme-secondary)", // Fallback to your secondary color for errors
            border: "1px solid var(--color-theme-outline)",
          },
        });
      }
    });
  };

  // Auto-fill and submit seamlessly if the valid code is detected directly in the URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (
      codeFromUrl &&
      codeFromUrl.length === 6 &&
      !autoSubmitAttempted.current
    ) {
      setPinCode(codeFromUrl);
      autoSubmitAttempted.current = true;
      handleVerification(codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const triggerCodeTransmission = () => {
    startTransitTransition(async () => {
      const res = await sendPortalVerificationCodeAction(projectId);
      if (res.success) {
        toast.success(res.message, {
          style: {
            background: "var(--color-theme-surface)",
            color: "var(--color-theme-primary)",
            border: "1px solid var(--color-theme-outline)",
          },
        });
      } else {
        toast.error(res.message, {
          style: {
            background: "var(--color-theme-surface)",
            color: "var(--color-theme-secondary)",
            border: "1px solid var(--color-theme-outline)",
          },
        });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleVerification(pinCode);
  };

  return (
    <div className="w-full max-w-sm mx-auto p-8 bg-theme-surface/90 backdrop-blur-xl border border-theme-outline/50 rounded-3xl shadow-2xl transition-colors duration-300">
      <div className="flex justify-center mb-6">
        <div className="w-12 h-12 bg-theme-surface rounded-2xl flex items-center justify-center border border-theme-outline/50 shadow-inner">
          <Key className="w-5 h-5 text-theme-primary" />
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-xl font-bold text-theme-text tracking-tight mb-2">
          Secure Portal Access
        </h2>
        <p className="text-xs text-theme-muted leading-relaxed">
          Enter your 6-digit project access key to unlock your dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 mb-6">
        <div>
          <div className="relative">
            <input
              type="text"
              name="pinCode"
              maxLength={6}
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full bg-theme-bg/50 border border-theme-outline/50 rounded-xl px-4 py-3.5 text-center font-mono font-bold tracking-[0.25em] text-sm text-theme-text focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary transition-all placeholder:font-sans placeholder:tracking-normal placeholder:text-theme-muted placeholder:font-normal placeholder:text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPendingVerify || pinCode.length !== 6}
          className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-theme-primary hover:brightness-110 text-theme-on-primary transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-theme-primary/20"
        >
          {isPendingVerify ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
            </>
          ) : (
            "Unlock Portal"
          )}
        </button>
      </form>

      <div className="text-center pt-2 border-t border-theme-outline/30">
        <button
          type="button"
          disabled={isPendingTransit || isPendingVerify}
          onClick={triggerCodeTransmission}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-theme-muted hover:text-theme-secondary transition-colors disabled:opacity-40"
        >
          <RefreshCw
            className={`w-3 h-3 ${isPendingTransit ? "animate-spin" : ""}`}
          />
          Resend Access Code
        </button>
      </div>
    </div>
  );
}
