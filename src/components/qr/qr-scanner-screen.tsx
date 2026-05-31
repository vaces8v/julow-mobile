/* eslint-disable react-hooks/immutability -- Reanimated SharedValues are mutated in scan handlers and effects. */
import { authConfirmQrLogin } from '@/lib/api-client';
import { parseQrLoginToken } from '@/lib/qr-login';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { ArrowLeft01Icon, QrCodeScanIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { Button } from 'heroui-native';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  runOnUI,
  type SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCANNER_BG = '#0b1020';
const FRAME_RADIUS = 14;
const CORNER_LEN = 28;
const CORNER_THICK = 3;
const FRAME_PAD = 14;
const MIN_TRACK = 96;
const MAX_TRACK = 300;
/** Brief frame snap before lock; must not reset on repeated barcode events. */
const LOCK_DELAY_MS = 120;
const LOST_DELAY_MS = 1400;
const SUCCESS_FLASH_MS = 360;

const SPRING_SNAP = { damping: 20, stiffness: 300, mass: 0.8, overshootClamping: true };
const TRACK_LERP = 0.32;
const IDLE_LERP = 0.18;
const TRACKING_RAMP = 0.12;
const TRACKING_DECAY = 0.08;
const REST_POS_EPS = 0.25;
const REST_SCALE_EPS = 0.002;

type Rect = { x: number; y: number; width: number; height: number };

function clamp(n: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(n, min), max);
}

function defaultFrame(screenW: number, screenH: number): Rect {
  const size = clamp(screenW * 0.68, MIN_TRACK, 280);
  return {
    x: (screenW - size) / 2,
    y: (screenH - size) / 2,
    width: size,
    height: size,
  };
}

function extractQrRect(result: BarcodeScanningResult, screenW: number, screenH: number): Rect | null {
  const { bounds, cornerPoints } = result;

  if (cornerPoints.length >= 4) {
    const xs = cornerPoints.map((p) => p.x);
    const ys = cornerPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const w = maxX - minX;
    const h = maxY - minY;
    if (w > 12 && h > 12) {
      return normalizeRect(
        {
          x: minX - FRAME_PAD,
          y: minY - FRAME_PAD,
          width: w + FRAME_PAD * 2,
          height: h + FRAME_PAD * 2,
        },
        screenW,
        screenH,
      );
    }
  }

  if (bounds.size.width > 8 && bounds.size.height > 8) {
    return normalizeRect(
      {
        x: bounds.origin.x - FRAME_PAD,
        y: bounds.origin.y - FRAME_PAD,
        width: bounds.size.width + FRAME_PAD * 2,
        height: bounds.size.height + FRAME_PAD * 2,
      },
      screenW,
      screenH,
    );
  }

  return null;
}

function normalizeRect(rect: Rect, screenW: number, screenH: number): Rect {
  const width = clamp(rect.width, MIN_TRACK, MAX_TRACK);
  const height = clamp(rect.height, MIN_TRACK, MAX_TRACK);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const x = clamp(cx - width / 2, 8, screenW - width - 8);
  const y = clamp(cy - height / 2, 8, screenH - height - 8);
  return { x, y, width, height };
}

function triggerDetectHaptic() {
  if (Platform.OS === 'android') {
    Vibration.vibrate(36);
  } else {
    Vibration.vibrate(10);
  }
}

function rectToTarget(rect: Rect, baseSize: number) {
  'worklet';
  return {
    cx: rect.x + rect.width / 2,
    cy: rect.y + rect.height / 2,
    scale: clamp(rect.width / baseSize, MIN_TRACK / baseSize, MAX_TRACK / baseSize),
  };
}

function setTargetFromRect(
  targetCX: SharedValue<number>,
  targetCY: SharedValue<number>,
  targetScale: SharedValue<number>,
  trackingActive: SharedValue<number>,
  rect: Rect,
  baseSize: number,
) {
  'worklet';
  const next = rectToTarget(rect, baseSize);
  targetCX.value = next.cx;
  targetCY.value = next.cy;
  targetScale.value = next.scale;
  trackingActive.value = 1;
}

function resetTargetIdle(
  targetCX: SharedValue<number>,
  targetCY: SharedValue<number>,
  targetScale: SharedValue<number>,
  trackingActive: SharedValue<number>,
  baseFrame: Rect,
) {
  'worklet';
  targetCX.value = baseFrame.x + baseFrame.width / 2;
  targetCY.value = baseFrame.y + baseFrame.height / 2;
  targetScale.value = 1;
  trackingActive.value = 0;
}

