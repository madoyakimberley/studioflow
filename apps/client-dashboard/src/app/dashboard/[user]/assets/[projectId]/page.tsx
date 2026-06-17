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
  // Await params to unwrap the dynamic routing parameters
  const { user, projectId } = await params;

  // 1. Resolve context directly from routing paths cleanly
  const currentProjectId = Number(projectId);

  // Safety Matrix: Catch malformed URL parameters
  if (isNaN(currentProjectId)) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0c0f16] text-white font-mono">
        🚨 [ROUTING EXCEPTION]: Invalid Project ID Matrix Parameter.
      </div>
    );
  }

  // 2. Fetch exact project context
  const projectContext = await db.query.projects.findFirst({
    where: eq(projects.id, currentProjectId),
  });

  // Safety Matrix: Catch non-existent projects
  if (!projectContext) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#0c0f16] text-white font-mono gap-4 px-6 text-center">
        <span className="text-red-400 text-xl font-bold">
          🚨 [RESOURCE EXCEPTION]: Isolated Project Not Found.
        </span>
        <span className="text-sm text-[#94a3b8] bg-[#1d2027] px-4 py-2 rounded-md">
          Diagnostic: Project ID {currentProjectId} does not exist in the vault
          matrix.
        </span>
      </div>
    );
  }

  // 3. Fetch all related assets for this project securely on the server
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        body {
          background-color: #0c0f16;
          color: #e0e2ec;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }

        .material-symbols-outlined {
          font-family: 'Material Symbols Outlined';
          font-weight: normal;
          font-style: normal;
          font-size: 18px;
          display: inline-block;
          line-height: 1;
          text-transform: none;
          letter-spacing: normal;
          word-wrap: normal;
          white-space: nowrap;
          direction: ltr;
        }

        .glass-card {
          background: rgba(20, 24, 36, 0.35);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(175, 186, 255, 0.08);
        }

        .glass-card:hover {
          border-color: rgba(175, 186, 255, 0.18);
        }

        .lilac-gradient {
          background: linear-gradient(135deg, #d3d7ff 0%, #e8b3ff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .headline-lg {
          font-family: 'Playfair Display', serif;
          font-size: 26px;
          font-weight: 600;
          line-height: 1.2;
          letter-spacing: -0.01em;
        }

        .headline-sm {
          font-family: 'Playfair Display', serif;
          font-size: 18px;
          font-weight: 500;
          line-height: 1.3;
        }

        .label-caps {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 9px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .body-md {
          font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 13px;
          font-weight: 400;
          line-height: 1.5;
        }

        .mono-code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 400;
          line-height: 1.5;
        }

        .glow-point {
          position: absolute;
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, rgba(232, 179, 255, 0.06) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(175, 186, 255, 0.15);
          border-radius: 10px;
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          opacity: 0.02;
          pointer-events: none;
          background-image: radial-gradient(#afbaff 0.5px, transparent 0.5px);
          background-size: 24px 24px;
        }

        .status-badge {
          font-size: 9px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding: 0.2rem 0.5rem;
          border-radius: 0.375rem;
        }

        .status-active {
          background-color: rgba(210, 167, 255, 0.08);
          color: #d3d7ff;
        }

        .status-paused {
          background-color: rgba(255, 202, 245, 0.08);
          color: #ffcaf5;
        }

        .status-unhealthy {
          background-color: rgba(255, 180, 171, 0.08);
          color: #ffb4ab;
        }
      `}</style>

      <div className="flex h-screen overflow-hidden bg-[#0c0f16]">
        {/* Keeping the SideBar identical */}
        <SidebarConsole userSlug={user} />

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <header className="h-auto min-h-14 py-3 px-4 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(175,186,255,0.1)] sticky top-0 bg-[#0c0f16]/90 backdrop-blur-md z-40">
            <div className="flex-1 min-w-0 pt-0.5">
              <h1 className="headline-lg text-[#e0e2ec] text-sm sm:text-base md:text-lg break-words">
                Development Asset Gateway
              </h1>
              <p className="label-caps text-[8px] text-[#94a3b8] mt-1 opacity-70 hidden md:block">
                Project Matrix: {projectContext.name}
              </p>
            </div>

            <div className="glass-card px-2.5 py-1 rounded-full flex items-center gap-2 text-[11px] whitespace-nowrap self-start sm:self-center">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#afbaff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#afbaff]"></span>
              </span>
              <span className="mono-code text-[#afbaff] text-[10px]">
                Bi-Directional Sync: Secure
              </span>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
            {/* The Metric Blocks adapted from your Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-8 md:mb-10">
              <div className="glass-card p-4 md:p-5 rounded-xl relative overflow-hidden group">
                <div className="glow-point -top-10 -right-10"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[#c6c5d1] mb-2 opacity-80">
                    Total Vault Records
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="headline-lg lilac-gradient text-2xl md:text-3xl">
                      {fetchedAssets.length}
                    </span>
                    <span
                      className="material-symbols-outlined text-[#d3d7ff] text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      source
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-[#d3d7ff]/70 text-[11px]">
                    <span className="material-symbols-outlined text-[11px]">
                      subdirectory_arrow_right
                    </span>
                    <p className="body-md italic text-[11px]">
                      Assets registered across both endpoints
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 md:p-5 rounded-xl relative overflow-hidden group">
                <div className="glow-point -bottom-10 -left-10 opacity-50"></div>
                <div className="flex flex-col h-full relative z-10">
                  <h3 className="label-caps text-[#c6c5d1] mb-2 opacity-80">
                    Client Payload Drops
                  </h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="headline-lg lilac-gradient text-2xl md:text-3xl">
                      {clientUploadsCount}
                    </span>
                    <span
                      className="material-symbols-outlined text-[#e8b3ff] text-lg"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      file_download
                    </span>
                  </div>
                  <div className="mt-auto flex items-center gap-1.5 text-[#e8b3ff]/70 text-[11px]">
                    <span className="material-symbols-outlined text-[11px]">
                      subdirectory_arrow_right
                    </span>
                    <p className="body-md italic text-[11px]">
                      Files originating from external client portal
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Render the Interactive Upload & Grid Component */}
            <AssetVaultClient
              initialAssets={JSON.parse(JSON.stringify(fetchedAssets))} // Safely stringifies Dates for the client component
              projectId={currentProjectId}
              userRole="admin"
            />
          </div>
        </main>
      </div>
    </>
  );
}
