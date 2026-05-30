/**
 * Parse QR login token from scanned payload (HTTPS or custom scheme).
 */
export function parseQrLoginToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes('://')) {
      const url = new URL(trimmed);
      const token = url.searchParams.get('token');
      if (token && token.length >= 16) return token;
      const pathMatch = url.pathname.match(/\/qr\/([A-Za-z0-9_-]+)/);
      if (pathMatch?.[1]) return pathMatch[1];
    }
  } catch {
    /* not a URL */
  }

  const schemeMatch = trimmed.match(/qr-login\?token=([A-Za-z0-9_-]+)/);
  if (schemeMatch?.[1]) return schemeMatch[1];

  if (/^[A-Za-z0-9_-]{16,}$/.test(trimmed)) return trimmed;
  return null;
}