function snapFrameInstant(
  frameCX: SharedValue<number>,
  frameCY: SharedValue<number>,
  frameScale: SharedValue<number>,
  targetCX: SharedValue<number>,
  targetCY: SharedValue<number>,
  targetScale: SharedValue<number>,
) {
  'worklet';
  frameCX.value = targetCX.value;
  frameCY.value = targetCY.value;
  frameScale.value = targetScale.value;
}

function BracketCorner({
  position,
  pulse,
  cornerColor,
  flipH,
  flipV,
  rotate180,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br';
  pulse: ReturnType<typeof useAnimatedStyle>;
  cornerColor: ReturnType<typeof useAnimatedStyle>;
  flipH?: boolean;
  flipV?: boolean;
  rotate180?: boolean;
}) {
  const posStyle =
    position === 'tl'
      ? styles.cornerTL
      : position === 'tr'
        ? styles.cornerTR
        : position === 'bl'
          ? styles.cornerBL
          : styles.cornerBR;
  const outerRadius =
    position === 'tl'
      ? { borderTopLeftRadius: FRAME_RADIUS }
      : position === 'tr'
        ? { borderTopRightRadius: FRAME_RADIUS }
        : position === 'bl'
          ? { borderBottomLeftRadius: FRAME_RADIUS }
          : { borderBottomRightRadius: FRAME_RADIUS };

  return (
    <Animated.View style={[posStyle, pulse]}>
      <Animated.View
        style={[
          styles.bracket,
          flipH && styles.bracketFlipH,
          flipV && styles.bracketFlipV,
          rotate180 && styles.bracketRotate180,
        ]}
      >
        <Animated.View style={[styles.bracketH, outerRadius, cornerColor]} />
        <Animated.View style={[styles.bracketV, outerRadius, cornerColor]} />
      </Animated.View>
    </Animated.View>
  );
}

function ScannerDimOverlay({
  screenW,
  overlayH,
  navBarFill,
  frameCX,
  frameCY,
  frameScale,
  baseSize,
}: {
  screenW: number;
  /** Full drawable height including Android system nav bar. */
  overlayH: number;
  navBarFill: number;
  frameCX: SharedValue<number>;
  frameCY: SharedValue<number>;
  frameScale: SharedValue<number>;
  baseSize: number;
}) {
  const dim = 'rgba(11, 16, 32, 0.78)';

  const holeHalf = useDerivedValue(() => (baseSize * frameScale.value) / 2);
  const holeTop = useDerivedValue(() => frameCY.value - holeHalf.value);
  const holeBottom = useDerivedValue(() => frameCY.value + holeHalf.value);
  const holeLeft = useDerivedValue(() => frameCX.value - holeHalf.value);
  const holeRight = useDerivedValue(() => frameCX.value + holeHalf.value);
  const holeHeight = useDerivedValue(() => baseSize * frameScale.value);

  const topStyle = useAnimatedStyle(() => ({
    height: Math.max(0, holeTop.value),
  }));

  const bottomStyle = useAnimatedStyle(() => ({
    top: holeBottom.value,
    height: Math.max(0, overlayH - holeBottom.value),
  }));

  const leftStyle = useAnimatedStyle(() => ({
    top: holeTop.value,
    width: Math.max(0, holeLeft.value),
    height: holeHeight.value,
  }));

  const rightStyle = useAnimatedStyle(() => ({
    top: holeTop.value,
    left: holeRight.value,
    width: Math.max(0, screenW - holeRight.value),
    height: holeHeight.value,
  }));

  return (
    <View style={[styles.dimRoot, { width: screenW, height: overlayH }]} pointerEvents="none">
      <Animated.View style={[styles.dimPanel, { width: screenW, backgroundColor: dim }, topStyle]} />
      <Animated.View style={[styles.dimPanel, { width: screenW, backgroundColor: dim }, bottomStyle]} />
      <Animated.View style={[styles.dimPanel, { backgroundColor: dim }, leftStyle]} />
      <Animated.View style={[styles.dimPanel, { backgroundColor: dim }, rightStyle]} />
      {navBarFill > 0 ? (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: navBarFill,
            backgroundColor: dim,
          }}
        />
      ) : null}
    </View>
  );
}

function SuccessFlash({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.6);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      scale.value = 0.6;
      return;
    }
    opacity.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 320, easing: Easing.in(Easing.cubic) }),
    );
    scale.value = withSpring(1, { damping: 14, stiffness: 260 });
  }, [opacity, scale, visible]);

  const wrap = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <View style={styles.successOverlay} pointerEvents="none">
      <Animated.View style={[styles.successBadge, wrap]}>
        <HugeiconsIcon icon={Tick02Icon} size={42} color="#ecfdf5" strokeWidth={2.2} />
      </Animated.View>
    </View>
  );
}

