"use client";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut } from "lucide-react"; // ✨ NEW LUCIDE IMPORT
import ProjectWizard from "./ProjectWizard";
import ThemeModal from "./ThemeSelector";
import DevDashboardTourEngine from "./tour/DevDashboardTourEngine";

export default function SidebarConsole({
  userSlug = "user", // fallback only
}: {
  userSlug?: string;
}) {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false); // ✨ LOGOUT STATE

  const pathname = usePathname();
  const params = useParams();
  const router = useRouter(); // ✨ ROUTER FOR REDIRECT

  // Prioritize URL params over prop/localStorage
  const currentUser = (params?.user as string) || userSlug;

  const baseRoute = `/dashboard/${currentUser}`;

  useEffect(() => {
    // Automatically start tour if they haven't completed it
    const hasCompletedTour = localStorage.getItem("studioflow_tour_completed");
    if (!hasCompletedTour) {
      setTourActive(true);
    }
  }, []);

  const handleTourComplete = () => {
    setTourActive(false);
    localStorage.setItem("studioflow_tour_completed", "true");
  };

  const handleConfirmLogout = () => {
    setLogoutModalOpen(false);
    router.push("/welcome");
  };

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
    {
      href: `${baseRoute}/assets`,
      label: "Asset Vault",
      icon: "folder_zip",
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
      <DevDashboardTourEngine
        onboardingActive={tourActive}
        openWizardModal={() => setWizardOpen(true)}
        onTourComplete={handleTourComplete}
      />
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
          color: var(--color-theme-muted);
          border-left: 2px solid transparent;
          transition: all 0.3s ease;
          text-decoration: none;
          border-radius: 0 6px 6px 0;
        }

        .nav-link:hover {
          background-color: color-mix(in srgb, var(--color-theme-text) 5%, transparent);
          color: var(--color-theme-text);
        }

        .nav-link.active {
          background-color: color-mix(in srgb, var(--color-theme-primary) 10%, transparent);
          color: var(--color-theme-primary);
          border-left-color: var(--color-theme-primary);
        }

        .dynamic-btn {
          background: var(--color-theme-primary);
          color: var(--color-theme-on-primary);
          box-shadow: 0 0 20px color-mix(in srgb, var(--color-theme-primary) 30%, transparent);
        }

        .dynamic-btn:hover {
          opacity: 0.9;
        }
      `}</style>

      {/* ✨ Migrated to theme classes */}
      <aside className="w-[280px] h-full flex flex-col bg-theme-surface border-r border-theme-outline z-50 transition-colors duration-300">
        {/* ✨ Header: Contains Logo AND the ThemeModal Trigger */}
        <div className="p-8 pb-10 flex justify-between items-center">
          <div className="headline-sm text-theme-text flex items-center gap-3">
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

          {/* THE THEME SWITCHER UI WITH TOUR MARKER */}
          <div className="dev-theme-trigger">
            <ThemeModal />
          </div>
        </div>

        {/* NAVIGATION MATRIX TOUR MARKER */}
        <nav className="flex-1 px-4 space-y-1 custom-scrollbar overflow-y-auto dev-nav-matrix">
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

          {/* ✨ LOGOUT TRIGGER BUTTON */}
          <button
            onClick={() => setLogoutModalOpen(true)}
            className="nav-link w-full text-left mt-4 group"
          >
            <LogOut className="w-[18px] h-[18px] ml-0.5 text-red-500/70 group-hover:text-red-500 transition-colors" />
            <span className="label-caps group-hover:text-red-500 transition-colors">
              Log Out
            </span>
          </button>
        </nav>

        {/* Fixed New Project Button at Bottom WITH TOUR MARKER */}
        <div className="p-6 border-t border-theme-outline mt-auto dev-scaffold-trigger">
          <button
            onClick={() => setWizardOpen(true)}
            className="dynamic-btn w-full py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 label-caps font-bold shadow-lg"
          >
            <span className="material-symbols-outlined">add</span>
            <span>New Project</span>
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {/* WIZARD MODAL */}
        {wizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-theme-bg/90 backdrop-blur-md overflow-y-auto">
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

        {/* ✨ LOGOUT CONFIRMATION MODAL */}
        {logoutModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-theme-bg/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-theme-surface border border-theme-outline p-8 rounded-2xl max-w-sm w-full shadow-2xl flex flex-col items-center text-center relative"
            >
              <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-5">
                <LogOut className="w-6 h-6 text-red-500" />
              </div>

              <h3 className="headline-sm text-theme-text mb-2 text-xl">
                Terminate Session?
              </h3>

              <p className="text-theme-muted text-sm mb-8 leading-relaxed">
                Are you sure you want to log out? You will be redirected back to
                the welcome portal.
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setLogoutModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-theme-outline text-theme-muted hover:bg-theme-outline/20 hover:text-theme-text transition-colors label-caps font-bold tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLogout}
                  className="flex-1 py-3 rounded-xl bg-red-500/90 hover:bg-red-500 text-white transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)] label-caps font-bold tracking-wider"
                >
                  Log Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
