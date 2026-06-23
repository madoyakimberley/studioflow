import React from "react";
import Link from "next/link";
import SidebarConsole from "@/components/SidebarConsole";
import { DownloadEnvButton, CliSetupCard } from "./ClientConfigActions";

export const dynamic = "force-dynamic";

export default async function CoreConfigsPage({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;

  return (
    <div className="flex h-screen bg-[var(--color-theme-bg)] overflow-hidden font-['Plus_Jakarta_Sans',_sans-serif]">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-6xl mx-auto px-8 py-12">
          {/* Back Link */}
          <Link
            href={`/dashboard/${user}`}
            className="inline-flex items-center gap-2 text-[12px] font-semibold tracking-[0.1em] uppercase text-[var(--color-theme-muted)] hover:text-[var(--color-theme-primary)] mb-8 transition-colors group"
          >
            <span className="group-hover:-translate-x-1 transition-transform">
              ←
            </span>{" "}
            Back to Dashboard
          </Link>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <h1 className="text-5xl font-bold font-['Playfair_Display',_serif] tracking-tight text-[var(--color-theme-text)]">
                Core{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] italic">
                  Configurations
                </span>
              </h1>
              <p className="text-[var(--color-theme-muted)] mt-2 max-w-xl text-sm leading-relaxed">
                Manage global providers, API keys, and system integrations for
                the StudioFlow orchestrator.
              </p>
            </div>

            <DownloadEnvButton />
          </div>

          {/* Command Line Interface Section */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-2xl text-[var(--color-theme-primary)]">
                code_blocks
              </span>
              <h2 className="text-2xl font-bold font-['Playfair_Display',_serif] text-[var(--color-theme-text)]">
                Command Line Interface
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CliSetupCard />
            </div>
          </section>

          {/* Data & Storage Section */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-2xl text-[var(--color-theme-primary)]">
                database
              </span>
              <h2 className="text-2xl font-bold font-['Playfair_Display',_serif] text-[var(--color-theme-text)]">
                Data & Storage
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "TiDB / MySQL", key: "SECURE_NODE_••••••••••••" },
                { title: "Redis Cache", key: "SECURE_NODE_••••••••••••" },
                { title: "UploadThing", key: "SECURE_NODE_••••••••••••" },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md border border-[var(--color-theme-outline)]/20 shadow-lg rounded-2xl p-8 group relative overflow-hidden transition-all hover:border-[var(--color-theme-primary)]/30"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--color-theme-text)]">
                        {item.title}
                      </h3>
                      <p className="font-['JetBrains_Mono',_monospace] text-xs font-bold tracking-widest text-[var(--color-theme-muted)] mt-1">
                        {item.key}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[var(--color-theme-primary)] text-3xl">
                      check_circle
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-[var(--color-theme-outline)]/30 hover:bg-[var(--color-theme-surface)]/60 text-[var(--color-theme-text)] rounded-xl transition-all">
                      Verify Status
                    </button>
                    <button className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-[var(--color-theme-outline)]/30 hover:bg-[var(--color-theme-surface)]/60 text-[var(--color-theme-text)] rounded-xl transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                      Modify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cloud & Deployment Section */}
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-2xl text-[var(--color-theme-primary)]">
                cloud
              </span>
              <h2 className="text-2xl font-bold font-['Playfair_Display',_serif] text-[var(--color-theme-text)]">
                Cloud & Deployment
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Render API", status: "good" },
                { title: "GitHub PAT", status: "good" },
                { title: "Vercel Token", status: "warning" },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`bg-[var(--color-theme-surface)]/20 backdrop-blur-md shadow-lg rounded-2xl p-8 group relative overflow-hidden transition-all border ${
                    item.status === "warning"
                      ? "border-[var(--color-theme-secondary)]/40 bg-[var(--color-theme-secondary)]/5 hover:border-[var(--color-theme-secondary)]/60"
                      : "border-[var(--color-theme-outline)]/20 hover:border-[var(--color-theme-primary)]/30"
                  }`}
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--color-theme-text)]">
                        {item.title}
                      </h3>
                      <p className="font-['JetBrains_Mono',_monospace] text-xs font-bold tracking-widest text-[var(--color-theme-muted)] mt-1">
                        SECURE_NODE_••••••••••••
                      </p>
                    </div>
                    {item.status === "good" ? (
                      <span className="material-symbols-outlined text-[var(--color-theme-primary)] text-3xl">
                        check_circle
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-[var(--color-theme-secondary)] text-3xl animate-pulse">
                        warning
                      </span>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-[var(--color-theme-outline)]/30 hover:bg-[var(--color-theme-surface)]/60 text-[var(--color-theme-text)] rounded-xl transition-all">
                      Verify Status
                    </button>
                    <button className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-[var(--color-theme-outline)]/30 hover:bg-[var(--color-theme-surface)]/60 text-[var(--color-theme-text)] rounded-xl transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                      Modify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Notifications Section */}
          <section>
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-2xl text-[var(--color-theme-primary)]">
                mail
              </span>
              <h2 className="text-2xl font-bold font-['Playfair_Display',_serif] text-[var(--color-theme-text)]">
                Notifications
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {["SMTP Engine", "Resend / Nodemailer"].map((title, i) => (
                <div
                  key={i}
                  className="bg-[var(--color-theme-surface)]/20 backdrop-blur-md shadow-lg rounded-2xl p-8 group border border-[var(--color-theme-outline)]/20 hover:border-[var(--color-theme-primary)]/30 transition-all"
                >
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--color-theme-text)]">
                        {title}
                      </h3>
                      <p className="font-['JetBrains_Mono',_monospace] text-xs font-bold tracking-widest text-[var(--color-theme-muted)] mt-1">
                        SECURE_NODE_••••••••••••
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-[var(--color-theme-primary)] text-3xl">
                      check_circle
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-[var(--color-theme-outline)]/30 hover:bg-[var(--color-theme-surface)]/60 text-[var(--color-theme-text)] rounded-xl transition-all">
                      Verify Status
                    </button>
                    <button className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest border border-[var(--color-theme-outline)]/30 hover:bg-[var(--color-theme-surface)]/60 text-[var(--color-theme-text)] rounded-xl transition-all flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-sm">
                        edit
                      </span>
                      Modify
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
