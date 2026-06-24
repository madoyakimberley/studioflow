// lib/tenant-db.ts
import { drizzle } from "drizzle-orm/mysql2";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import mysql from "mysql2/promise";
import postgres from "postgres";
import * as schema from "@studioflow/db";
import { db as centralDb } from "@studioflow/db";
import { eq } from "drizzle-orm";

const clientCache = new Map<number, any>();

export async function getTenantDb(workspaceId: number) {
  if (clientCache.has(workspaceId)) {
    return clientCache.get(workspaceId);
  }

  // Fetch workspace environment from central DB
  const env = await centralDb.query.workspaceEnvironments.findFirst({
    where: (envs, { eq }) => eq(envs.workspaceId, workspaceId),
  });

  if (!env?.databaseUrl) {
    throw new Error(`No database URL found for workspace ${workspaceId}`);
  }

  const engine = env.databaseEngine || "mysql";
  let client;

  if (engine === "postgresql" || engine === "postgres") {
    const connection = postgres(env.databaseUrl, { max: 5, idle_timeout: 10 });
    client = drizzlePg(connection, { schema });
  } else if (engine === "mysql") {
    const pool = mysql.createPool({
      uri: env.databaseUrl,
      waitForConnections: true,
      connectionLimit: 5,
      connectTimeout: 15000,
    });
    client = drizzle(pool, { schema, mode: "default" });
  } else {
    throw new Error(`Unsupported database engine: ${engine}`);
  }

  clientCache.set(workspaceId, client);
  return client;
}
