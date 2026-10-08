const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true });
const shortDayFormatter = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' });
const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function toDate(value: string | Date | number): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDate(value: string | Date | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? '—' : dateFormatter.format(d);
}

export function formatShortDate(value: string | Date | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? '—' : shortDayFormatter.format(d);
}

export function formatTime(value: string | Date | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? '—' : timeFormatter.format(d).toUpperCase();
}

/** e.g. "08 Oct 2026, 10:42 AM" */
export function formatDateTime(value: string | Date | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return `${formatDate(value)}, ${formatTime(value)}`;
}

/** e.g. "5 min ago", "in 3 days" */
export function formatRelative(value: string | Date | number | null | undefined, now: number = Date.now()): string {
  if (value === null || value === undefined || value === '') return '—';
  const diffMs = toDate(value).getTime() - now;
  const abs = Math.abs(diffMs);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < 45_000) return 'just now';
  if (abs < hour) return relativeFormatter.format(Math.round(diffMs / minute), 'minute');
  if (abs < day) return relativeFormatter.format(Math.round(diffMs / hour), 'hour');
  if (abs < 30 * day) return relativeFormatter.format(Math.round(diffMs / day), 'day');
  return formatDate(value);
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatInr(amount: number): string {
  return inrFormatter.format(amount);
}

export function formatPercent(ratio: number, digits = 0): string {
  if (!Number.isFinite(ratio)) return '—';
  return `${(ratio * 100).toFixed(digits)}%`;
}

export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || !Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} h`;
  return `${(hours / 24).toFixed(1)} days`;
}

export function maskMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  return digits.length >= 4 ? `•••••• ${digits.slice(-4)}` : '••••••';
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '••••';
  return `${local.slice(0, 2)}•••@${domain}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function addDays(iso: string | Date, days: number): string {
  const d = toDate(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function startOfToday(now: number = Date.now()): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function toDateInputValue(value: string | Date): string {
  const d = toDate(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function greeting(now: number = Date.now()): string {
  const h = new Date(now).getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** Days with one decimal, or an em dash when there is no data yet. */
export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined || !Number.isFinite(days)) return '—';
  return `${days.toFixed(1)} days`;
}
