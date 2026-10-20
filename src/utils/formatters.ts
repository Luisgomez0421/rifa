/**
 * Formats a number (0-99) as a strictly 2-digit string with leading zero.
 * e.g. 0 -> "00", 7 -> "07", 99 -> "99"
 */
export const formatTwoDigits = (num: number | string): string => {
  const n = typeof num === 'string' ? parseInt(num, 10) : num;
  if (isNaN(n)) return '00';
  return Math.max(0, Math.min(99, n)).toString().padStart(2, '0');
};

/**
 * Formats a numeric amount in Colombian Pesos (COP).
 * e.g. 10000 -> "$10.000 COP"
 */
export const formatCOP = (amount: number): string => {
  const formatted = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);

  return `${formatted} COP`;
};

/**
 * Formats an ISO date into a user-friendly Colombian date & time.
 */
export const formatDate = (isoString?: string | null): string => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return isoString;
  }
};

/**
 * Computes human-readable minutes & seconds left until expiration.
 */
export const getMinutesAndSecondsLeft = (
  expiresAt?: string | null
): { minutes: number; seconds: number; isExpired: boolean } => {
  if (!expiresAt) return { minutes: 0, seconds: 0, isExpired: true };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { minutes: 0, seconds: 0, isExpired: true };

  const totalSecs = Math.floor(diff / 1000);
  const minutes = Math.floor(totalSecs / 60);
  const seconds = totalSecs % 60;
  return { minutes, seconds, isExpired: false };
};
