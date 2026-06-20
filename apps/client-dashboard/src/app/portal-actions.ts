"use server";
import { sql } from "drizzle-orm";
import {
  db,
  projects,
  clients,
  portalMessages,
  clientRequests,
  chatPresence,
  checklistItems,
  provisioningJobs,
  siteMonitoring,
} from "@studioflow/db";
import { eq, and, desc, gte, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
  sendPortalAccessCodeEmail,
  sendPortalWelcomeEmail,
} from "@/lib/mailer";
import { cookies } from "next/headers";
import crypto from "crypto";

// ==========================================
// --- CHECKLIST & MVP SCOPE RULES ENGINE ---
// ==========================================

export async function addOrEditChecklistItemAction(
  projectId: number,
  title: string,
  itemId?: number,
) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || !project.createdAt) {
      return {
        success: false,
        message: "Target cluster registry context lost.",
      };
    }

    const now = new Date();
    const hoursSinceCreation =
      (now.getTime() - new Date(project.createdAt).getTime()) /
      (1000 * 60 * 60);

    // RULE A: The 2-Day Lock
    const isLocked = hoursSinceCreation > 48;
    const finalType = isLocked ? "Added Feature" : "MVP";

    if (itemId) {
      // Editing an existing item
      const item = await db.query.checklistItems.findFirst({
        where: eq(checklistItems.id, itemId),
      });

      if (item && item.type === "MVP") {
        // RULE B: The 2-Edit Limit
        if (project.mvpEditCount && project.mvpEditCount >= 2) {
          return {
            success: false,
            message: "MVP edit threshold breached. Protocol locked.",
          };
        }
        await db
          .update(projects)
          .set({ mvpEditCount: (project.mvpEditCount || 0) + 1 })
          .where(eq(projects.id, projectId));
      }

      await db
        .update(checklistItems)
        .set({ title })
        .where(eq(checklistItems.id, itemId));
    } else {
      // Creating a new item
      await db.insert(checklistItems).values({
        projectId,
        title,
        status: "pending",
        type: finalType,
      });
    }

    // 🚨 FIX: Revalidate using the project.slug (the 'token' in the URL), not the database ID
    revalidatePath(`/portal/${project.slug}`);

    return { success: true, isAddedFeature: finalType === "Added Feature" };
  } catch (e) {
    console.error("❌ [CHECKLIST VALIDATION FAILURE]:", e);
    return {
      success: false,
      message: "Checklist validation pipeline error encountered.",
    };
  }
}

// Dev Side: Attach Proof
export async function submitChecklistItemProofAction(
  itemId: number,
  proofUrl: string,
) {
  try {
    await db
      .update(checklistItems)
      .set({
        status: "pending_client_review",
        proofUrl: proofUrl,
      })
      .where(eq(checklistItems.id, itemId));

    return { success: true };
  } catch (e) {
    return {
      success: false,
      message: "Telemetry proof upload sequence failed.",
    };
  }
}

// Client Side: Approve Work
export async function approveChecklistItemAction(itemId: number) {
  try {
    await db
      .update(checklistItems)
      .set({ status: "completed" })
      .where(eq(checklistItems.id, itemId));

    return { success: true };
  } catch (e) {
    return {
      success: false,
      message: "Sign-off authorization sequence failed.",
    };
  }
}

// Client Side: Request Revisions
export async function requestRevisionAction(itemId: number) {
  try {
    await db
      .update(checklistItems)
      .set({
        status: "pending",
        proofUrl: null, // Clear the proof so the dev has to submit a new one
      })
      .where(eq(checklistItems.id, itemId));

    // Revalidate the paths to update the UI instantly across both portals
    revalidatePath(`/portal/[token]/proofs`, "page");
    revalidatePath(`/dashboard/[user]`, "page");

    return { success: true };
  } catch (error) {
    console.error("❌ [REVISION REQUEST FAILURE]:", error);
    return {
      success: false,
      message: "Revision tracking rollback pipeline execution failed.",
    };
  }
}

// ==========================================
// --- SECURITY GATEWAY VALIDATION ACTIONS ---
// ==========================================

export async function sendPortalVerificationCodeAction(projectId: number) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return { success: false, message: "Target cluster reference not found." };
    }

    const now = new Date();

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

    const securePin = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpiration = new Date(now.getTime() + 15 * 60 * 1000);

    await db
      .update(projects)
      .set({
        portalVerificationCode: securePin,
        portalCodeExpiresAt: tokenExpiration,
        portalLastCodeSentAt: now,
      })
      .where(eq(projects.id, projectId));

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

