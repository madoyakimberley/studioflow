"use server";

import { db } from "@studioflow/db";
import { projectAssets, projects } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getTenantDb } from "@/lib/tenant-db";

// ==========================================
// 1. RESOLVE PROJECT ID BY SLUG (Central Registry)
// ==========================================
export async function getProjectIdBySlug(slug: string) {
  if (!slug) return null;

  try {
    const result = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, slug))
      .limit(1);

    return result[0]?.id || null;
  } catch (error) {
    console.error("Failed to fetch project ID by slug:", error);
    return null;
  }
}

// ==========================================
// 2. FETCH PROJECT ASSETS (Tenant-Isolated)
// ==========================================
export async function getProjectAssets(projectId: number) {
  if (!projectId || isNaN(projectId)) {
    return { success: false, data: [] };
  }

  try {
    // Find which workspace owns this project
    const project = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)
      .then((res) => res[0]);

    if (!project || !project.workspaceId) {
      console.warn(
        `⚠️ [ASSET ROUTING FAILURE]: Project ${projectId} has no workspace mapping.`,
      );
      return { success: false, data: [] };
    }

    const tenantDb = await getTenantDb(project.workspaceId);

    const assets = await tenantDb
      .select()
      .from(projectAssets)
      .where(eq(projectAssets.projectId, projectId))
      .orderBy(desc(projectAssets.createdAt));

    return { success: true, data: assets };
  } catch (error) {
    console.error("Failed to fetch assets from tenant DB:", error);
    return { success: false, data: [] };
  }
}

// ==========================================
// 3. SAVE PROJECT ASSET (Tenant-Isolated)
// ==========================================
export async function saveProjectAsset(data: {
  projectId: number;
  uploadedBy: "admin" | "client";
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}) {
  if (!data.projectId || isNaN(data.projectId)) {
    return { success: false, error: "Invalid Project ID" };
  }

  try {
    // Resolve workspace for tenant routing
    const project = await db
      .select({ workspaceId: projects.workspaceId })
      .from(projects)
      .where(eq(projects.id, data.projectId))
      .limit(1)
      .then((res) => res[0]);

    if (!project || !project.workspaceId) {
      return {
        success: false,
        error: "Target project workspace registry context lost.",
      };
    }

    // Format file size for human readability
    const formattedSize =
      data.fileSize > 1024 * 1024
        ? `${(data.fileSize / (1024 * 1024)).toFixed(1)} MB`
        : `${(data.fileSize / 1024).toFixed(1)} KB`;

    const tenantDb = await getTenantDb(project.workspaceId);

    await tenantDb.insert(projectAssets).values({
      projectId: data.projectId,
      uploadedBy: data.uploadedBy,
      name: data.name,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileSize: formattedSize,
      createdAt: new Date(),
    });

    // Revalidate relevant paths
    revalidatePath(`/dashboard/projects/${data.projectId}/assets`);
    revalidatePath(`/dashboard`, "layout");

    return { success: true };
  } catch (error: any) {
    console.error("Failed to save asset into tenant DB:", error);
    return {
      success: false,
      error:
        error.message || "An unexpected error occurred while saving the asset.",
    };
  }
}
