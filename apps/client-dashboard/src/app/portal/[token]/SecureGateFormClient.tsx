"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendPortalVerificationCodeAction,
  verifyPortalAccessCodeAction,
} from "../../portal-actions";
import {
  Loader2,
  Key,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

interface FormProps {
  projectId: number;
  projectSlug: string;
}

export default function SecureGateFormClient({
  projectId,
  projectSlug,
}: FormProps) {
  const router = useRouter();
  const [pinCode, setPinCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isPendingVerify, startVerifyTransition] = useTransition();
  const [isPendingTransit, startTransitTransition] = useTransition();

  const triggerCodeTransmission = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransitTransition(async () => {
      const res = await sendPortalVerificationCodeAction(projectId);
      if (res.success) {
        setSuccessMessage(res.message);
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  const executeFormVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinCode.length !== 6) {
      setErrorMessage("The verification code must be exactly 6 digits long.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);

    startVerifyTransition(async () => {
      const res = await verifyPortalAccessCodeAction(projectId, pinCode);
      if (res.success) {
        setSuccessMessage("Code verified! Opening your dashboard...");
        setTimeout(() => {
          router.push(`/portal/${projectSlug}/dashboard`);
          router.refresh();
        }, 1200);
      } else {
        setErrorMessage(res.message);
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* STATUS DISPLAYS */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-[rgba(255,180,171,0.06)] border border-[rgba(255,180,171,0.15)] flex items-start gap-2.5 text-[#ffb4ab] text-[11px] leading-relaxed">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-lg bg-[rgba(210,167,255,0.06)] border border-[rgba(175,186,255,0.15)] flex items-start gap-2.5 text-[#d3d7ff] text-[11px] leading-relaxed">
          <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={executeFormVerification} className="space-y-3.5">
        <div>
          <div className="relative">
            <Key className="absolute left-3 top-3 h-4 w-4 text-[#64748b]" />
            <input
              type="text"
              maxLength={6}
              required
              placeholder="Enter 6-Digit Code"
              value={pinCode}
              onChange={(e) =>
                setPinCode(e.target.value.replace(/[^0-9]/g, ""))
              }
              className="w-full bg-[#0c0f16]/80 border border-[rgba(175,186,255,0.12)] rounded-xl py-2.5 pl-10 pr-4 text-center font-mono font-bold tracking-[0.25em] text-sm text-[#e0e2ec] focus:outline-none focus:border-[#dac5ff] transition placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 placeholder:text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPendingVerify || pinCode.length !== 6}
          className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#dac5ff] hover:bg-[#cbb1fb] text-[#030712] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#dac5ff]/5"
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

      <div className="text-center pt-2 border-t border-[rgba(175,186,255,0.06)]">
        <button
          type="button"
          disabled={isPendingTransit || isPendingVerify}
          onClick={triggerCodeTransmission}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8] hover:text-[#e8b3ff] transition disabled:opacity-40"
        >
          <RefreshCw
            className={`w-3 h-3 ${isPendingTransit ? "animate-spin" : ""}`}
          />
          {isPendingTransit ? "Sending code..." : "Request Verification Code"}
        </button>
      </div>
    </div>
  );
}
