"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  FolderGit2,
  BarChart3,
  Settings,
  Plus,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ProjectWizard from "./ProjectWizard";

export default function SidebarConsole() {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <>
      <aside className="w-64 bg-[#0b1326] border-r border-[#171f33] p-6 flex flex-col justify-between shrink-0">
        {/* Top Section: Logo and Navigation */}
        <div className="space-y-8">
          {/* Logo with Playfair Display font and design doc colors */}
          <div className="text-[#dae2fd] font-black font-['Playfair_Display',_serif] tracking-wider text-xl px-2">
            Studio<span className="text-[#adc6ff]">Flow</span>
          </div>

          <nav className="space-y-1">
            <Link
              href="/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#131b2e] text-[#d0bcff] text-xs font-bold transition"
            >
              <LayoutGrid className="w-4 h-4" /> Dashboard Overview
            </Link>
            <Link
              href="/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#131b2e] text-[#cbc3d7] hover:text-[#dae2fd] text-xs font-semibold transition"
            >
              <FolderGit2 className="w-4 h-4" /> Active Systems
            </Link>
            <Link
              href="/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#131b2e] text-[#cbc3d7] hover:text-[#dae2fd] text-xs font-semibold transition"
            >
              <BarChart3 className="w-4 h-4" /> Telemetry Statistics
            </Link>
            <Link
              href="/dashboard"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#131b2e] text-[#cbc3d7] hover:text-[#dae2fd] text-xs font-semibold transition"
            >
              <Settings className="w-4 h-4" /> Core Configs
            </Link>
          </nav>
        </div>

        {/* Bottom Section: Action Button and Version Info */}
        <div className="space-y-6">
          {/* Action Trigger Vector - Mutated Pink to Purple Gradient */}
          <div className="px-2">
            <button
              onClick={() => setWizardOpen(true)}
              className="w-full bg-gradient-to-r from-[#e364a7] via-[#d050c2] to-[#9d4edd] hover:brightness-110 active:scale-[0.98] text-white text-xs font-bold  tracking-wider font-['Playfair_Display',_serif] py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#d050c2]/25 transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> New Project
            </button>
          </div>

          <div className="border-t border-[#171f33] pt-4 text-[10px] font-mono text-[#958ea0] px-2">
            Node Engine v2.4.0
          </div>
        </div>
      </aside>

      {/* Global Framer Motion Overlay Layer */}
      <AnimatePresence>
        {wizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#060e20]/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-full max-w-6xl relative"
            >
              <ProjectWizard onClose={() => setWizardOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
