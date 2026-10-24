import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Dynamic key derivation supporting runtime process.env values and backward compatibility
const getEncryptionKeys = (): Buffer[] => {
  const primarySecret = process.env.OTP_SECRET || process.env.JWT_SECRET || 'foodbridge_secure_otp_vault_key_2026';
  const fallbackSecret = 'foodbridge_secure_otp_vault_key_2026';
  
  const keys = [crypto.createHash('sha256').update(primarySecret).digest()];
  if (primarySecret !== fallbackSecret) {
    keys.push(crypto.createHash('sha256').update(fallbackSecret).digest());
  }
  return keys;
};

const IV_LENGTH = 16;

/**
 * Generate a cryptographically secure 4-digit numeric OTP (1000 - 9999).
 * Uses Node.js crypto.randomInt(), an OS-level CSPRNG.
 */
export const generateSecureOtp = (): string => {
  return crypto.randomInt(1000, 10000).toString();
};

/**
 * Hash an OTP using bcrypt with salt rounds for secure one-way verification storage.
 */
export const hashOtp = (otp: string): string => {
  return bcrypt.hashSync(otp.trim(), 10);
};

/**
 * Compare an entered plaintext OTP against the stored bcrypt hash.
 */
export const verifyOtpHash = (otp: string, hash: string): boolean => {
  if (!otp || !hash) return false;
  try {
    return bcrypt.compareSync(otp.trim(), hash);
  } catch {
    return false;
  }
};

/**
 * Encrypt an OTP using AES-256-CBC so only authorized backend workflows can decrypt
 * and display it to the authenticated provider, without exposing plaintext in MongoDB.
 */
export const encryptOtp = (otp: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKeys()[0];
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(otp.trim(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt an AES-256-CBC encrypted OTP ciphertext.
 * Attempts primary key and fallback key for complete backwards compatibility.
 */
export const decryptOtp = (encryptedOtp: string): string | null => {
  try {
    if (!encryptedOtp || typeof encryptedOtp !== 'string') return null;
    const parts = encryptedOtp.split(':');
    if (parts.length !== 2) return null;
    const [ivHex, encryptedText] = parts;
    const iv = Buffer.from(ivHex, 'hex');

    const keys = getEncryptionKeys();
    for (const key of keys) {
      try {
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        const clean = decrypted.trim();
        if (/^\d{4}$/.test(clean)) {
          return clean;
        }
      } catch {
        // Try next key
      }
    }
    return null;
  } catch {
    return null;
  }
};
