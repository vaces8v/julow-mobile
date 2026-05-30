let liveKitGlobalsReady = false;

/**
 * Register LiveKit/WebRTC globals. Call only before entering a meeting room —
 * not at app startup (crashes many release APKs when WebRTC init runs too early).
 */
export function ensureLiveKitGlobals(): void {
  if (liveKitGlobalsReady) return;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { registerGlobals } = require('@livekit/react-native') as typeof import('@livekit/react-native');
  registerGlobals();
  liveKitGlobalsReady = true;
}
