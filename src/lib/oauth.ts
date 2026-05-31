/**
 * Mobile OAuth — unified flow for all providers with HTTPS callback bridge.
 *
 * Flow:
 *   1. GET  /auth/oauth/oauth_{provider}/authorize?redirect_uri=https://julow.ru/oauth/mobile-callback
 *   2. WebBrowser.openAuthSessionAsync(authorize_url, julowmobile://oauth/callback)
 *   3. /oauth/mobile-callback redirects browser to julowmobile://oauth/callback?code=...&state=...
 *   4. POST /auth/login/oauth { provider, authorization_code, redirect_uri }
 */

import * as WebBrowser from 'expo-web-browser';

import { authOAuthLogin, fetchOAuthAuthorizeUrl } from '@/lib/api-client';

export type MobileOAuthProvider = 'google' | 'github' | 'yandex';

const PROVIDER_CODES: Record<MobileOAuthProvider, string> = {
  google: 'oauth_google',
  github: 'oauth_github',
  yandex: 'oauth_yandex',
};

const DEFAULT_MOBILE_OAUTH_REDIRECT_URI = 'https://julow.ru/oauth/mobile-callback';
const MOBILE_OAUTH_RETURN_URI = 'julowmobile://oauth/callback';

export const MOBILE_OAUTH_REDIRECT_URI =
  (process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI ?? '').trim() || DEFAULT_MOBILE_OAUTH_REDIRECT_URI;

export function getMobileOAuthRedirectUri(): string {
  return MOBILE_OAUTH_REDIRECT_URI;
}

export class OAuthFlowError extends Error {
  readonly code: 'cancelled' | 'no_code' | 'provider_error' | 'network' | 'unknown';

  constructor(code: OAuthFlowError['code'], message: string) {
    super(message);
    this.name = 'OAuthFlowError';
    this.code = code;
  }
}

function parseCallbackUrl(resultUrl: string): { code: string | null; error: string | null } {
  try {
    const url = new URL(resultUrl);
    return {
      code: url.searchParams.get('code'),
      error: url.searchParams.get('error'),
    };
  } catch {
    const codeMatch = resultUrl.match(/[?&]code=([^&]+)/);
    const errMatch = resultUrl.match(/[?&]error=([^&]+)/);
    return {
      code: codeMatch?.[1] ? decodeURIComponent(codeMatch[1]) : null,
      error: errMatch?.[1] ? decodeURIComponent(errMatch[1]) : null,
    };
  }
}

WebBrowser.maybeCompleteAuthSession();

export async function signInWithOAuth(provider: MobileOAuthProvider): Promise<{
  userId: string;
  email: string;
}> {
  const redirectUri = getMobileOAuthRedirectUri();
  const providerCode = PROVIDER_CODES[provider];

  const authorizeUrl = await fetchOAuthAuthorizeUrl(providerCode, redirectUri);

  const session = await WebBrowser.openAuthSessionAsync(authorizeUrl, MOBILE_OAUTH_RETURN_URI, {
    preferEphemeralSession: false,
  });

  if (session.type === 'cancel' || session.type === 'dismiss') {
    throw new OAuthFlowError('cancelled', 'OAuth cancelled');
  }

  if (session.type !== 'success' || !session.url) {
    throw new OAuthFlowError('unknown', 'OAuth session failed');
  }

  const { code, error } = parseCallbackUrl(session.url);
  if (error) {
    throw new OAuthFlowError('provider_error', error);
  }
  if (!code) {
    throw new OAuthFlowError('no_code', 'No authorization code in callback');
  }

  return authOAuthLogin({
    provider: providerCode,
    authorizationCode: code,
    redirectUri,
  });
}
