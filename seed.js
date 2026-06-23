// seed.js
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ Could not find DATABASE_URL in your environment.");
    process.exit(1);
  }

  // 🔒 SECURITY LOCK: Pulls your private password from your hidden .env file
  const plainPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!plainPassword) {
    console.error(
      "❌ SECURITY HALT: You must define ADMIN_SEED_PASSWORD in your .env file.",
    );
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: url,
    ssl: { rejectUnauthorized: true },
  });

  console.log("🌱 Rebuilding foundation with your secure Admin account...");

  try {
    // Hashes your hidden password so the raw text never touches the database
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // Inject Admin User
    await connection.execute(
      `
      INSERT INTO \`users\` (\`id\`, \`username\`, \`email\`, \`name\`, \`password_hash\`)
      VALUES (?, ?, ?, ?, ?)
    `,
      [
        "dev_admin_kimmadoya",
        "admin", // 👈 THIS specifically fixes your URL routing error!
        "kimmadoya@gmail.com", // Your private email
        "Kim Madoya", // Your name
        hashedPassword,
      ],
    );
    console.log("👑 Developer Admin User (admin) created securely.");

    // Inject the mandatory default workspace
    await connection.execute(
      `
      INSERT INTO \`workspaces\` (\`id\`, \`owner_id\`, \`name\`, \`slug\`)
      VALUES (?, ?, ?, ?)
    `,
      [
        1,
        "dev_admin_kimmadoya", // Links to your user ID above
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
