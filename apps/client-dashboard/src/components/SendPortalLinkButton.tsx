"use client";

import React, { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { dispatchSecurePortalLink } from "../app/portal-actions"; // Adjust path if needed!

interface SendPortalLinkProps {
  projectId: number;
  clientEmail: string;
  portalSlug: string;
  sentCount: number; // ✨ NEW PROP FOR THE COUNTER
}

export default function SendPortalLinkButton({
  projectId,
  clientEmail,
  portalSlug,
  sentCount, // ✨ NEW PROP INJECTED
}: SendPortalLinkProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  // ✨ RATE LIMIT CHECK IN THE UI
  const isMaxedOut = sentCount >= 5;

  const handleSend = () => {
    // 🛑 Prevent clicking if maxed out and show an instant toast error!
    if (isMaxedOut) {
      toast.error("Maximum portal link requests reached (5/5).");
      return;
    }

    startTransition(async () => {
      setStatus("idle");
      // Show loading toast while the server action runs
      const toastId = toast.loading(`Sending secure link to ${clientEmail}...`);

      try {
        const res = await dispatchSecurePortalLink(
          projectId,
          clientEmail,
          portalSlug,
        );

        if (res.success) {
          setStatus("success");
          toast.success(res.message, { id: toastId, duration: 4000 });
          setTimeout(() => setStatus("idle"), 5000);
        } else {
          setStatus("error");
          toast.error(res.message, { id: toastId, duration: 5000 });
          setTimeout(() => setStatus("idle"), 3000);
        }
      } catch (e) {
        setStatus("error");
        toast.error("Network error. Ensure the server is online.", {
          id: toastId,
        });
        setTimeout(() => setStatus("idle"), 3000);
      }
    });
  };

  return (
    <button
      onClick={handleSend}
      disabled={isPending || status === "success" || isMaxedOut}
      className={`flex items-center gap-1.5 px-2 py-1 border text-[9px] font-bold uppercase tracking-wider transition-colors rounded-md ${
        isMaxedOut
          ? "bg-[rgba(255,180,171,0.05)] border-[rgba(255,180,171,0.1)] text-[#ffb4ab]/50 cursor-not-allowed"
          : status === "success"
            ? "bg-[rgba(167,255,180,0.08)] border-[rgba(167,255,180,0.2)] text-[#a7ffb4]"
            : status === "error"
              ? "bg-[rgba(255,180,171,0.08)] border-[rgba(255,180,171,0.2)] text-[#ffb4ab]"
              : "bg-[rgba(210,167,255,0.08)] hover:bg-[rgba(210,167,255,0.15)] border-[rgba(210,167,255,0.2)] text-[#d3d7ff]"
      } disabled:opacity-50 active:scale-95`}
      title={
        isMaxedOut
          ? "Maximum limits reached"
          : `Send secure portal link to ${clientEmail}`
      }
    >
      {isPending ? (
        <span className="material-symbols-outlined text-[11px] animate-spin">
          sync
        </span>
      ) : status === "success" ? (
        <span className="material-symbols-outlined text-[11px]">check</span>
      ) : status === "error" ? (
        <span className="material-symbols-outlined text-[11px]">error</span>
      ) : (
        <span className="material-symbols-outlined text-[11px]">send</span>
      )}

      {/* ✨ NEW COUNTER DISPLAY */}
      <span>
        {isMaxedOut
          ? "LIMIT REACHED"
          : status === "success"
            ? "SENT"
            : "SEND LINK"}{" "}
        ({sentCount}/5)
      </span>
    </button>
  );
}
