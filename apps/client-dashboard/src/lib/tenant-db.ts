// lib/tenant-db.ts
import { drizzle } from "drizzle-orm/mysql2";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import mysql from "mysql2/promise";
import postgres from "postgres";
import * as schema from "@studioflow/db";

const clientCache = new Map<number, any>();

// Helper to ensure TLS for TiDB Cloud Serverless
function ensureTlsUrl(url: string): string {
  if (url.includes("tidbcloud.com") && !url.includes("ssl=")) {
    const separator = url.includes("?") ? "&" : "?";
    const sslParam = `ssl=${encodeURIComponent(JSON.stringify({ rejectUnauthorized: true }))}`;
    return `${url}${separator}${sslParam}`;
  }
  return url;
}

// Central DB pool (raw mysql2, no Drizzle)
let centralPool: mysql.Pool | null = null;

async function getCentralPool() {
  if (!centralPool) {
    const rawUrl = process.env.DATABASE_URL;
    if (!rawUrl) throw new Error("DATABASE_URL is not set");
    const url = ensureTlsUrl(rawUrl);
    console.log(
      `🔌 Connecting to central DB: ${url.replace(/\/\/.*@/, "//***@")}`,
    );
    centralPool = mysql.createPool({
      uri: url,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 15000,
    });
  }
  return centralPool;
}

// Ensure the central table exists
async function ensureCentralTables() {
  const pool = await getCentralPool();
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS workspace_environments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workspace_id INT NOT NULL UNIQUE,
      database_url TEXT,
      database_engine VARCHAR(50) DEFAULT 'postgresql',
      database_orm VARCHAR(50) DEFAULT 'drizzle',
      redis_url TEXT,
      target_output_dir VARCHAR(255) DEFAULT '~/StudioFlow/projects',
      github_token TEXT,
      deployment_provider VARCHAR(50) DEFAULT 'none',
      deployment_api_key TEXT,
      deployment_owner_id VARCHAR(255),
      smtp_host VARCHAR(255),
      smtp_port VARCHAR(50),
      smtp_user VARCHAR(255),
      smtp_pass TEXT,
      admin_alert_email VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Central table `workspace_environments` verified/created");
}

// Ensure tenant tables exist (projects only)
async function ensureTenantSchema(client: any) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workspace_id INT NOT NULL,
      client_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      frontend_framework VARCHAR(50) DEFAULT 'dynamic',
      backend_framework VARCHAR(50) DEFAULT 'dynamic',
      database_provider VARCHAR(50) DEFAULT 'dynamic',
      folder_structure VARCHAR(50) DEFAULT 'monorepo',
      deployment_target VARCHAR(50) DEFAULT 'custom',
      universal_manifest JSON NOT NULL,
      blueprint_yaml TEXT,
      status VARCHAR(50) DEFAULT 'planning',
      live_url VARCHAR(255),
      github_repo VARCHAR(255),
      payment_status VARCHAR(50) DEFAULT 'pending',
      progress_percentage INT DEFAULT 0,
      mvp_edit_count INT DEFAULT 0,
      client_email VARCHAR(255) NOT NULL,
      portal_verification_code VARCHAR(6),
      portal_code_expires_at TIMESTAMP,
      portal_last_code_sent_at TIMESTAMP,
      portal_emails_sent_count INT DEFAULT 0,
      portal_link_sent_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function getTenantDb(workspaceId: number) {
  // 1. Ensure central table exists
  await ensureCentralTables();

  // 2. Check cache
  if (clientCache.has(workspaceId)) {
    return clientCache.get(workspaceId);
  }

  // 3. Get central pool and query workspace_environments
  const pool = await getCentralPool();
  let rows: any[] = [];
  try {
    const [result] = await pool.execute(
      "SELECT * FROM workspace_environments WHERE workspace_id = ?",
      [workspaceId],
    );
    rows = result as any[];
  } catch (err) {
    console.error(
      `❌ Error querying workspace_environments for workspace ${workspaceId}:`,
      err,
    );
    throw new Error(`Failed to query workspace environment: ${err}`);
  }

  if (rows.length === 0) {
    throw new Error(
      `No workspace environment found for workspace ${workspaceId}`,
    );
  }

  const env = rows[0];
  if (!env.database_url) {
    throw new Error(`No database URL found for workspace ${workspaceId}`);
  }

  const engine = env.database_engine || "postgresql";
  let client;

  // 4. Build tenant DB client
  try {
    if (engine === "postgresql" || engine === "postgres") {
      const tenantUrl = ensureTlsUrl(env.database_url);
      const connection = postgres(tenantUrl, {
        max: 5,
        idle_timeout: 10,
      });
      client = drizzlePg(connection, { schema });
    } else if (engine === "mysql") {
      const tenantUrl = ensureTlsUrl(env.database_url);
      const tenantPool = mysql.createPool({
        uri: tenantUrl,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 15000,
      });
      client = drizzle(tenantPool, { schema, mode: "default" });
    } else {
      throw new Error(`Unsupported database engine: ${engine}`);
    }
  } catch (err) {
    console.error(`❌ Failed to create tenant DB client:`, err);
    throw err;
  }

  // 5. Ensure tenant tables exist
  await ensureTenantSchema(client);

  // 6. Cache and return
  clientCache.set(workspaceId, client);
  return client;
}
