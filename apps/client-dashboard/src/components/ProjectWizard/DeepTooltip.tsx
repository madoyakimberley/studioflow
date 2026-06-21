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

      {/* Tooltip Content Card configured to use global variables */}
      <div className="absolute left-0 bottom-full mb-2 hidden w-72 p-3 text-xs text-theme-text bg-theme-surface border border-theme-outline rounded-xl shadow-2xl group-hover:block z-50 transition-all duration-200 font-sans">
        <div className="flex gap-2 items-start">
          <Info className="w-4 h-4 text-theme-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed font-medium">{text}</p>
        </div>
      </div>
    </div>
  );
};
