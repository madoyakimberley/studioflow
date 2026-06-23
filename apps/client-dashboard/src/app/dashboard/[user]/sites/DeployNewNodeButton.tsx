"use client";

import React from "react";

interface DeployNewNodeButtonProps {
  variant?: "primary" | "secondary";
}

export default function DeployNewNodeButton({
  variant = "primary",
}: DeployNewNodeButtonProps) {
  const handleClick = () => {
    const event = new CustomEvent("openProjectWizard");
    window.dispatchEvent(event);
  };

  const baseClasses =
    "px-8 py-3.5 rounded-2xl flex items-center gap-3 text-[12px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 shadow-sm font-['Plus_Jakarta_Sans',_sans-serif]";

  if (variant === "primary") {
    return (
      <button
        onClick={handleClick}
        className={`${baseClasses} bg-[var(--color-theme-primary)] text-[var(--color-theme-on-primary)] hover:opacity-90 shadow-[0_0_20px_color-mix(in_srgb,var(--color-theme-primary)_30%,transparent)] border border-[var(--color-theme-primary)]/10`}
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Deploy New Node
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} bg-[var(--color-theme-surface)]/50 text-[var(--color-theme-text)] border border-[var(--color-theme-outline)]/30 hover:border-[var(--color-theme-primary)]/50 hover:bg-[var(--color-theme-primary)]/5`}
    >
      <span className="material-symbols-outlined text-[18px]">add_circle</span>
      Initialize Node
    </button>
  );
}
