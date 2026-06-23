import React from "react";
import { db, clientRequests, projects, clients } from "@studioflow/db";
import { desc, eq } from "drizzle-orm";
import AdminChatWorkspace from "./AdminChatWorkspace";
import SidebarConsole from "../../../../components/SidebarConsole";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// Force dynamic rendering so the page never caches stale database data
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
    <div className="flex min-h-screen w-full bg-theme-bg text-theme-text transition-colors duration-200">
      <SidebarConsole userSlug={user} />

      <main className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-10">
          {/* Header navigation map context */}
          <div>
            <Link
              href={`/dashboard/${user}`}
              className="inline-flex items-center gap-2 mb-4 group cursor-pointer text-[12px] font-semibold tracking-[0.1em] text-theme-primary/70 hover:text-theme-primary transition-colors font-sans uppercase"
            >
              <ChevronLeft className="w-[18px] h-[18px] group-hover:-translate-x-1 transition-transform" />
              Back to Core Systems Overview
            </Link>

            <div className="flex items-center gap-3 mb-2">
              <span className="w-2 h-2 rounded-full bg-theme-secondary animate-pulse shadow-[0_0_8px_var(--color-theme-secondary)]"></span>
              <span className="text-[12px] font-bold font-sans text-theme-secondary uppercase tracking-[0.2em]">
                Operational Inbound Queue
              </span>
            </div>

            <h1 className="text-[48px] lg:text-[72px] leading-[1.1] font-bold font-['Playfair_Display',_serif] tracking-[-0.02em] text-theme-text">
              Client{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-theme-primary to-theme-secondary italic">
                Matrix
              </span>
            </h1>
            <p className="text-theme-muted max-w-xl text-sm leading-relaxed mt-3 font-sans">
              Live pipeline execution portal. Sync operational signals, chat
              logs, and map custom workflows across production node systems.
            </p>
          </div>

          {/* Interactive Workspace Panel */}
          <AdminChatWorkspace projectsData={projectsData} />
        </div>
      </main>
    </div>
  );
}
