import React from "react";
import { verifyPortalAccess } from "../../../portal-actions";
import { db } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { portalMessages } from "@studioflow/db";
import InteractiveChat from "./InteractiveChat";
import { notFound } from "next/navigation";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const authResult = await verifyPortalAccess(token);

  if (!authResult.success || !authResult.project) notFound();

  const project = authResult.project;

  // Fetch the actual message history from your database
  const initialMessages = await db
    .select()
    .from(portalMessages)
    .where(eq(portalMessages.projectId, project.id))
    .orderBy(desc(portalMessages.createdAt)) // Assuming you have a createdAt timestamp
    .limit(50); // Get recent messages

  // Reverse to show chronological order (oldest at top, newest at bottom)
  const orderedMessages = initialMessages.reverse();

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#0b1326] border border-[#171f33] rounded-2xl overflow-hidden shadow-2xl">
      {/* Chat Header (Static Context) */}
      <div className="p-4 border-b border-[#171f33] bg-[#0b1326] flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#9d4edd] to-[#e364a7] p-[2px]">
            <div className="w-full h-full bg-[#06070b] rounded-full overflow-hidden flex items-center justify-center">
              <span className="text-xs font-bold text-white">
                {project.client?.name?.substring(0, 2).toUpperCase() || "CL"}
              </span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {project.client?.name || "Client"}
            </h3>
            <p className="text-xs text-[#9d4edd] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9d4edd] animate-pulse" />{" "}
              Active Workspace
            </p>
          </div>
        </div>
      </div>

      {/* The Interactive Client Component */}
      <InteractiveChat
        projectId={project.id}
        initialMessages={orderedMessages}
      />
    </div>
  );
}
