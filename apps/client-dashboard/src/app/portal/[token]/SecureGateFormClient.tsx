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
  const formRef = useRef<HTMLFormElement>(null);

  const [pinCode, setPinCode] = useState("");
  const [isPendingVerify, startVerifyTransition] = useTransition();
  const [isPendingTransit, startTransitTransition] = useTransition();
  const autoSubmitAttempted = useRef(false);

  // Auto-fill and submit if code is in the URL
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (
      codeFromUrl &&
      codeFromUrl.length === 6 &&
      !autoSubmitAttempted.current
    ) {
      setPinCode(codeFromUrl);
      autoSubmitAttempted.current = true;

      // Delay slightly to let state settle before auto-submitting
      setTimeout(() => {
        if (formRef.current) formRef.current.requestSubmit();
      }, 150);
    }
  }, [searchParams]);

  const triggerCodeTransmission = () => {
    startTransitTransition(async () => {
      const res = await sendPortalVerificationCodeAction(projectId);
      if (res.success) {
        toast.success(res.message, {
          style: {
            background: "#12151d",
            color: "#d3d7ff",
            border: "1px solid rgba(175,186,255,0.15)",
          },
        });
      } else {
        toast.error(res.message, {
          style: {
            background: "#1a1014",
            color: "#ffb4ab",
            border: "1px solid rgba(255,180,171,0.15)",
          },
        });
      }
    });
  };

  // const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   startVerifyTransition(async () => {
  //     // Assuming your action takes FormData based on standard Next.js patterns
  //     const formData = new FormData();
  //     formData.append("pinCode", pinCode);
  //     formData.append("projectId", projectId.toString());

  //     const res = await verifyPortalAccessCodeAction(formData);
  //     if (res.success) {
  //       toast.success("Portal Unlocked!");
  //       router.refresh();
  //     } else {
  //       toast.error(res.message || "Invalid Access Code");
  //     }
  //   });
  // };

  return (
    // <div className="w-full max-w-sm mx-auto p-8 bg-[#0b0e15]/90 backdrop-blur-xl border border-[rgba(175,186,255,0.08)] rounded-3xl shadow-2xl">
    //   <div className="flex justify-center mb-6">
    //     <div className="w-12 h-12 bg-[#12151d] rounded-2xl flex items-center justify-center border border-[rgba(175,186,255,0.05)] shadow-inner">
    //       <Key className="w-5 h-5 text-[#dac5ff]" />
    //     </div>
    //   </div>

    //   <div className="text-center mb-8">
    //     <h2 className="text-xl font-bold text-white tracking-tight mb-2">
    //       Secure Portal Access
    //     </h2>
    //     <p className="text-xs text-[#94a3b8] leading-relaxed">
    //       Enter your 6-digit project access key to unlock your dashboard.
    //     </p>
    //   </div>

    //   <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 mb-6">
    //     <div>
    //       <div className="relative">
    //         <input
    //           type="text"
    //           name="pinCode"
    //           maxLength={6}
    //           value={pinCode}
    //           onChange={(e) => setPinCode(e.target.value.replace(/\D/g, ""))}
    //           placeholder="000000"
    //           className="w-full bg-[#06070b]/50 border border-[rgba(175,186,255,0.1)] rounded-xl px-4 py-3.5 text-center font-mono font-bold tracking-[0.25em] text-sm text-[#e0e2ec] focus:outline-none focus:border-[#dac5ff] transition placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-500 placeholder:text-xs"
    //         />
    //       </div>
    //     </div>

    //     <button
    //       type="submit"
    //       disabled={isPendingVerify || pinCode.length !== 6}
    //       className="w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#dac5ff] hover:bg-[#cbb1fb] text-[#030712] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#dac5ff]/5"
    //     >
    //       {isPendingVerify ? (
    //         <>
    //           <Loader2 className="w-3.5 h-3.5 animate-spin" /> Verifying...
    //         </>
    //       ) : (
    //         "Unlock Portal"
    //       )}
    //     </button>
    //   </form>

    //   <div className="text-center pt-2 border-t border-[rgba(175,186,255,0.06)]">
    //     <button
    //       type="button"
    //       disabled={isPendingTransit || isPendingVerify}
    //       onClick={triggerCodeTransmission}
    //       className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8] hover:text-[#e8b3ff] transition disabled:opacity-40"
    //     >
    //       <RefreshCw
    //         className={`w-3 h-3 ${isPendingTransit ? "animate-spin" : ""}`}
    //       />
    //       Resend Access Code
    //     </button>
    //   </div>
    // </div>
    <div>ON TESTING</div>
  );
}
