import React from "react";
import { db, projectAssets, projects } from "@studioflow/db";
import { desc, eq } from "drizzle-orm";
import SidebarConsole from "../../../../../components/SidebarConsole"; // Adjust import path
import AssetVaultClient from "../../../../../components/AssetVaultClient"; // Adjust import path

export const dynamic = "force-dynamic";

export default async function DevAssetDashboard({
  params,
}: {
  params: Promise<{ user: string; projectId: string }>;
}) {
  const { user, projectId } = await params;
  const currentProjectId = Number(projectId);

  if (isNaN(currentProjectId)) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-theme-bg)] text-[var(--color-theme-text)] font-mono">
        🚨 [ROUTING EXCEPTION]: Invalid Project ID Matrix Parameter.
      </div>
    );
  }

  const projectContext = await db.query.projects.findFirst({
    where: eq(projects.id, currentProjectId),
  });

  if (!projectContext) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--color-theme-bg)] text-[var(--color-theme-text)] font-mono gap-4 px-6 text-center">
        <span className="text-red-400 text-xl font-bold">
          🚨 [RESOURCE EXCEPTION]: Isolated Project Not Found.
        </span>
        <span className="text-sm text-[var(--color-theme-muted)] bg-[var(--color-theme-surface)] px-4 py-2 rounded-md">
          Diagnostic: Project ID {currentProjectId} does not exist in the vault
          matrix.
        </span>
      </div>
    );
  }

  const fetchedAssets = await db
    .select()
    .from(projectAssets)
    .where(eq(projectAssets.projectId, currentProjectId))
    .orderBy(desc(projectAssets.createdAt));

  const clientUploadsCount = fetchedAssets.filter(
    (a) => a.uploadedBy === "client",
  ).length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        /* Typography Mapping to match the specific high-end aesthetic */
        .headline-lg { font-family: 'Playfair Display', serif; font-weight: 600; letter-spacing: -0.01em; }
        .headline-sm { font-family: 'Playfair Display', serif; font-weight: 500; }
        .body-md { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 400; }
        .mono-code { font-family: 'JetBrains Mono', monospace; font-weight: 400; }
        .label-caps { font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }

        /* Themed Glass & Atmosphere Elements mapped strictly to globals.css variables */
        .glow-background {
          position: fixed;
          width: 100vw;
          height: 100vh;
          top: 0;
          left: 0;
          z-index: 0;
          pointer-events: none;
          background: radial-gradient(circle at 50% -20%, rgba(var(--color-theme-primary), 0.08) 0%, transparent 70%),
                      radial-gradient(circle at 10% 100%, rgba(var(--color-theme-secondary), 0.05) 0%, transparent 50%);
        }

        .glass-card {
          background: var(--color-theme-surface);
          backdrop-filter: blur(24px);
          border: 1px solid color-mix(in srgb, var(--color-theme-outline) 15%, transparent);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .glass-card:hover {
          border-color: color-mix(in srgb, var(--color-theme-secondary) 40%, transparent);
          box-shadow: 0 0 30px color-mix(in srgb, var(--color-theme-secondary) 10%, transparent);
          transform: translateY(-2px);
        }

        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: var(--color-theme-outline); border-radius: 10px; }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-[var(--color-theme-bg)] relative">
        <div className="glow-background"></div>

        <div className="relative z-10 flex w-full">
          <SidebarConsole userSlug={user} />

          <main className="flex-1 overflow-y-auto custom-scrollbar relative">
            {/* Minimalist Tech Header */}
            <header className="sticky top-0 h-16 px-6 md:px-8 flex items-center justify-between border-b border-[var(--color-theme-outline)]/10 backdrop-blur-md bg-[var(--color-theme-bg)]/60 z-40">
              <div className="flex-1 min-w-0">
                {/* Optional search/nav slot if needed */}
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center bg-[var(--color-theme-surface)]/80 px-4 py-1.5 rounded-full border border-[var(--color-theme-outline)]/20 shadow-sm">
                  <span className="relative flex h-2 w-2 mr-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-theme-secondary)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-theme-secondary)]"></span>
                  </span>
                  <span className="label-caps text-[9px] tracking-widest text-[var(--color-theme-muted)]">
                    Bi-Directional Sync: Secure
                  </span>
                </div>
              </div>
            </header>

            <div className="max-w-[1200px] mx-auto px-6 md:px-8 py-10 md:py-16 space-y-12">
              {/* Page Header Area */}
              <div className="space-y-3">
                <h2 className="headline-lg text-4xl md:text-5xl text-[var(--color-theme-text)]">
                  Development Asset Gateway
                </h2>
                <div className="flex items-center gap-4 text-[var(--color-theme-muted)]/80">
                  <span className="mono-code text-xs tracking-tighter uppercase">
                    PROJECT MATRIX: {projectContext.name}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-[var(--color-theme-outline)]"></span>
                  <span className="label-caps text-[9px] uppercase tracking-widest text-[var(--color-theme-primary)]">
                    Node Instance: 0x
                    {currentProjectId.toString(16).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* High-End Bento Dashboard Metrics */}
              <div className="grid grid-cols-12 gap-6 md:gap-8">
                {/* Stat Card 1 */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4 glass-card rounded-2xl p-8 flex flex-col justify-between h-56 bg-[var(--color-theme-surface)]/30">
                  <div>
                    <span className="label-caps text-[10px] text-[var(--color-theme-muted)] uppercase tracking-widest block mb-4">
                      Total Vault Records
                    </span>
                    <div className="flex items-end gap-4 mt-2">
                      <span className="headline-lg text-5xl text-[var(--color-theme-primary)] leading-none">
                        {fetchedAssets.length}
                      </span>
                      <span
                        className="material-symbols-outlined text-[var(--color-theme-secondary)] text-3xl mb-1"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        folder_special
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-theme-muted)]/80">
                    <span className="material-symbols-outlined text-sm">
                      subdirectory_arrow_right
                    </span>
                    <p className="text-xs body-md italic">
                      Assets registered across both endpoints
                    </p>
                  </div>
                </div>

                {/* Stat Card 2 */}
                <div className="col-span-12 md:col-span-6 lg:col-span-4 glass-card rounded-2xl p-8 flex flex-col justify-between h-56 bg-[var(--color-theme-surface)]/30">
                  <div>
                    <span className="label-caps text-[10px] text-[var(--color-theme-muted)] uppercase tracking-widest block mb-4">
                      Client Payload Drops
                    </span>
                    <div className="flex items-end gap-4 mt-2">
                      <span className="headline-lg text-5xl text-[var(--color-theme-primary)] leading-none">
                        {clientUploadsCount}
                      </span>
                      <span
                        className="material-symbols-outlined text-[var(--color-theme-secondary)] text-3xl mb-1"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        cloud_download
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--color-theme-muted)]/80">
                    <span className="material-symbols-outlined text-sm">
                      subdirectory_arrow_right
                    </span>
                    <p className="text-xs body-md italic">
                      Files originating from external client portal
                    </p>
                  </div>
                </div>
              </div>

              {/* The Enhanced Dropzone & Table */}
              <div className="pb-16">
                <AssetVaultClient
                  initialAssets={JSON.parse(JSON.stringify(fetchedAssets))}
                  projectId={currentProjectId}
                  userRole="admin"
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
