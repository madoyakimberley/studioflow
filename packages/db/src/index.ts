import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

// Create the connection pool to TiDB
const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL as string,
  // TiDB specific optimization: keeps connections alive efficiently
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Export the live db instance
export const db = drizzle(poolConnection, { schema, mode: "default" });

// Export the schemas so other apps can use them for types
export * from "./schema";
