// seed.js
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ Could not find DATABASE_URL in your environment.");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: url,
    ssl: { rejectUnauthorized: true },
  });

  console.log("🌱 Rebuilding foundation with your Admin account...");

  try {
    const plainPassword = "shaggy19841974";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Inject Admin User
    await connection.execute(
      `
      INSERT INTO \`users\` (\`id\`, \`username\`, \`email\`, \`name\`, \`password_hash\`)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        "dev_admin_kimmadoya",
        "kimmadoya",
        "kimmadoya@gmail.com",
        "Kim Madoya",
        hashedPassword,
      ],
    );
    console.log("👑 Developer Admin User (kimmadoya) created.");

    // Inject the mandatory default workspace
    await connection.execute(
      `
      INSERT INTO \`workspaces\` (\`id\`, \`owner_id\`, \`name\`, \`slug\`)
      VALUES (?, ?, ?, ?)
    `,
      [
        1,
        "dev_admin_kimmadoya",
        "StudioFlow Dev Matrix",
        "studioflow-dev-matrix",
      ],
    );
    console.log("🏢 Dev Workspace (ID: 1) created and linked.");

    console.log("🚀 Database safely seeded! Ready to build.");
  } catch (error) {
    console.error("❌ Failed to seed foundation:", error);
  } finally {
    await connection.end();
  }
}

seed().catch(console.error);
