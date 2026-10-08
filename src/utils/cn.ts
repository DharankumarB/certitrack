/** Join class names, skipping falsy values. Tiny stand-in for clsx so we keep dependencies lean. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