function PermissionEmptyState({
  title,
  body,
  primaryLabel,
  onPrimary,
  onBack,
  backLabel,
}: {
  title: string;
  body: string;
  primaryLabel: string;
  onPrimary: () => void;
  onBack: () => void;
  backLabel: string;
}) {
  const c = useSemanticTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.permissionRoot, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />
      <Pressable onPress={onBack} hitSlop={14} style={styles.permissionBack}>
        <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color="#f4f4f5" strokeWidth={1.8} />
      </Pressable>
      <View style={styles.permissionContent}>
        <View style={styles.permissionIconWrap}>
          <HugeiconsIcon icon={QrCodeScanIcon} size={36} color="#93c5fd" strokeWidth={1.8} />
        </View>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionBody}>{body}</Text>
        <Button variant="primary" onPress={onPrimary} style={styles.permissionBtn}>
          <Button.Label>{primaryLabel}</Button.Label>
        </Button>
        <Pressable onPress={onBack} style={styles.permissionLink}>
          <Text style={{ color: c.muted }}>{backLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function QrScannerScreen() {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const q = t.settings.qrLogin;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const scannedRef = useRef(false);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTokenRef = useRef<string | null>(null);
  const lockingTokenRef = useRef<string | null>(null);
  const lastRectRef = useRef<Rect | null>(null);

  const overlayH = screenH + insets.bottom;

  const baseFrame = useMemo(() => defaultFrame(screenW, screenH), [screenW, screenH]);
  const baseSize = baseFrame.width;

  const targetCX = useSharedValue(baseFrame.x + baseSize / 2);
  const targetCY = useSharedValue(baseFrame.y + baseSize / 2);
  const targetScale = useSharedValue(1);
  const trackingActive = useSharedValue(0);

  const frameCX = useSharedValue(baseFrame.x + baseSize / 2);
  const frameCY = useSharedValue(baseFrame.y + baseSize / 2);
  const frameScale = useSharedValue(1);
  const tracking = useSharedValue(0);
  const locked = useSharedValue(0);
  const successT = useSharedValue(0);
  const scanLineT = useSharedValue(0);
  const idlePulse = useSharedValue(0);

  useFrameCallback(() => {
    'worklet';
    const trackingOn = trackingActive.value > 0.5;
    const lerpFactor = trackingOn ? TRACK_LERP : IDLE_LERP;

    const cx = frameCX.value;
    const cy = frameCY.value;
    const sc = frameScale.value;
    const dcx = targetCX.value - cx;
    const dcy = targetCY.value - cy;
    const dsc = targetScale.value - sc;
    const dist2 = dcx * dcx + dcy * dcy;
    const atRest = dist2 <= REST_POS_EPS * REST_POS_EPS && Math.abs(dsc) <= REST_SCALE_EPS;
    const tr = tracking.value;

    if (!trackingOn && atRest && tr <= 0) {
      return;
    }

    if (!atRest) {
      frameCX.value = cx + dcx * lerpFactor;
      frameCY.value = cy + dcy * lerpFactor;
      frameScale.value = sc + dsc * lerpFactor;
    } else {
      frameCX.value = targetCX.value;
      frameCY.value = targetCY.value;
      frameScale.value = targetScale.value;
    }

    if (trackingOn) {
      if (tr < 1) tracking.value = Math.min(1, tr + TRACKING_RAMP);
    } else if (tr > 0) {
      tracking.value = Math.max(0, tr - TRACKING_DECAY);
    }
  });

  useEffect(() => {
    runOnUI(resetTargetIdle)(targetCX, targetCY, targetScale, trackingActive, baseFrame);
    frameCX.value = baseFrame.x + baseSize / 2;
    frameCY.value = baseFrame.y + baseSize / 2;
    frameScale.value = 1;
  }, [baseFrame, baseSize, frameCX, frameCY, frameScale, targetCX, targetCY, targetScale, trackingActive]);

  useEffect(() => {
    scanLineT.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    idlePulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })),
      -1,
      true,
    );
    return () => {
      cancelAnimation(scanLineT);
      cancelAnimation(idlePulse);
    };
  }, [idlePulse, scanLineT]);

  const frameContainerStyle = useAnimatedStyle(() => {
    const half = baseSize / 2;
    return {
      transform: [
        { translateX: frameCX.value - half },
        { translateY: frameCY.value - half },
        { scale: frameScale.value },
      ],
    };
  });

  const cornerColorStyle = useAnimatedStyle(() => {
    const tracked = interpolateColor(
      tracking.value,
      [0, 1],
      ['rgba(255,255,255,0.92)', 'rgba(96,165,250,0.98)'],
    );
    if (successT.value > 0.5 || locked.value > 0.5) {
      return { backgroundColor: 'rgba(52,211,153,0.98)' };
    }
    return { backgroundColor: tracked };
  });

  const cornerPulseStyle = useAnimatedStyle(() => ({
    opacity: 0.86 + idlePulse.value * 0.1 + tracking.value * 0.04,
    transform: [{ scale: 1 + locked.value * 0.018 + successT.value * 0.04 }],
  }));

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: baseSize * 0.08 + baseSize * 0.72 * scanLineT.value }],
    opacity: locked.value > 0.5 || successT.value > 0.2 ? 0 : 0.55,
  }));

  const resetToIdle = () => {
    locked.value = withTiming(0, { duration: 180 });
    successT.value = withTiming(0, { duration: 180 });
    runOnUI(resetTargetIdle)(targetCX, targetCY, targetScale, trackingActive, baseFrame);
  };

  const scheduleLostReset = () => {
    if (lostTimerRef.current) clearTimeout(lostTimerRef.current);
    lostTimerRef.current = setTimeout(() => {
      if (scannedRef.current || pendingTokenRef.current || lockingTokenRef.current) return;
      resetToIdle();
    }, LOST_DELAY_MS);
  };

  const finalizeDetect = (token: string) => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
    lockingTokenRef.current = token;
    triggerDetectHaptic();
    locked.value = withSpring(1, SPRING_SNAP);
    successT.value = withSpring(1, SPRING_SNAP);
    setShowSuccess(true);
    setPendingToken(token);
    pendingTokenRef.current = token;
    setTimeout(() => setShowSuccess(false), SUCCESS_FLASH_MS);
  };

  const onBarcode = (result: BarcodeScanningResult) => {
    if (scannedRef.current || pendingTokenRef.current) return;

    const rect = extractQrRect(result, screenW, screenH);
    if (rect) {
      lastRectRef.current = rect;
      runOnUI(setTargetFromRect)(targetCX, targetCY, targetScale, trackingActive, rect, baseSize);
    }

    scheduleLostReset();

    const token = parseQrLoginToken(result.data);
    if (!token) return;

    if (lockingTokenRef.current === token || pendingTokenRef.current === token) return;

    if (!lockingTokenRef.current) {
      lockingTokenRef.current = token;
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      lockTimerRef.current = setTimeout(() => {
        lockTimerRef.current = null;
        if (scannedRef.current || pendingTokenRef.current) return;
        if (lockingTokenRef.current !== token) return;
        scannedRef.current = true;
        const lockRect = lastRectRef.current ?? rect;
        if (lockRect) {
          runOnUI(setTargetFromRect)(targetCX, targetCY, targetScale, trackingActive, lockRect, baseSize);
          runOnUI(snapFrameInstant)(frameCX, frameCY, frameScale, targetCX, targetCY, targetScale);
        }
        finalizeDetect(token);
      }, LOCK_DELAY_MS);
    }
  };

  useEffect(() => {
    return () => {
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
      if (lostTimerRef.current) clearTimeout(lostTimerRef.current);
    };
  }, []);

  const handleConfirm = async () => {
    if (!pendingToken) return;
    setConfirming(true);
    setError(null);
    try {
      await authConfirmQrLogin(pendingToken);
      router.back();
    } catch {
      setError(q.confirmFailed);
      scannedRef.current = false;
      pendingTokenRef.current = null;
      lockingTokenRef.current = null;
      setPendingToken(null);
      resetToIdle();
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelConfirm = () => {
    scannedRef.current = false;
    pendingTokenRef.current = null;
    lockingTokenRef.current = null;
    setPendingToken(null);
    setError(null);
    resetToIdle();
  };

  const sheetBottomPad = Math.max(insets.bottom, 16) + 16;

  const scanningEnabled = !pendingToken && !showSuccess;

  if (!permission) {
    return (
      <View style={[styles.centered, { backgroundColor: SCANNER_BG }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  if (!permission.granted) {
    const openSettings = () => void Linking.openSettings();
    return (
      <PermissionEmptyState
        title={q.permissionTitle}
        body={q.permissionBody}
        primaryLabel={permission.canAskAgain ? q.permissionCta : q.permissionSettings}
        onPrimary={permission.canAskAgain ? () => void requestPermission() : openSettings}
        onBack={() => router.back()}
        backLabel={q.cancel}
      />
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanningEnabled ? onBarcode : undefined}
      />

      <ScannerDimOverlay
        screenW={screenW}
        overlayH={overlayH}
        navBarFill={insets.bottom}
        frameCX={frameCX}
        frameCY={frameCY}
        frameScale={frameScale}
        baseSize={baseSize}
      />

      <Animated.View
        style={[styles.frameContainer, { width: baseSize, height: baseSize }, frameContainerStyle]}
        pointerEvents="none"
      >
        <BracketCorner position="tl" pulse={cornerPulseStyle} cornerColor={cornerColorStyle} />
        <BracketCorner position="tr" pulse={cornerPulseStyle} cornerColor={cornerColorStyle} flipH />
        <BracketCorner position="bl" pulse={cornerPulseStyle} cornerColor={cornerColorStyle} flipV />
        <BracketCorner position="br" pulse={cornerPulseStyle} cornerColor={cornerColorStyle} rotate180 />
        <Animated.View style={[styles.scanLine, scanLineStyle]} />
      </Animated.View>

      <SuccessFlash visible={showSuccess} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <Pressable onPress={() => router.back()} hitSlop={14} style={styles.backBtn}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color="#f8fafc" strokeWidth={1.8} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t.settings.scanQrLogin}</Text>
          <Text style={styles.headerSubtitle}>{q.scanHint}</Text>
        </View>
      </View>

      {pendingToken ? (
        <View
          style={[styles.sheetBackdrop, { height: overlayH }]}
          pointerEvents="box-none"
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={handleCancelConfirm}
            disabled={confirming}
            accessibilityRole="button"
            accessibilityLabel={q.confirmCancel}
          />
          <View
            style={[
              styles.sheet,
              { backgroundColor: c.surface, paddingBottom: sheetBottomPad },
            ]}
          >
            <Text style={[styles.sheetTitle, { color: c.foreground }]}>{q.confirmTitle}</Text>
            <Text style={[styles.sheetBody, { color: c.muted }]}>{q.confirmBody}</Text>
            {error ? <Text style={[styles.sheetError, { color: c.danger }]}>{error}</Text> : null}
            <Button
              variant="primary"
              onPress={() => void handleConfirm()}
              isDisabled={confirming}
              style={styles.sheetPrimary}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Button.Label>{q.confirmCta}</Button.Label>
              )}
            </Button>
            <Pressable onPress={handleCancelConfirm} disabled={confirming} style={styles.linkBtn}>
              <Text style={{ color: c.muted }}>{q.confirmCancel}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCANNER_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frameContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: FRAME_RADIUS,
  },
  dimRoot: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  dimPanel: {
    position: 'absolute',
    left: 0,
  },
  cornerTL: { position: 'absolute', top: 0, left: 0 },
  cornerTR: { position: 'absolute', top: 0, right: 0 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0 },
  bracket: {
    width: CORNER_LEN,
    height: CORNER_LEN,
  },
  bracketFlipH: { transform: [{ scaleX: -1 }] },
  bracketFlipV: { transform: [{ scaleY: -1 }] },
  bracketRotate180: { transform: [{ rotate: '180deg' }] },
  bracketH: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER_LEN,
    height: CORNER_THICK,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  bracketV: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CORNER_THICK,
    height: CORNER_LEN,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  scanLine: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(96,165,250,0.85)',
    shadowColor: '#60a5fa',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 4,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 16, 32, 0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerText: {
    marginTop: 12,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  headerSubtitle: {
    color: 'rgba(226,232,240,0.78)',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 300,
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  successBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.92)',
    borderWidth: 2,
    borderColor: 'rgba(167,243,208,0.5)',
    shadowColor: '#10b981',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
  },
  permissionRoot: {
    flex: 1,
    backgroundColor: SCANNER_BG,
    paddingHorizontal: 28,
  },
  permissionBack: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  permissionIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.28)',
    marginBottom: 20,
  },
  permissionTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionBody: {
    color: 'rgba(161,161,170,0.95)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 320,
  },
  permissionBtn: { alignSelf: 'stretch' },
  permissionLink: { marginTop: 18, alignItems: 'center' },
  sheetBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700' },
  sheetBody: { fontSize: 15, lineHeight: 22 },
  sheetError: { fontSize: 13 },
  sheetPrimary: { marginTop: 4 },
  linkBtn: { marginTop: 8, alignItems: 'center' },
});
