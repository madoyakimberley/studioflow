// app/dashboard/clients-requests/page.tsx
import React from "react";
import { db } from "@studioflow/db";
import { desc, eq } from "drizzle-orm";
import { clientRequests, projects, clients } from "@studioflow/db";
import AdminChatWorkspace from "./AdminChatWorkspace";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default async function AdminClientRequestsOverview() {
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
    <main className="flex-1 p-4 lg:p-8 overflow-hidden flex flex-col h-screen">
      <div className="mb-6 shrink-0">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] text-[#958ea0] hover:text-[#adc6ff] mb-4 transition-all duration-300 group-hover:-translate-x-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Core Systems Overview
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e364a7] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e364a7]"></span>
          </span>
          <span className="text-[10px] font-mono font-bold text-[#e364a7] uppercase tracking-[0.2em]">
            Operational Inbound Queue
          </span>
        </div>
        <h1 className="text-3xl font-black font-['Playfair_Display',_serif] tracking-wider text-white">
          Client{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#adc6ff] to-[#a078ff]">
            Matrix
          </span>
        </h1>
      </div>

      {/* Mount the interactive WhatsApp-style client component */}
      <AdminChatWorkspace projectsData={projectsData} />
    </main>
  );
}
