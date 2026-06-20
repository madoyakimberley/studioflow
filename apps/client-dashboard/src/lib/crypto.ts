import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";

/**
 * Lazily resolves and validates the encryption key at runtime.
 * Prevents module evaluation crashes during server boot or routing pipeline builds.
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.STUDIOFLOW_MASTER_ENCRYPTION_KEY;

  if (!keyEnv || Buffer.from(keyEnv, "hex").length !== 32) {
    throw new Error(
      "CRITICAL CONFIGURATION ERROR: STUDIOFLOW_MASTER_ENCRYPTION_KEY must be a valid 32-byte hex string (64 characters).",
    );
  }

  return Buffer.from(keyEnv, "hex");
}

/**
 * Encrypts cleartext payload strings using AES-256-CBC
 */
export function encryptSecret(text: string): string {
  if (!text) return "";

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts automated system credentials at runtime
 */
export function decryptSecret(encryptedText: string): string {
  if (!encryptedText) return "";

  const key = getEncryptionKey();
  const [ivHex, encryptedHex] = encryptedText.split(":");

  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted text token structural formatting.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
