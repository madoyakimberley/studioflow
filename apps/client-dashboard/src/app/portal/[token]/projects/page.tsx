import React from "react";
import {
  verifyPortalAccess,
  getLiveProjectStatus,
} from "../../../portal-actions";
import { notFound } from "next/navigation";
import ProjectsClientMatrix from "./ProjectsClientMatrix";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // 1. Authenticate the slug token
  const authResult = await verifyPortalAccess(token);
  if (!authResult.success || !authResult.project) {
    notFound();
  }

  // 2. Fetch the initial payload from our massive DB action
  const livePayload = await getLiveProjectStatus(authResult.project.id);

  if (!livePayload.success || !livePayload.data) {
    return (
      <div className="flex items-center justify-center h-64 text-rose-400 border border-rose-500/30 bg-rose-500/10 rounded-2xl max-w-2xl mx-auto shadow-inner">
        Fatal Error: Failed to initialize project data streams.
      </div>
    );
  }

  // 3. Render the dynamic Client Matrix
  return (
    <ProjectsClientMatrix
      projectId={authResult.project.id}
      liveUrl={authResult.project.liveUrl}
      initialData={livePayload.data}
    />
  );
}
