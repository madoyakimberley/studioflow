import { db, workspaces } from "@studioflow/db";
import { eq, and } from "drizzle-orm";

// Replace this helper function with your actual session extractor (e.g., NextAuth, Clerk, Supabase cookies)
async function getActiveSessionUserId(): Promise<string> {
  // Mock example tracking user: return standard active user ID session identifier
  return "user_abc123";
}

/**
 * Validates workspace multi-tenancy access constraints.
 * Throws an explicit error if a user attempts to view or modify an alien workspace node.
 */
export async function enforceWorkspaceOwnership(
  workspaceId: number,
): Promise<void> {
  const currentUserId = await getActiveSessionUserId();

  const workspaceCheck = await db
    .select()
    .from(workspaces)
    .where(
      and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.ownerId, currentUserId), // Ensures current user owns it
      ),
    )
    .then((res) => res[0]);

  if (!workspaceCheck) {
    console.error(
      `🚨 [SECURITY ALERT]: Unauthorized database access attempt by User ${currentUserId} on Workspace ID ${workspaceId}`,
    );
    throw new Error(
      "Access Denied: You do not possess clearance for this workspace topology.",
    );
  }
}
