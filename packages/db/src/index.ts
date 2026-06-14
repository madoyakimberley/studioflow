/// <reference types="node" />

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("🚨 CRITICAL: DATABASE_URL environment variable is missing.");
}

const connectionPool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: { rejectUnauthorized: true },
  // FIX: Protects against silent database engine drop-offs and ETIMEDOUT socket exceptions
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

export const db = drizzle(connectionPool, { schema, mode: "default" });
export * from "./schema";
