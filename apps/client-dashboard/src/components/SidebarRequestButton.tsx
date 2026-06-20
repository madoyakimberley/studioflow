"use client";

import React, { useState } from "react";
import NewRequestModal from "./NewRequestModal";

export default function SidebarRequestButton({
  projectId,
}: {
  projectId: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 px-4 bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] hover:brightness-110 text-theme-text rounded-xl text-sm font-bold transition-all shadow-[0_0_20px_rgba(217,70,239,0.2)]"
      >
        + New Request
      </button>

      {isOpen && (
        <NewRequestModal
          projectId={projectId}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
