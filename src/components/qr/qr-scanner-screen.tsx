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
  Modal,
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
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';

const SCANNER_BG = '#0b1020';
const FRAME_RADIUS = 14;
const CORNER_LEN = 28;
const CORNER_THICK = 3;
const FRAME_PAD = 14;
const MIN_TRACK = 96;
const MAX_TRACK = 300;
const LOCK_DELAY_MS = 420;
const LOST_DELAY_MS = 1400;
const SUCCESS_FLASH_MS = 480;

const SPRING = { damping: 28, stiffness: 220, mass: 0.9, overshootClamping: true };
const SPRING_SNAP = { damping: 20, stiffness: 300, mass: 0.8, overshootClamping: true };
const TRACK_INTERVAL_MS = 33;

type Rect = { x: number; y: number; width: number; height: number };

function clamp(n: number, min: number, max: number) {
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

function applyRect(
  frameX: SharedValue<number>,
  frameY: SharedValue<number>,
  frameW: SharedValue<number>,
  frameH: SharedValue<number>,
  rect: Rect,
  snap = false,
) {
  'worklet';
  const cfg = snap ? SPRING_SNAP : SPRING;
  frameX.value = withSpring(rect.x, cfg);
  frameY.value = withSpring(rect.y, cfg);
  frameW.value = withSpring(rect.width, cfg);
  frameH.value = withSpring(rect.height, cfg);
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

const AnimatedSvgRect = Animated.createAnimatedComponent(Rect);

function ScannerDimOverlay({
  screenW,
  screenH,
  frameX,
  frameY,
  frameW,
  frameH,
}: {
  screenW: number;
  screenH: number;
  frameX: SharedValue<number>;
  frameY: SharedValue<number>;
  frameW: SharedValue<number>;
  frameH: SharedValue<number>;
}) {
  const cutoutProps = useAnimatedProps(() => ({
    x: frameX.value,
    y: frameY.value,
    width: frameW.value,
    height: frameH.value,
  }));

  return (
    <Svg width={screenW} height={screenH} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Mask id="qrScannerCutout">
          <Rect width={screenW} height={screenH} fill="white" />
          <AnimatedSvgRect
            animatedProps={cutoutProps}
            fill="black"
            rx={FRAME_RADIUS}
            ry={FRAME_RADIUS}
          />
        </Mask>
      </Defs>
      <Rect
        width={screenW}
        height={screenH}
        fill="rgba(11, 16, 32, 0.78)"
        mask="url(#qrScannerCutout)"
      />
    </Svg>
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
  const lastTrackAtRef = useRef(0);
  const lastRectRef = useRef<Rect | null>(null);

  const applyFrameRect = (rect: Rect, snap = false) => {
    runOnUI(applyRect)(frameX, frameY, frameW, frameH, rect, snap);
  };

  const baseFrame = useMemo(() => defaultFrame(screenW, screenH), [screenW, screenH]);

  const frameX = useSharedValue(baseFrame.x);
  const frameY = useSharedValue(baseFrame.y);
  const frameW = useSharedValue(baseFrame.width);
  const frameH = useSharedValue(baseFrame.height);
  const tracking = useSharedValue(0);
  const locked = useSharedValue(0);
  const successT = useSharedValue(0);
  const scanLineT = useSharedValue(0);
  const idlePulse = useSharedValue(0);

  useEffect(() => {
    applyFrameRect(baseFrame, true);
  }, [baseFrame]);

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

  const frameContainerStyle = useAnimatedStyle(() => ({
    left: frameX.value,
    top: frameY.value,
    width: frameW.value,
    height: frameH.value,
  }));

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
    transform: [{ translateY: frameH.value * 0.08 + frameH.value * 0.72 * scanLineT.value }],
    opacity: locked.value > 0.5 || successT.value > 0.2 ? 0 : 0.55,
  }));

  const resetToIdle = () => {
    tracking.value = withTiming(0, { duration: 180 });
    locked.value = withTiming(0, { duration: 180 });
    successT.value = withTiming(0, { duration: 180 });
    applyFrameRect(baseFrame);
  };

  const scheduleLostReset = () => {
    if (lostTimerRef.current) clearTimeout(lostTimerRef.current);
    lostTimerRef.current = setTimeout(() => {
      if (scannedRef.current || pendingTokenRef.current) return;
      resetToIdle();
    }, LOST_DELAY_MS);
  };

  const finalizeDetect = (token: string) => {
    triggerDetectHaptic();
    locked.value = withSpring(1, SPRING_SNAP);
    successT.value = withSpring(1, SPRING_SNAP);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setPendingToken(token);
      pendingTokenRef.current = token;
    }, SUCCESS_FLASH_MS);
  };

  const onBarcode = (result: BarcodeScanningResult) => {
    if (scannedRef.current || pendingTokenRef.current) return;

    const rect = extractQrRect(result, screenW, screenH);
    if (rect) {
      const now = Date.now();
      const prev = lastRectRef.current;
      const movedEnough =
        !prev ||
        Math.abs(prev.x - rect.x) > 2 ||
        Math.abs(prev.y - rect.y) > 2 ||
        Math.abs(prev.width - rect.width) > 2 ||
        Math.abs(prev.height - rect.height) > 2;

      if (movedEnough && now - lastTrackAtRef.current >= TRACK_INTERVAL_MS) {
        lastTrackAtRef.current = now;
        lastRectRef.current = rect;
        applyFrameRect(rect);
      }
      tracking.value = withTiming(1, { duration: 160 });
    }

    scheduleLostReset();

    const token = parseQrLoginToken(result.data);
    if (!token) return;

    if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    lockTimerRef.current = setTimeout(() => {
      if (scannedRef.current || pendingTokenRef.current) return;
      scannedRef.current = true;
      if (rect) applyFrameRect(rect, true);
      finalizeDetect(token);
    }, LOCK_DELAY_MS);
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
      setPendingToken(null);
      resetToIdle();
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelConfirm = () => {
    scannedRef.current = false;
    pendingTokenRef.current = null;
    setPendingToken(null);
    setError(null);
    resetToIdle();
  };

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
        screenH={screenH}
        frameX={frameX}
        frameY={frameY}
        frameW={frameW}
        frameH={frameH}
      />

      <Animated.View style={[styles.frameContainer, frameContainerStyle]} pointerEvents="none">
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

      <Modal visible={!!pendingToken} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={[styles.sheet, { backgroundColor: c.surface }]}>
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: SCANNER_BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frameContainer: {
    position: 'absolute',
    borderRadius: FRAME_RADIUS,
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
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700' },
  sheetBody: { fontSize: 15, lineHeight: 22 },
  sheetError: { fontSize: 13 },
  sheetPrimary: { marginTop: 4 },
  linkBtn: { marginTop: 8, alignItems: 'center' },
});
