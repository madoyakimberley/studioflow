"use server";

import { db } from "@studioflow/db";
import { projectAssets } from "@studioflow/db";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function getProjectAssets(projectId: number) {
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
