"use server";

import { db, clientRequests, projects } from "@studioflow/db";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateRequestStatusAction(formData: FormData) {
  try {
    const requestId = Number(formData.get("requestId"));
    const newStatus = formData.get("status") as string;

    if (!requestId || !newStatus) {
      throw new Error("Missing required fields");
    }

    // 1. Update the request status in the database
    await db
      .update(clientRequests)
      .set({ status: newStatus })
      .where(eq(clientRequests.id, requestId));

    // 2. Fetch the associated project slug so we can update the Client's view
    const targetProject = await db
      .select({ slug: projects.slug })
      .from(clientRequests)
      .innerJoin(projects, eq(clientRequests.projectId, projects.id))
      .where(eq(clientRequests.id, requestId))
      .limit(1);

    // 3. Purge caches on both the Admin Dashboard AND the Client Portal!
    revalidatePath("/dashboard/clients-requests");

    if (targetProject.length > 0) {
      // This tells Next.js to instantly refresh the client's screen if they are looking at it
      revalidatePath(`/portal/${targetProject[0].slug}`);
    }

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update status:", error);
    return { success: false, error: error.message };
  }
}
