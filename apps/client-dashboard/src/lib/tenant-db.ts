// lib/tenant-db.ts
import { drizzle } from "drizzle-orm/mysql2";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import mysql from "mysql2/promise";
import postgres from "postgres";
import * as schema from "@studioflow/db";
import { db as centralDb } from "@studioflow/db";
import fs from "fs";
import path from "path";

const clientCache = new Map<number, any>();

// Helper to get TLS config for TiDB Cloud Serverless
function getTLSConfig() {
  // For TiDB Serverless, you can either:
  // 1. Use the system's CA certificates (most Linux/macOS have them)
  // 2. Download the CA cert from TiDB Cloud and point to it
  // 3. Use { rejectUnauthorized: true } for Node.js to use built-in CA

  // Option 1: Use Node.js built-in CA (recommended for most cases)
  return {
    rejectUnauthorized: true, // This uses Node.js's built-in CA certificates
  };

  // Option 2: If you downloaded the CA certificate from TiDB Cloud:
  // const caPath = path.join(process.cwd(), 'certs', 'ca.pem');
  // if (fs.existsSync(caPath)) {
  //   return { ca: fs.readFileSync(caPath) };
  // }
  // return { rejectUnauthorized: true };
}

async function ensureCentralTables() {
  // Use TLS for the central DB connection too
  const tlsConfig = getTLSConfig();

  await centralDb.execute(
    `
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
  `,
    [], // No params
  );
}

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
  await ensureCentralTables();

  if (clientCache.has(workspaceId)) {
    return clientCache.get(workspaceId);
  }

  const env = await centralDb.query.workspaceEnvironments.findFirst({
    where: (envs, { eq }) => eq(envs.workspaceId, workspaceId),
  });

  if (!env?.databaseUrl) {
    throw new Error(`No database URL found for workspace ${workspaceId}`);
  }

  const engine = env.databaseEngine || "postgresql";
  let client;
  const tlsConfig = getTLSConfig();

  if (engine === "postgresql" || engine === "postgres") {
    // PostgreSQL with TLS
    const connection = postgres(env.databaseUrl, {
      max: 5,
      idle_timeout: 10,
      ssl: tlsConfig,
    });
    client = drizzlePg(connection, { schema });
  } else if (engine === "mysql") {
    // MySQL with TLS
    const pool = mysql.createPool({
      uri: env.databaseUrl,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 15000,
      ssl: tlsConfig, // 👈 THIS IS THE CRITICAL FIX
    });
    client = drizzle(pool, { schema, mode: "default" });
  } else {
    throw new Error(`Unsupported database engine: ${engine}`);
  }

  await ensureTenantSchema(client);

  clientCache.set(workspaceId, client);
  return client;
}
