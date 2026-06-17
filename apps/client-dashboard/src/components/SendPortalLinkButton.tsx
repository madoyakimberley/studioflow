"use client";

import React, { useState, useTransition } from "react";
// Make sure you have your toast library installed (e.g., npm install react-hot-toast)
import toast from "react-hot-toast";
// UPDATE THIS IMPORT PATH based on where you put portal-actions.ts
import { sendClientPortalWelcomeAction } from "../app/portal-actions";

interface SendPortalLinkProps {
  clientEmail: string;
  projectSlug: string;
  projectName: string;
}

export default function SendPortalLinkButton({
  clientEmail,
  projectSlug,
  projectName,
}: SendPortalLinkProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSend = () => {
    // Dynamically grab the current domain so it works locally and on the live web
    const baseUrl =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://studioflow.dev";
    const portalLink = `${baseUrl}/portal/${projectSlug}`;

    startTransition(async () => {
      setStatus("idle");
      // Pop up a loading toast right away
      const toastId = toast.loading("Sending portal link...");

      try {
        const res = await sendClientPortalWelcomeAction(
          projectSlug,
          portalLink,
        );

        if (res.success) {
          setStatus("success");
          // Update the toast to show success and the remaining chances
          toast.success(res.message, { id: toastId, duration: 4000 });

          // Reset the button look after 3 seconds
          setTimeout(() => setStatus("idle"), 3000);
        } else {
          setStatus("error");
          // Update the toast to show the exact error (like the 60-second cooldown warning)
          toast.error(res.message, { id: toastId, duration: 5000 });

          setTimeout(() => setStatus("idle"), 3000);
        }
      } catch (e) {
        setStatus("error");
        toast.error("Something went wrong on our end.", { id: toastId });
        setTimeout(() => setStatus("idle"), 3000);
      }
    });
  };

  return (
    <button
      onClick={handleSend}
      disabled={isPending || status === "success"}
      className={`flex items-center gap-1.5 px-2 py-1 border text-[9px] font-bold uppercase tracking-wider transition-colors rounded-md ${
        status === "success"
          ? "bg-[rgba(167,255,180,0.08)] border-[rgba(167,255,180,0.2)] text-[#a7ffb4]"
          : status === "error"
            ? "bg-[rgba(255,180,171,0.08)] border-[rgba(255,180,171,0.2)] text-[#ffb4ab]"
            : "bg-[rgba(210,167,255,0.08)] hover:bg-[rgba(210,167,255,0.15)] border-[rgba(210,167,255,0.2)] text-[#d3d7ff]"
      } disabled:opacity-50`}
      title={`Send portal link to ${clientEmail || "client"}`}
    >
      {isPending ? (
        <span className="material-symbols-outlined text-[11px] animate-spin">
          sync
        </span>
      ) : status === "success" ? (
        <span className="material-symbols-outlined text-[11px]">
          check_circle
        </span>
      ) : status === "error" ? (
        <span className="material-symbols-outlined text-[11px]">error</span>
      ) : (
        <span className="material-symbols-outlined text-[11px]">mail</span>
      )}

      {isPending
        ? "Sending..."
        : status === "success"
          ? "Sent!"
          : status === "error"
            ? "Failed"
            : "Email to Client"}
    </button>
  );
}
