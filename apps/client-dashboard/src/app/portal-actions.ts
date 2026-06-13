"use server";

import { db } from "@studioflow/db";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  clients,
  projects,
  portalMessages,
  clientRequests,
  provisioningJobs,
  chatPresence, // <-- Added for typing indicators
} from "@studioflow/db";

// 1. Verify token securely and grab workspace info
export async function verifyPortalAccess(token: string) {
  try {
    // FIX: Using the standard query builder to avoid 'LATERAL' join crashes
    const result = await db
      .select({
        project: projects,
        client: clients,
      })
      .from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(eq(projects.slug, token))
      .limit(1);

    if (!result || result.length === 0) {
      return { success: false, error: "Access token is invalid." };
    }

    // Reconstruct the nested object shape expected by the frontend UI
    const projectRecord = {
      ...result[0].project,
      client: result[0].client,
    };

    return { success: true, project: projectRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 2. Stream/Send a WhatsApp style message
export async function sendPortalMessage(
  projectId: number,
  sender: "client" | "admin",
  content: string,
) {
  if (!content.trim()) return { success: false };

  await db.insert(portalMessages).values({
    projectId,
    sender,
    content: content.trim(),
  });

  revalidatePath(`/portal/${projectId}`);
  return { success: true };
}

// 3. File a new request from the client workspace
export async function submitClientRequest(
  projectId: number,
  title: string,
  description: string,
) {
  if (!title || !description)
    return { success: false, error: "Missing fields" };

  await db.insert(clientRequests).values({
    projectId,
    title,
    description,
    status: "pending",
  });

  revalidatePath(`/portal/${projectId}`);
  return { success: true };
}

// ==========================================
// ---    REAL-TIME CHAT ACTIONS          ---
// ==========================================

// 4. Fetch live updates (New messages & typing status)
export async function fetchLiveChatUpdates(
  projectId: number,
  role: "client" | "admin",
) {
  // Mark unread messages from the OTHER party as read since we are fetching them
  await db
    .update(portalMessages)
    .set({ isRead: true })
    .where(
      and(
        eq(portalMessages.projectId, projectId),
        eq(portalMessages.sender, role === "client" ? "admin" : "client"),
        eq(portalMessages.isRead, false),
      ),
    );

  // Fetch all messages (Ordered chronologically)
  const messages = await db
    .select()
    .from(portalMessages)
    .where(eq(portalMessages.projectId, projectId))
    .orderBy(portalMessages.createdAt);

  // Fetch typing status
  const presence = await db
    .select()
    .from(chatPresence)
    .where(eq(chatPresence.projectId, projectId))
    .limit(1);

  return {
    messages,
    isOtherPartyTyping:
      role === "client" ? presence[0]?.adminTyping : presence[0]?.clientTyping,
  };
}

// 5. Set typing status
export async function setTypingStatus(
  projectId: number,
  role: "client" | "admin",
  isTyping: boolean,
) {
  const existing = await db
    .select()
    .from(chatPresence)
    .where(eq(chatPresence.projectId, projectId))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(chatPresence).values({
      projectId,
      clientTyping: role === "client" ? isTyping : false,
      adminTyping: role === "admin" ? isTyping : false,
    });
  } else {
    await db
      .update(chatPresence)
      .set({
        clientTyping: role === "client" ? isTyping : existing[0].clientTyping,
        adminTyping: role === "admin" ? isTyping : existing[0].adminTyping,
        lastUpdated: new Date(), // Standard JS Date works well with Drizzle defaultNow() mappings
      })
      .where(eq(chatPresence.projectId, projectId));
  }
}
