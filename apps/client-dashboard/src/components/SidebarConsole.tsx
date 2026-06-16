"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import ProjectWizard from "./ProjectWizard";

export default function SidebarConsole({
  userSlug = "luna", // fallback only
}: {
  userSlug?: string;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const pathname = usePathname();
  const params = useParams();

  // Prioritize URL params over prop/localStorage
  const currentUser = (params?.user as string) || userSlug;

  const baseRoute = `/dashboard/${currentUser}`;

  const navItems = [
    {
      href: baseRoute,
      label: "Overview",
      icon: "grid_view",
    },
    {
      href: `${baseRoute}/projects`,
      label: "Active Systems",
      icon: "settings_input_component",
    },
    {
      href: `${baseRoute}/sites`,
      label: "Live Nodes",
      icon: "hub",
    },
    {
      href: `${baseRoute}/alerts`,
      label: "System Alerts",
      icon: "warning",
    },
    {
      href: `${baseRoute}/settings`,
      label: "Core Configs",
      icon: "terminal",
    },
    {
      href: `${baseRoute}/clients-requests`,
      label: "Client Requests Queue",
      icon: "queue_play_next",
    },
  ];

  const isActive = (href: string) => {
    if (href === baseRoute) {
      return pathname === href || pathname === `${baseRoute}/`;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 24px;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          color: #c6c5d1;
          border-left: 2px solid transparent;
          transition: all 0.3s ease;
          text-decoration: none;
          border-radius: 0 6px 6px 0;
        }

        .nav-link:hover {
          background-color: rgba(255, 255, 255, 0.05);
          color: #e0e2ec;
        }

        .nav-link.active {
          background-color: rgba(175, 186, 255, 0.1);
          color: #d3d7ff;
          border-left-color: #d3d7ff;
        }

        .lilac-pink-btn {
          background: linear-gradient(90deg, #d3d7ff 0%, #ecb6e2 100%);
          box-shadow: 0 0 20px rgba(236, 182, 226, 0.3);
          color: #1f2b67;
        }

        .lilac-pink-btn:hover {
          opacity: 0.9;
        }
      `}</style>

      <aside className="w-[280px] h-full flex flex-col bg-[#0b0e15] border-r border-[rgba(175,186,255,0.15)] z-50">
        <div className="p-8 pb-16">
          <div className="headline-sm text-[#e0e2ec] flex items-center gap-3">
            <div className="relative h-6 w-6 flex-shrink-0">
              <Image
                src="/images/logo.jpg"
                alt="StudioFlow Logo"
                fill
                sizes="24px"
                priority
                className="object-contain"
              />
            </div>
            <span className="font-bold">StudioFlow</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 custom-scrollbar overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive(item.href) ? "active" : ""}`}
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {item.icon}
              </span>
              <span className="label-caps">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Fixed New Project Button at Bottom */}
        <div className="p-6 border-t border-[rgba(175,186,255,0.15)] mt-auto">
          <button
            onClick={() => setWizardOpen(true)}
            className="lilac-pink-btn w-full py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 label-caps font-bold shadow-lg"
          >
            <span className="material-symbols-outlined">add</span>
            <span>New Project</span>
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {wizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#030407]/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.2 }}
            >
              <ProjectWizard onClose={() => setWizardOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
