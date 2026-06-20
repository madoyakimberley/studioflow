import React from "react";
import { Info } from "lucide-react";

export const DeepTooltip = ({
  children,
  text,
}: {
  children: React.ReactNode;
  text: string;
}) => {
  return (
    <div className="group relative flex items-center w-full">
      {children}
      <div className="absolute left-0 bottom-full mb-2 hidden w-72 p-3 text-xs text-theme-text bg-[var(--bg-surface)] border border-indigo-500/30 rounded-xl shadow-2xl shadow-indigo-900/20 group-hover:block z-50 transition-all duration-200">
        <div className="flex gap-2 items-start">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{text}</p>
        </div>
      </div>
    </div>
  );
};
