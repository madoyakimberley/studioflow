import React from "react";
import Link from "next/link";
import { db, projects } from "@studioflow/db";
import SidebarConsole from "../../../../components/SidebarConsole"; // Adjust import path

export const dynamic = "force-dynamic";

export default async function ProjectsAssetDirectory({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  const { user } = await params;

  // Fetch ALL projects to display in the directory
  const allProjects = await db.query.projects.findMany();

  return (
    <>
      {/* Retaining your exact styling system */}
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
          transition: all 0.2s ease-in-out;
        }

        .glass-card:hover {
          border-color: rgba(175, 186, 255, 0.25);
          background: rgba(30, 36, 54, 0.45);
          transform: translateY(-2px);
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
      `}</style>

      <div className="flex h-screen overflow-hidden bg-[#0c0f16]">
        <SidebarConsole userSlug={user} />

        <main className="flex-1 overflow-y-auto custom-scrollbar relative">
          <header className="h-auto min-h-14 py-3 px-4 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(175,186,255,0.1)] sticky top-0 bg-[#0c0f16]/90 backdrop-blur-md z-40">
            <div className="flex-1 min-w-0 pt-0.5">
              <h1 className="headline-lg text-[#e0e2ec] text-sm sm:text-base md:text-lg break-words">
                Global Asset Matrix
              </h1>
              <p className="label-caps text-[8px] text-[#94a3b8] mt-1 opacity-70 hidden md:block">
                Select a project to access its vault
              </p>
            </div>

            <div className="glass-card px-2.5 py-1 rounded-full flex items-center gap-2 text-[11px] whitespace-nowrap self-start sm:self-center">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#afbaff] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#afbaff]"></span>
              </span>
              <span className="mono-code text-[#afbaff] text-[10px]">
                Directory Matrix: Active
              </span>
            </div>
          </header>

          <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
            {allProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 glass-card rounded-xl">
                <span className="material-symbols-outlined text-[#94a3b8] text-4xl mb-4">
                  folder_off
                </span>
                <p className="body-md text-[#94a3b8]">
                  No projects found in the matrix.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {allProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/${user}/assets/${project.id}`}
                    className="glass-card p-5 md:p-6 rounded-xl relative overflow-hidden group cursor-pointer flex flex-col h-full"
                  >
                    <div className="glow-point -top-10 -right-10 transition-opacity duration-300 opacity-50 group-hover:opacity-100"></div>

                    <div className="flex items-start justify-between mb-4 relative z-10">
                      <div className="bg-[rgba(175,186,255,0.08)] p-2 rounded-lg">
                        <span className="material-symbols-outlined text-[#afbaff]">
                          folder_open
                        </span>
                      </div>
                      <span className="label-caps text-[#c6c5d1] opacity-60">
                        ID: {project.id}
                      </span>
                    </div>

                    <div className="relative z-10 flex-grow">
                      <h3 className="headline-lg lilac-gradient text-xl mb-2 line-clamp-2">
                        {project.name || "Unnamed Project"}
                      </h3>
                      <p className="body-md text-[#94a3b8] line-clamp-2 text-[12px]">
                        Project initialized:{" "}
                        {project.createdAt
                          ? new Date(project.createdAt).toLocaleDateString()
                          : "Active"}
                      </p>
                    </div>

                    <div className="mt-6 flex items-center gap-1.5 text-[#d3d7ff] text-[11px] relative z-10 group-hover:translate-x-1 transition-transform">
                      <span className="label-caps">Open Vault</span>
                      <span className="material-symbols-outlined text-[14px]">
                        arrow_forward
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
