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
      className="lilac-pink-btn px-8 py-4 rounded-2xl flex items-center gap-3 text-sm font-bold mt-6 md:mt-0"
    >
      <span className="material-symbols-outlined">add</span>
      New System Node
    </button>
  );
}
