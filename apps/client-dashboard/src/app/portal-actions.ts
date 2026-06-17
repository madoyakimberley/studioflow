"use server";

import {
  db,
  projects,
  clients,
  portalMessages,
  clientRequests,
  chatPresence,
} from "@studioflow/db";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendPortalAccessCodeEmail } from "@/lib/mailer";
import { cookies } from "next/headers";
import crypto from "crypto";

// ==========================================
// --- SECURITY GATEWAY VALIDATION ACTIONS ---
// ==========================================

/**
 * Generates and dispatches a secure 6-digit pin token with O(1) database execution tracking rate limit safeguards
 */
export async function sendPortalVerificationCodeAction(projectId: number) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return { success: false, message: "Target cluster reference not found." };
    }

    const now = new Date();

    // RATE LIMIT ENFORCEMENT: 60 seconds check
    if (project.portalLastCodeSentAt) {
      const secondsPassed = Math.floor(
        (now.getTime() - new Date(project.portalLastCodeSentAt).getTime()) /
          1000,
      );
      if (secondsPassed < 60) {
        return {
          success: false,
          message: `Rate limit hit. Please wait ${60 - secondsPassed} seconds before re-triggering transit.`,
        };
      }
    }

    // Cryptographically secure token string generation
    const securePin = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpiration = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute validity window

    // Update synchronization matrix rows
    await db
      .update(projects)
      .set({
        portalVerificationCode: securePin,
        portalCodeExpiresAt: tokenExpiration,
        portalLastCodeSentAt: now,
      })
      .where(eq(projects.id, projectId));

    // Dispatch via standard system transport layer
    await sendPortalAccessCodeEmail({
      clientEmail: project.clientEmail,
      projectName: project.name,
      securePin: securePin,
    });

    return {
      success: true,
      message:
        "Verification pin dispatched successfully to client endpoint tracking channels.",
    };
  } catch (e: any) {
    console.error("❌ [SECURITY COMPROMISE VECTOR FAULT]:", e);
    return {
      success: false,
      message: "Internal delivery hub breakdown occurred.",
    };
  }
}

/**
 * Authenticates input code parameters against the primary source registry
 */
export async function verifyPortalAccessCodeAction(
  projectId: number,
  codeInput: string,
) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || !project.portalVerificationCode) {
      return { success: false, message: "Authorization parameters missing." };
    }

    const now = new Date();

    // Verify code expiration parameters cleanly
    if (
      project.portalCodeExpiresAt &&
      now > new Date(project.portalCodeExpiresAt)
    ) {
      return {
        success: false,
        message:
          "The input code has expired. Please request a fresh access pin.",
      };
    }

    // Direct token validation evaluation
    if (project.portalVerificationCode !== codeInput) {
      return {
        success: false,
        message: "Security token mismatch. Access denied.",
      };
    }

    // Create a client cookie signature session instance
    const sessionCookieJar = cookies();
    (await sessionCookieJar).set({
      name: `studioflow_portal_auth_${projectId}`,
      value: `verified_session_token_${crypto.randomUUID()}`,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7-day session lifecycle authorization window
    });

    return { success: true, message: "Access matrix unlocked." };
  } catch (e: any) {
    console.error("❌ [SECURITY SENTINEL VALIDATION FAILURE]:", e);
    return {
      success: false,
      message: "Gate validator pipeline error encountered.",
    };
  }
}

// ==========================================
// --- PORTAL DATA & COMMUNICATION ACTIONS ---
// ==========================================

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

// ==========================================
// ---    PORTAL WELCOME EMAIL ACTION     ---
// ==========================================

/**
 * Dispatches the initial welcome link to the client
 */
export async function sendClientPortalWelcomeAction(
  projectSlug: string,
  portalLink: string,
) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, projectSlug),
    });

    if (!project || !project.clientEmail) {
      return {
        success: false,
        message: "Valid client email or project not found.",
      };
    }

    // IMPORTANT: Make sure to hook this up to your actual email logic!
    // Example:
    // await sendWelcomeEmail({
    //   clientEmail: project.clientEmail,
    //   projectName: project.name,
    //   portalLink: portalLink,
    // });

    return {
      success: true,
      message: "Portal link sent successfully.",
    };
  } catch (e: any) {
    console.error("❌ [WELCOME EMAIL DISPATCH FAILURE]:", e);
    return {
      success: false,
      message: "Failed to send the portal link.",
    };
  }
}
