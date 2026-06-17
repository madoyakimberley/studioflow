"use server";

import { db } from "@studioflow/db";
import { projectAssets, projects } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

export async function getProjectAssets(projectId: number) {
  if (!projectId || isNaN(projectId)) {
    return { success: false, data: [] };
  }
  try {
    const assets = await db
      .select()
      .from(projectAssets)
      .where(eq(projectAssets.projectId, projectId))
      .orderBy(desc(projectAssets.createdAt));
    return { success: true, data: assets };
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    return { success: false, data: [] };
  }
}

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
    // Format size for display (e.g., 1.5 MB)
    const formattedSize =
      data.fileSize > 1024 * 1024
        ? `${(data.fileSize / (1024 * 1024)).toFixed(1)} MB`
        : `${(data.fileSize / 1024).toFixed(1)} KB`;

    await db.insert(projectAssets).values({
      projectId: data.projectId,
      uploadedBy: data.uploadedBy,
      name: data.name,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
      fileSize: formattedSize,
    });

    revalidatePath(`/dashboard/projects/${data.projectId}/assets`);
    return { success: true };
  } catch (error) {
    console.error("Failed to save asset record:", error);
    return { success: false };
  }
}
