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
    <div className="flex h-screen overflow-hidden bg-theme-bg transition-colors duration-300">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 overflow-y-auto custom-scrollbar relative">
        <header className="h-auto min-h-14 py-3 px-4 md:px-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-outline/50 sticky top-0 bg-theme-bg/90 backdrop-blur-md z-40 transition-colors duration-300">
          <div className="flex-1 min-w-0 pt-0.5">
            <h1 className="text-lg md:text-xl font-bold font-serif text-theme-text break-words">
              Global Asset Matrix
            </h1>
            <p className="text-[10px] uppercase tracking-widest font-bold text-theme-muted mt-1 opacity-70 hidden md:block">
              Select a project to access its vault
            </p>
          </div>

          <div className="bg-theme-surface border border-theme-outline px-3 py-1.5 rounded-full flex items-center gap-2 whitespace-nowrap self-start sm:self-center shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-theme-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-theme-primary"></span>
            </span>
            <span className="font-mono text-theme-primary text-[10px] font-bold tracking-wide">
              Directory Matrix: Active
            </span>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
          {allProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-theme-surface border border-theme-outline/50 rounded-2xl shadow-sm">
              <span className="material-symbols-outlined text-theme-muted text-4xl mb-4">
                folder_off
              </span>
              <p className="text-sm text-theme-muted">
                No projects found in the matrix.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {allProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/${user}/assets/${project.id}`}
                  className="bg-theme-surface/80 border border-theme-outline/50 backdrop-blur-md p-5 md:p-6 rounded-2xl relative overflow-hidden group cursor-pointer flex flex-col h-full hover:border-theme-primary/50 hover:bg-theme-surface transition-all shadow-sm"
                >
                  {/* Recreated the glow-point using Tailwind radial gradients */}
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-[radial-gradient(circle,_var(--tw-gradient-stops))] from-theme-primary/20 to-transparent transition-opacity duration-300 opacity-50 group-hover:opacity-100 pointer-events-none z-0"></div>

                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div className="bg-theme-primary/10 border border-theme-primary/20 p-2 rounded-lg">
                      <span className="material-symbols-outlined text-theme-primary text-xl block">
                        folder_open
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-theme-muted opacity-60">
                      ID: {project.id}
                    </span>
                  </div>

                  <div className="relative z-10 flex-grow">
                    <h3 className="text-xl font-bold font-serif text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-secondary mb-2 line-clamp-2">
                      {project.name || "Unnamed Project"}
                    </h3>
                    <p className="text-xs text-theme-muted line-clamp-2">
                      Project initialized:{" "}
                      {project.createdAt
                        ? new Date(project.createdAt).toLocaleDateString()
                        : "Active"}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-1.5 text-theme-primary text-[11px] relative z-10 group-hover:translate-x-1 transition-transform">
                    <span className="text-[10px] uppercase tracking-widest font-bold">
                      Open Vault
                    </span>
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
  );
}
