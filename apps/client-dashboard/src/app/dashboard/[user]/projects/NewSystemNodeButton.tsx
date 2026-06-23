"use client";

import React from "react";

export default function NewSystemButton() {
  const handleClick = () => {
    // This will trigger the modal from SidebarConsole
    const event = new CustomEvent("openProjectWizard");
    window.dispatchEvent(event);
  };

  return (
    <button
      onClick={handleClick}
      className="bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] px-8 py-4 rounded-2xl flex items-center gap-3 text-sm font-bold mt-6 md:mt-0 text-[var(--color-theme-on-primary)] transition-all hover:opacity-90 shadow-[0_0_15px_color-mix(in_srgb,var(--color-theme-outline)_20%,transparent)] font-['Plus_Jakarta_Sans',_sans-serif] uppercase tracking-wider"
    >
      <span className="material-symbols-outlined">add</span>
      New System Node
    </button>
  );
}
