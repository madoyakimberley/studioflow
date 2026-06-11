import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Force dotenv to load the environment variables from the root .env file
dotenv.config({ path: "../../.env" });

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
});
