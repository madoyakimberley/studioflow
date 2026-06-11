// wipe.js
import mysql from "mysql2/promise";

async function wipe() {
  // This automatically reads the database connection string from your root .env file
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ Could not find DATABASE_URL in your environment.");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: url,
    ssl: { rejectUnauthorized: true },
  });

  console.log("🧼 Fetching all tables in the database...");

  // 1. Get all table names dynamically
  const [rows] = await connection.query("SHOW TABLES;");

  if (rows.length === 0) {
    console.log("🤷 Database is already empty. No tables to drop.");
    await connection.end();
    return;
  }

  // 2. Disable foreign key checks to avoid deletion order conflicts
  await connection.query("SET FOREIGN_KEY_CHECKS = 0;");

  console.log(`🗑️ Dropping ${rows.length} tables...`);

  // 3. Loop through and drop every table
  for (const row of rows) {
    const tableName = Object.values(row)[0];
    await connection.query(`DROP TABLE IF EXISTS \`${tableName}\`;`);
    console.log(`  Dropped table: ${tableName}`);
  }

  // 4. Re-enable foreign key checks
  await connection.query("SET FOREIGN_KEY_CHECKS = 1;");

  console.log("✅ Database cleared completely!");
  await connection.end();
}

wipe().catch(console.error);
