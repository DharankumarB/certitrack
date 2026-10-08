import type { MimeType } from '../types';

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

export const FILE_LIMITS = {
  maxBytes: 5 * 1024 * 1024,
  minBytes: 1024,
  acceptAttr: '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png',
  label: 'PDF, JPG or PNG · up to 5 MB',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** Indian mobile: 10 digits, starts with 6-9. Accepts a leading +91 or 0. */
export function normalizeMobile(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

export function isValidMobile(value: string): boolean {
  return /^[6-9]\d{9}$/.test(normalizeMobile(value));
}

export function validateRequired(value: string | undefined | null, label: string): string | undefined {
  return value && value.trim() ? undefined : `${label} is required.`;
}

export function validateName(value: string): string | undefined {
  const v = value.trim();
  if (!v) return 'Full name is required.';
  if (v.length < 2) return 'Enter your full name as shown on your ID (at least 2 characters).';
  if (!/^[\p{L}][\p{L}\s.'-]*$/u.test(v)) return 'Use letters only (spaces, dots and apostrophes allowed).';
  return undefined;
}

export function validateDob(value: string, now: number = Date.now()): string | undefined {
  if (!value) return 'Date of birth is required.';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 'Enter a valid date of birth.';
  if (d.getFullYear() < 1900) return 'Date of birth must be after 1900.';
  if (d.getTime() > now) return 'Date of birth cannot be in the future.';
  return undefined;
}

export function validatePastDate(value: string, label: string, now: number = Date.now()): string | undefined {
  if (!value) return `${label} is required.`;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return `Enter a valid ${label.toLowerCase()}.`;
  if (d.getTime() > now) return `${label} cannot be in the future.`;
  return undefined;
}

export function validatePassword(value: string): string | undefined {
  if (value.length < 10) return 'Password must be at least 10 characters.';
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value) || !/[^A-Za-z0-9]/.test(value)) {
    return 'Use uppercase and lowercase letters, a number, and a symbol.';
  }
  return undefined;
}

export function validateNumber(value: string, label: string, min: number, max: number): string | undefined {
  if (value.trim() === '') return `${label} is required.`;
  const n = Number(value);
  if (!Number.isFinite(n) || !/^\d+(\.\d+)?$/.test(value.trim())) return `${label} must be a number.`;
  if (n < min || n > max) return `${label} must be between ${min.toLocaleString('en-IN')} and ${max.toLocaleString('en-IN')}.`;
  return undefined;
}

/** Looks at the first bytes of a file (magic numbers), not just its extension. */
export function detectMime(bytes: Uint8Array): MimeType | null {
  if (bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf'; // %PDF
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  return null;
}

export async function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  const head = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  if (head.length < 8) return null;

  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) {
    if (head.length < 24 || ![0x49, 0x48, 0x44, 0x52].every((value, index) => head[4 + index] === value)) return null;
    const width = (head[8] << 24) | (head[9] << 16) | (head[10] << 8) | head[11];
    const height = (head[12] << 24) | (head[13] << 16) | (head[14] << 8) | head[15];
    return { width, height };
  }

  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    let offset = 2;
    while (offset < head.length - 1) {
      if (head[offset] !== 0xff) break;
      const marker = head[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker >= 0xc0 && marker <= 0xc3) {
        const length = (head[offset + 2] << 8) | head[offset + 3];
        if (offset + 7 + length > head.length) return null;
        const height = (head[offset + 5] << 8) | head[offset + 6];
        const width = (head[offset + 7] << 8) | head[offset + 8];
        return { width, height };
      }
      if (offset + 4 > head.length) return null;
      const length = (head[offset + 2] << 8) | head[offset + 3];
      offset += 2 + length;
    }
  }

  return null;
}

export type FileCheck = { ok: true; mimeType: MimeType } | { ok: false; error: string };

/** Validates type (by content), size and minimum readable dimensions. Used before any file is accepted. */
export async function validateFile(file: File): Promise<FileCheck> {
  if (file.size === 0) return { ok: false, error: 'This file is empty. Choose another file.' };
  if (file.size > FILE_LIMITS.maxBytes) {
    return { ok: false, error: `This file is ${(file.size / (1024 * 1024)).toFixed(1)} MB. The maximum is 5 MB.` };
  }
  if (file.size < FILE_LIMITS.minBytes) return { ok: false, error: 'This file looks too small to be a readable scan.' };
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const mimeType = detectMime(head);
  if (!mimeType) {
    return { ok: false, error: 'Only PDF, JPG and PNG files are accepted. This file is a different type or is corrupted.' };
  }
  if (mimeType !== 'application/pdf') {
    const dimensions = await readImageDimensions(file);
    if (!dimensions) {
      return { ok: false, error: 'This image is corrupted or too broken to be reviewed as a government document.' };
    }
    if (dimensions.width < 160 || dimensions.height < 160) {
      return { ok: false, error: 'This image is too small to contain a readable government document.' };
    }
  }
  return { ok: true, mimeType };
}
