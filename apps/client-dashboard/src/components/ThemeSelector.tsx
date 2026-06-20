"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Layers, Layout, Check, Palette, X } from "lucide-react";

// Professional, system-level naming conventions
const THEMES = [
  {
    id: "active-systems-light",
    sysName: "sys_radiant",
    name: "Radiant Light",
    icon: Sun,
  },
  {
    id: "night-matrix",
    sysName: "sys_matrix",
    name: "Night Matrix",
    icon: Moon,
  },
  {
    id: "aetheric-foundry",
    sysName: "sys_foundry_dk",
    name: "Foundry Dark",
    icon: Layers,
  },
  {
    id: "aetheric-foundry-light",
    sysName: "sys_foundry_lt",
    name: "Foundry Light",
    icon: Layout,
  },
];

export default function ThemeSelector() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="relative z-50">
      {/* THE TRIGGER ICON */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-xl bg-theme-surface border border-theme-outline text-theme-muted hover:text-theme-primary hover:border-theme-primary/50 hover:bg-theme-primary/5 shadow-sm transition-all flex items-center justify-center active:scale-95"
        title="Appearance Settings"
      >
        <Palette className="w-5 h-5" />
      </button>

      {/* THE MODAL OVERLAY */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-6">
          <div className="relative z-50 w-full max-w-4xl bg-theme-surface/95 backdrop-blur-2xl rounded-[2rem] overflow-hidden flex flex-col max-h-[95vh] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-theme-outline/50 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <header className="flex items-center justify-between px-8 py-6 border-b border-theme-outline/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center border border-theme-primary/20 shadow-inner">
                  <Palette className="text-theme-primary w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-xl text-theme-text tracking-tight">
                    Appearance Settings
                  </h2>
                  <p className="text-sm text-theme-muted mt-0.5">
                    Personalize your workspace environment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-theme-muted hover:bg-theme-bg hover:text-theme-text transition-all active:scale-95"
              >
                <X className="w-6 h-6" />
              </button>
            </header>

            {/* Modal Body: Theme Grid */}
            <div className="flex-1 overflow-y-auto px-8 py-8 scrollbar-hide bg-theme-bg/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {THEMES.map((t) => {
                  const isActive = theme === t.id;
                  const Icon = t.icon;

                  return (
                    <div
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`group relative p-6 rounded-2xl cursor-pointer transition-all duration-300 ${
                        isActive
                          ? "border border-theme-primary bg-theme-primary/5 shadow-[0_0_30px_-5px_var(--color-theme-primary)] ring-1 ring-theme-primary/30"
                          : "border border-theme-outline/40 bg-theme-surface hover:border-theme-primary/40 hover:bg-theme-surface/80 shadow-sm"
                      }`}
                    >
                      {/* Active Checkmark Badge */}
                      {isActive && (
                        <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-theme-primary text-theme-on-primary flex items-center justify-center shadow-lg z-10 animate-in zoom-in duration-200">
                          <Check className="w-4 h-4" strokeWidth={3} />
                        </div>
                      )}

                      {/* Micro-UI Preview container (Forced Theme Scope) */}
                      <div className="aspect-video w-full bg-theme-bg rounded-xl border border-theme-outline/30 mb-6 overflow-hidden relative shadow-inner">
                        <div
                          data-theme={t.id}
                          className="absolute inset-0 p-4 flex gap-3 pointer-events-none bg-theme-bg transition-colors duration-300"
                        >
                          {/* Mock Sidebar */}
                          <div className="w-1/4 h-full bg-theme-surface border border-theme-outline/50 rounded-lg flex flex-col gap-2.5 p-2.5 shadow-sm">
                            <div className="h-2.5 w-full bg-theme-primary/30 rounded-full mb-2"></div>
                            <div className="h-2 w-3/4 bg-theme-text/10 rounded-full"></div>
                            <div className="h-2 w-1/2 bg-theme-text/10 rounded-full"></div>
                            <div className="h-2 w-2/3 bg-theme-text/10 rounded-full"></div>
                          </div>

                          {/* Mock Main Content Area */}
                          <div className="flex-1 h-full flex flex-col gap-3">
                            {/* Header */}
                            <div className="w-full h-6 bg-theme-surface border border-theme-outline/50 rounded-lg shadow-sm"></div>

                            {/* Content Cards */}
                            <div className="flex gap-3 h-14">
                              <div className="flex-1 bg-theme-primary rounded-lg shadow-sm border border-theme-primary/20 relative overflow-hidden">
                                <div className="absolute bottom-1.5 right-1.5 w-2 h-2 bg-theme-on-primary/50 rounded-full"></div>
                              </div>
                              <div className="flex-1 bg-theme-surface rounded-lg shadow-sm border border-theme-outline/50"></div>
                            </div>

                            {/* Data row */}
                            <div className="w-full flex-1 bg-theme-surface border border-theme-outline/50 rounded-lg p-2.5 flex items-center justify-between shadow-sm">
                              <div className="h-1.5 w-1/3 bg-theme-text/20 rounded-full"></div>
                              <div className="h-3.5 w-10 bg-theme-secondary rounded-full"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Theme Label & Metadata */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p
                            className={`text-[10px] uppercase tracking-widest font-bold mb-1.5 transition-colors duration-300 ${isActive ? "text-theme-primary" : "text-theme-muted"}`}
                          >
                            System: {t.sysName}
                          </p>
                          <h3 className="text-lg font-semibold text-theme-text tracking-tight">
                            {t.name}
                          </h3>
                        </div>
                        <Icon
                          className={`w-6 h-6 transition-colors duration-300 ${isActive ? "text-theme-primary" : "text-theme-muted group-hover:text-theme-text"}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="px-8 py-6 bg-theme-surface border-t border-theme-outline/50 flex justify-end gap-4 rounded-b-[2rem]">
              <button
                onClick={() => setIsOpen(false)}
                className="px-8 py-3 rounded-xl text-sm font-bold tracking-wide border border-theme-outline text-theme-text hover:bg-theme-bg hover:text-theme-primary transition-all active:scale-95"
              >
                Close
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-8 py-3 rounded-xl text-sm font-bold tracking-wide bg-theme-primary text-theme-on-primary shadow-lg shadow-theme-primary/20 hover:shadow-theme-primary/40 transition-all active:scale-95"
              >
                Apply Configuration
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
