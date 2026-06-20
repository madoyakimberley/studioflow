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
    "px-8 py-3.5 rounded-2xl flex items-center gap-3 text-sm font-bold transition-all duration-300 active:scale-95 shadow-sm";

  if (variant === "primary") {
    return (
      <button
        onClick={handleClick}
        className={`${baseClasses} bg-theme-primary text-theme-on-primary hover:brightness-110 shadow-lg shadow-theme-primary/20 border border-theme-primary/10`}
      >
        <span className="material-symbols-outlined">add</span>
        Deploy New Node
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`${baseClasses} bg-theme-surface text-theme-text border border-theme-outline/50 hover:border-theme-primary/50 hover:bg-theme-primary/5`}
    >
      <span className="material-symbols-outlined">add_circle</span>
      Initialize Node
    </button>
  );
}
