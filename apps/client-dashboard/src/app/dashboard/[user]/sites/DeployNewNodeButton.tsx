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
    "px-8 py-3.5 rounded-2xl flex items-center gap-3 text-sm font-bold transition-colors";

  if (variant === "primary") {
    return (
      <button onClick={handleClick} className={`lilac-pink-btn ${baseClasses}`}>
        <span className="material-symbols-outlined">add</span>
        Deploy New Node
      </button>
    );
  }

  return (
    <button onClick={handleClick} className={`${baseClasses} lilac-pink-btn`}>
      <span className="material-symbols-outlined">add_circle</span>
      Initialize Node
    </button>
  );
}
