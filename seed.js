// seed.js
import mysql from "mysql2/promise";
import crypto from "crypto";

function secureHashPassword(password) {
  const salt = process.env.AUTH_SALT || "studioflow_fallback_system_guard_salt";
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ Could not find DATABASE_URL in your environment.");
    process.exit(1);
  }

  const plainPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!plainPassword) {
    console.error(
      "❌ SECURITY HALT: You must define ADMIN_SEED_PASSWORD in your .env file.",
    );
    process.exit(1);
  }

  const adminEmailsString = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const superAdminEmails = adminEmailsString
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (superAdminEmails.length === 0) {
    console.error(
      "❌ Environment marker setup error: NEXT_PUBLIC_ADMIN_EMAILS is empty.",
    );
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: url,
    ssl: { rejectUnauthorized: true },
  });

  console.log(
    "🌱 Rebuilding foundation with your secure Superadmin clusters...",
  );

  try {
    const hashedPassword = secureHashPassword(plainPassword);

    for (let i = 0; i < superAdminEmails.length; i++) {
      const email = superAdminEmails[i];
      const username = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
      const userId = `superadmin_node_${username}`;

      // 1. Inject User
      await connection.execute(
        `
        INSERT INTO \`users\` (\`id\`, \`username\`, \`email\`, \`name\`, \`password_hash\`)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE \`password_hash\` = VALUES(\`password_hash\`)
      `,
        [
          userId,
          username,
          email,
          `SuperAdmin ${username.toUpperCase()}`,
          hashedPassword,
        ],
      );
      console.log(`👑 Superadmin Node [${username}] verified and injected.`);

      // 2. Fetch or Create Workspace (DYNAMIC ID FIX)
      const [existingWorkspaces] = await connection.execute(
        `SELECT id FROM \`workspaces\` WHERE \`owner_id\` = ? LIMIT 1`,
        [userId],
      );

      let realWorkspaceId;

      if (existingWorkspaces.length > 0) {
        realWorkspaceId = existingWorkspaces[0].id;
        console.log(
          `🏢 Found existing workspace (ID: ${realWorkspaceId}) for ${username}.`,
        );
      } else {
        const [wsResult] = await connection.execute(
          `
          INSERT INTO \`workspaces\` (\`owner_id\`, \`name\`, \`slug\`)
          VALUES (?, ?, ?)
          `,
          [
            userId,
            `Admin Matrix Cluster ${username}`,
            `admin-matrix-cluster-${username}`,
          ],
        );
        realWorkspaceId = wsResult.insertId;
        console.log(
          `🏢 Created new workspace (ID: ${realWorkspaceId}) for ${username}.`,
        );
      }

      // 3. Bonus Fix: Seed environment using the REAL workspaceId
      await connection
        .execute(
          `
        INSERT INTO \`workspace_environments\` (\`workspace_id\`, \`env_vars\`)
        VALUES (?, '{}')
        ON DUPLICATE KEY UPDATE \`env_vars\` = VALUES(\`env_vars\`)
        `,
          [realWorkspaceId],
        )
        .catch(() =>
          console.log("Note: workspace_environments table skipped."),
        );

      console.log(
        `🔗 Core Frame Linked successfully to Workspace ID: ${realWorkspaceId}`,
      );
    }

    console.log("🚀 Multi-node database safety matrix seeded! Ready to build.");
  } catch (error) {
    console.error("❌ Failed to seed foundation:", error);
  } finally {
    await connection.end();
  }
}

seed().catch(console.error);
