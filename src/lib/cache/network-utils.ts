import { ApiError } from '@/lib/api-client';

export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) {
    return (
      err.status === 0 ||
      err.status === 408 ||
      err.code === 'NETWORK_ERROR' ||
      err.code === 'TIMEOUT'
    );
  }
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes('network') || msg.includes('fetch') || msg.includes('timeout');
  }
  return false;
}

export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