export async function verifyPortalAccessCodeAction(
  projectId: number,
  codeInput: string,
) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project || !project.portalVerificationCode) {
      return {
        success: false,
        message: "Authorization gateway parameters missing.",
      };
    }

    const now = new Date();

    if (
      project.portalCodeExpiresAt &&
      now > new Date(project.portalCodeExpiresAt)
    ) {
      return {
        success: false,
        message:
          "Temporal access code expired. Please request a fresh access PIN.",
      };
    }

    if (project.portalVerificationCode !== codeInput) {
      return {
        success: false,
        message: "Security token mismatch. Access denied.",
      };
    }

    const sessionCookieJar = await cookies();
    sessionCookieJar.set({
      name: `studioflow_portal_auth_${projectId}`,
      value: `verified_session_token_${crypto.randomUUID()}`,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7,
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

export async function verifyPortalAccess(token: string) {
  try {
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
      return {
        success: false,
        error:
          "Access token invalid or unauthorized inside the current registry.",
      };
    }

    const projectRecord = {
      ...result[0].project,
      client: result[0].client,
    };

    return { success: true, project: projectRecord };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendPortalMessage(
  projectId: number,
  content: string,
  sender: "client" | "admin",
) {
  try {
    // 🚨 FIX: Must be `null` instead of `undefined` for Next.js Server Action serialization
    let warningMessage: string | null = null;

    // 1. ENTERPRISE RATE LIMIT ENFORCEMENT
    // Clients can only send 30 messages per 24 hours. Admin has unlimited.
    if (sender === "client") {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // 🚨 FIX: Used Drizzle's native count() for type safety over raw SQL
      const [recentMessages] = await db
        .select({ value: count() })
        .from(portalMessages)
        .where(
          and(
            eq(portalMessages.projectId, projectId),
            eq(portalMessages.sender, "client"),
            gte(portalMessages.createdAt, twentyFourHoursAgo),
          ),
        );

      const messageCount = Number(recentMessages?.value || 0);

      if (messageCount >= 30) {
        return {
          success: false,
          error:
            "Transmission limit reached. 30 packets sent in the last 24-hour cycle. Please compile further data into a specific Request ticket.",
          message:
            "Transmission limit reached. 30 packets sent in the last 24-hour cycle. Please compile further data into a specific Request ticket.",
        };
      }

      // Calculate remaining and set warning if <= 5
      const remaining = 30 - (messageCount + 1);
      if (remaining <= 5 && remaining > 0) {
        warningMessage = `Message sent. Warning: You only have ${remaining} message(s) remaining in this 24-hour cycle.`;
      } else if (remaining === 0) {
        warningMessage = `Message sent. Warning: This was your final message for this 24-hour cycle.`;
      }
    }

    // 2. Insert the message
    const [insertedMessage] = await db
      .insert(portalMessages)
      .values({
        projectId,
        content,
        sender,
        isRead: sender === "admin" ? true : false,
      })
      .$returningId();

    // 3. Purge Next.js Cache
    revalidatePath("/dashboard");

    // Return the warning message if applicable, otherwise null
    return { success: true, message: warningMessage };
  } catch (error: any) {
    return { success: false, error: error.message, message: error.message };
  }
}

export async function submitClientRequest(
  projectId: number,
  title: string,
  description: string,
) {
  if (!title || !description)
    return { success: false, error: "Incomplete telemetry packet fields." };

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

export async function fetchLiveChatUpdates(
  projectId: number,
  role: "client" | "admin",
) {
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

  const messages = await db
    .select()
    .from(portalMessages)
    .where(eq(portalMessages.projectId, projectId))
    .orderBy(portalMessages.createdAt);

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
        lastUpdated: new Date(),
      })
      .where(eq(chatPresence.projectId, projectId));
  }
}

// ==========================================
// ---    PORTAL WELCOME EMAIL ACTION     ---
// ==========================================

export async function sendClientPortalWelcomeAction(projectSlug: string) {
  try {
    const project = await db.query.projects.findFirst({
      where: eq(projects.slug, projectSlug),
    });

    if (!project || !project.clientEmail) {
      return {
        success: false,
        message: "Target node reference or project registration not found.",
      };
    }

    const now = new Date();
    const securePin = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenExpiration = new Date(now.getTime() + 15 * 60 * 1000);

    await db
      .update(projects)
      .set({
        portalVerificationCode: securePin,
        portalCodeExpiresAt: tokenExpiration,
        portalLastCodeSentAt: now,
      })
      .where(eq(projects.slug, projectSlug));

    // Ensure we are pointing to the dashboard domain, not Render
    const rawBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000";

    const baseUrl = rawBaseUrl.replace(/\/$/, "");

    const portalLink = `${baseUrl}/portal/${projectSlug}?code=${securePin}`;

    await sendPortalWelcomeEmail({
      clientEmail: project.clientEmail,
      projectName: project.name,
      portalLink: portalLink,
      securePin: securePin,
    });

    return {
      success: true,
      message:
        "Portal onboarding documentation successfully dispatched to verified recipient node.",
    };
  } catch (e: any) {
    console.error("❌ [WELCOME EMAIL DISPATCH FAILURE]:", e);
    return {
      success: false,
      message: "Secure pipeline transmission link broadcast failure.",
    };
  }
}

// ==========================================
// --- LIVE METRICS FETCH ENGINE          ---
// ==========================================

export async function getLiveProjectStatus(projectId: number) {
  try {
    const projectInfo = await db
      .select({
        status: projects.status,
        progressPercentage: projects.progressPercentage,
        liveUrl: projects.liveUrl,
        githubRepo: projects.githubRepo,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    const checklist = await db
      .select()
      .from(checklistItems)
      .where(eq(checklistItems.projectId, projectId))
      .orderBy(desc(checklistItems.createdAt));

    const requests = await db
      .select()
      .from(clientRequests)
      .where(eq(clientRequests.projectId, projectId))
      .orderBy(desc(clientRequests.createdAt));

    const deploymentJob = await db
      .select()
      .from(provisioningJobs)
      .where(eq(provisioningJobs.projectId, projectId))
      .orderBy(desc(provisioningJobs.createdAt))
      .limit(1);

    const presence = await db
      .select()
      .from(chatPresence)
      .where(eq(chatPresence.projectId, projectId))
      .limit(1);

    const monitoring = await db
      .select()
      .from(siteMonitoring)
      .where(eq(siteMonitoring.projectId, projectId))
      .orderBy(desc(siteMonitoring.checkedAt))
      .limit(1);

    return {
      success: true,
      data: {
        project: projectInfo[0] || null,
        checklist: checklist,
        requests: requests,
        activeJob: deploymentJob[0] || null,
        presence: presence[0] || null,
        nodeStatus: monitoring[0] || null,
      },
    };
  } catch (error) {
    console.error("Failed to query live asset stream:", error);
    return { success: false, data: null };
  }
}

// ==========================================
// --- ZERO-TRUST PORTAL ACCESS ENGINE ---
// ==========================================

export async function dispatchSecurePortalLink(
  projectId: number,
  clientEmail: string,
  portalSlug: string,
) {
  try {
    // 0. Fetch the project so we have the projectName for the email template
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });

    if (!project) {
      return {
        success: false,
        message: "Target cluster registry context lost.",
      };
    }

    // 🚨 RATE LIMIT: Max 5 portal link allocations allowed
    if (project.portalLinkSentCount && project.portalLinkSentCount >= 5) {
      return {
        success: false,
        message:
          "Maximum portal link requests reached for this deployment lifecycle.",
      };
    }

    // 1. Generate a cryptographically secure 6-digit OTP
    const secureOtp = crypto.randomInt(100000, 999999).toString();

    // 2. Set strict expiration (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    // 3. Lock the project down in the database and step up transmission telemetry
    await db
      .update(projects)
      .set({
        portalVerificationCode: secureOtp,
        portalCodeExpiresAt: expiresAt,
        portalLastCodeSentAt: new Date(),
        portalLinkSentCount: (project.portalLinkSentCount || 0) + 1,
      })
      .where(eq(projects.id, projectId));

    // 4. Construct the unique Portal URL
    // Enforce the use of NEXT_PUBLIC_APP_URL to prevent Render URL leak
    const rawAppUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const cleanAppUrl = rawAppUrl.replace(/\/$/, ""); // Strips trailing slash if present
    const securePortalUrl = `${cleanAppUrl}/portal/${portalSlug}`;

    // 5. Dispatch the email using your existing mailer function
    await sendPortalWelcomeEmail({
      clientEmail: clientEmail,
      projectName: project.name,
      portalLink: securePortalUrl,
      securePin: secureOtp,
    });

    console.log(
      `✅ [ZERO-TRUST ACCESS]: OTP dispatched to ${clientEmail} for Project: ${project.name}`,
    );

    return {
      success: true,
      message:
        "Secure portal link and OTP dispatched to client endpoint tracking channels.",
    };
  } catch (error: any) {
    console.error("❌ Failed to dispatch secure portal link:", error);
    return {
      success: false,
      message:
        "Failed to transmit secure routing link. Check mailer telemetry logs.",
    };
  }
}
