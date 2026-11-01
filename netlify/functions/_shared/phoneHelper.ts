/**
 * Normalizes common Indonesian phone number formats to E.164.
 *
 * - `08xx...`   → `+628xx...`
 * - `628xx...`  → `+628xx...`
 * - `+628xx...` → kept as-is
 */
export function normalizePhoneToE164(phone: string): string {
  const cleaned = phone.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("+628")) return cleaned;
  if (cleaned.startsWith("08")) return "+62" + cleaned.slice(1);
  if (cleaned.startsWith("628")) return "+" + cleaned;

  return cleaned;
}
