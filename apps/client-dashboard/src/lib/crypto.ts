import crypto from "crypto";

// Ensure this 32-byte key is set in your main hosting platform's environment variables (e.g., Vercel/Render)
const ENCRYPTION_KEY = process.env.STUDIOFLOW_MASTER_ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, "hex").length !== 32) {
  throw new Error(
    "CRITICAL CONFIGURATION ERROR: STUDIOFLOW_MASTER_ENCRYPTION_KEY must be a valid 32-byte hex string.",
  );
}

export function encryptSecret(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY!, "hex"),
    iv,
  );

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Combine all vectors safely using a secure delimiter
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decryptSecret(ciphertext: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid cipher structure tracking token.");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY!, "hex"),
    iv,
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, undefined, "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
