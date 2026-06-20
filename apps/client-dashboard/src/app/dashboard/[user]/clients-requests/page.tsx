import React from "react";
import { db, clientRequests, projects, clients } from "@studioflow/db";
import { desc, eq } from "drizzle-orm";
import AdminChatWorkspace from "./AdminChatWorkspace";
import SidebarConsole from "../../../../components/SidebarConsole";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// FIX: Force dynamic rendering so the page never caches stale database data
export const dynamic = "force-dynamic";

export default async function AdminClientRequestsOverview({
  params,
}: {
  params: Promise<{ user: string }>;
}) {
  // Extract user from params
  const { user } = await params;

  // 1. Fetch all projects and their associated clients
  const rawProjects = await db
    .select({
      project: projects,
      client: clients,
    })
    .from(projects)
    .leftJoin(clients, eq(projects.clientId, clients.id));

  // 2. Fetch all active requests
  const allRequests = await db
    .select()
    .from(clientRequests)
    .orderBy(desc(clientRequests.id));

  // 3. Format the data for the client component
  const projectsData = rawProjects.map((row) => ({
    ...row.project,
    client: row.client,
    requests: allRequests.filter((req) => req.projectId === row.project.id),
  }));

  return (
    <div className="flex min-h-screen w-full bg-[#10131a]">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 p-8 lg:px-16 lg:py-12 overflow-hidden flex flex-col h-screen relative">
        {/* Luminous Depth / Radial Glows */}
        <div className="absolute top-[-200px] left-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(232,179,255,0.08)_0%,rgba(232,179,255,0)_70%)] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(232,179,255,0.08)_0%,rgba(232,179,255,0)_70%)] pointer-events-none z-0"></div>

        <div className="max-w-[1200px] mx-auto w-full flex flex-col h-full z-10 relative">
          <div className="mb-12 shrink-0">
            <Link
              href={`/dashboard/${user}`}
              className="inline-flex items-center gap-2 mb-4 group cursor-pointer text-[12px] font-semibold tracking-[0.1em] text-[var(--color-theme-primary)]/70 hover:text-[var(--color-theme-primary)] transition-colors font-['Plus_Jakarta_Sans',_sans-serif] uppercase"
            >
              <ChevronLeft className="w-[18px] h-[18px] group-hover:-translate-x-1 transition-transform" />
              Back to Core Systems Overview
            </Link>

            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 rounded-full bg-[var(--color-theme-secondary)] animate-pulse shadow-[0_0_8px_rgba(248,193,238,0.5)]"></span>
              <span className="text-[12px] font-bold font-['Plus_Jakarta_Sans',_sans-serif] text-[var(--color-theme-secondary)] uppercase tracking-[0.2em]">
                Operational Inbound Queue
              </span>
            </div>

            <h1 className="text-[48px] lg:text-[72px] leading-[1.1] font-bold font-['Playfair_Display',_serif] tracking-[-0.02em] text-[var(--text-main)]">
              Client{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-theme-primary)] to-[var(--color-theme-secondary)] italic">
                Matrix
              </span>
            </h1>
          </div>

          {/* Mount the interactive client component */}
          <AdminChatWorkspace projectsData={projectsData} />
        </div>
      </main>
    </div>
  );
}
