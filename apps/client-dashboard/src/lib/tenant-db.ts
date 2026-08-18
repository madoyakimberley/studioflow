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

async function ensureTenantSchema(executor: any) {
  // 1. Setup Projects Table
  await executor.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workspace_id INT NOT NULL,
      client_id INT NOT NULL,
      client_name VARCHAR(255) NOT NULL, 
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
      portal_code_expires_at TIMESTAMP NULL,
      portal_last_code_sent_at TIMESTAMP NULL,
      portal_emails_sent_count INT DEFAULT 0,
      portal_link_sent_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Setup Clients Table
  await executor.execute(`
    CREATE TABLE IF NOT EXISTS clients (
      id INT AUTO_INCREMENT PRIMARY KEY,
      workspace_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      portal_slug VARCHAR(255),
      proof_url TEXT,
      email VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      onboarding_completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Setup Checklist Items Table
  await executor.execute(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      type VARCHAR(50),
      status VARCHAR(50) DEFAULT 'pending',
      proof_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  // 4. Setup Provisioning Jobs Table
  await executor.execute(`
    CREATE TABLE IF NOT EXISTS provisioning_jobs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT NOT NULL,
      workspace_id INT NOT NULL,
      idempotency_key VARCHAR(255) NOT NULL UNIQUE,
      status VARCHAR(50) DEFAULT 'pending',
      manifest JSON NOT NULL,
      execution_logs JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      started_at TIMESTAMP NULL,
      completed_at TIMESTAMP NULL,
      INDEX project_job_idx (project_id),
      INDEX workspace_job_idx (workspace_id),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  console.log(
    "✅ All required tenant tables (projects, clients, checklist_items, provisioning_jobs) verified/created.",
  );
}

export async function getTenantDb(
  workspaceId: number,
  forceRefresh: boolean = false,
) {
  console.log(`🔍 getTenantDb called for workspace ${workspaceId}`);
  await ensureCentralTables();

  if (forceRefresh) {
    console.log(
      `♻️ Force refresh requested. Clearing cache for workspace ${workspaceId}`,
    );
    clientCache.delete(workspaceId);
  } else if (clientCache.has(workspaceId)) {
    console.log(
      `✅ Using cached tenant DB client for workspace ${workspaceId}`,
    );
    return clientCache.get(workspaceId);
  }

  const pool = await getCentralPool();
  let rows: any[] = [];
  try {
    const [result] = await pool.execute(
      "SELECT * FROM workspace_environments WHERE workspace_id = ?",
      [workspaceId],
    );
    rows = result as any[];
    console.log(`✅ Found ${rows.length} row(s) for workspace ${workspaceId}`);
  } catch (err) {
    console.error(`❌ Error querying workspace_environments:`, err);
    throw new Error(`Failed to query workspace environment: ${err}`);
  }

  if (rows.length === 0) {
    throw new Error(
      `No workspace environment found for workspace ${workspaceId}`,
    );
  }

  const env = rows[0];
  console.log(`🔍 Environment row:`, {
    workspace_id: env.workspace_id,
    database_url: env.database_url?.substring(0, 50) + "...",
  });

  if (!env.database_url) {
    throw new Error(`No database URL found for workspace ${workspaceId}`);
  }

  const engine = env.database_engine || "postgresql";
  let client;

  try {
    if (engine === "postgresql" || engine === "postgres") {
      const tenantUrl = ensureTlsUrl(env.database_url);
      const connection = postgres(tenantUrl, {
        max: 5,
        idle_timeout: 10,
      });
      client = drizzlePg(connection, { schema });

      // PostgreSQL connection objects can execute raw strings directly
      await ensureTenantSchema(connection);
    } else if (engine === "mysql") {
      const tenantUrl = ensureTlsUrl(env.database_url);
      const tenantPool = mysql.createPool({
        uri: tenantUrl,
        waitForConnections: true,
        connectionLimit: 5,
        connectTimeout: 15000,
      });
      client = drizzle(tenantPool, { schema, mode: "default" });

      // Pass the underlying raw MySQL pool to execute raw initialization statements
      await ensureTenantSchema(tenantPool);
    } else {
      throw new Error(`Unsupported database engine: ${engine}`);
    }
  } catch (err) {
    console.error(`❌ Failed to create tenant DB client:`, err);
    throw err;
  }

  clientCache.set(workspaceId, client);
  console.log(
    `✅ Tenant DB client created and cached for workspace ${workspaceId}`,
  );
  return client;
}
