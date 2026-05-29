import crypto from "node:crypto";

// Key for encrypting sensitive fields (trainee national number).
// In production set ENCRYPTION_KEY in Railway. A dev fallback keeps the app
// working locally with the fictional data, but is NOT secure for real data.
const DEV_KEY_SOURCE = "espace-partenaire-dev-key-change-me";

function getKey(): Buffer {
  const env = process.env.ENCRYPTION_KEY;
  const source = env && env.length >= 16 ? env : DEV_KEY_SOURCE;
  return crypto.createHash("sha256").update(source).digest(); // 32 bytes
}

export function encryptSensitive(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "enc:" + Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptSensitive(stored: string | null | undefined): string {
  if (!stored) return "";
  if (!stored.startsWith("enc:")) return stored; // plaintext fallback (legacy)
  try {
    const raw = Buffer.from(stored.slice(4), "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return "••••••";
  }
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pw, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(
  pw: string,
  stored: string | null | undefined
): boolean {
  if (!stored || !stored.startsWith("scrypt:")) return false;
  const [, salt, hash] = stored.split(":");
  const calc = crypto.scryptSync(pw, salt, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(calc, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
