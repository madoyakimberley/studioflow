// app/dashboard/clients-requests/actions.ts
"use server";

import { db } from "@studioflow/db";
import { eq } from "drizzle-orm";
import { clientRequests } from "@studioflow/db";
import { revalidatePath } from "next/cache";

export async function updateRequestStatusAction(formData: FormData) {
  const requestId = Number(formData.get("requestId"));
  const newStatus = formData.get("status") as string;

  await db
    .update(clientRequests)
    .set({ status: newStatus })
    .where(eq(clientRequests.id, requestId));

  revalidatePath("/dashboard/clients-requests");
}
