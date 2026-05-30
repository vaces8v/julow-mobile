import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';

const ART_W = 230;
const ART_H = 210;
const CX = ART_W * 0.66;
const CY = ART_H * 0.36;

export function meetingRippleIconColor(isDark: boolean) {
  return isDark ? '#b0b0b8' : '#5c5c66';
}

type Props = {
  isDark: boolean;
};

/** Wide, multi-stop radial ring — mimics a large blur radius without BlurMask. */
function diffuseRingColors(isDark: boolean, peak: number) {
  const rgb = isDark ? '176,176,184' : '92,92,102';
  return [
    'rgba(0,0,0,0)',
    'rgba(0,0,0,0)',
    `rgba(${rgb},${peak * 0.05})`,
    `rgba(${rgb},${peak * 0.18})`,
    `rgba(${rgb},${peak * 0.42})`,
    `rgba(${rgb},${peak * 0.72})`,
    `rgba(${rgb},${peak})`,
    `rgba(${rgb},${peak * 0.62})`,
    `rgba(${rgb},${peak * 0.28})`,
    `rgba(${rgb},${peak * 0.08})`,
    'rgba(0,0,0,0)',
  ] as const;
}

/** Positions tuned for a broad ring band with long transparent tails. */
function diffuseRingPositions(ringCenter: number, ringSpread: number) {
  const inner = ringCenter - ringSpread;
  const outer = ringCenter + ringSpread;
  return [
    0,
    Math.max(0, inner - 0.14),
    inner - 0.06,
    inner + ringSpread * 0.35,
    inner + ringSpread * 0.65,
    ringCenter,
    outer - ringSpread * 0.35,
    outer + ringSpread * 0.25,
    outer + 0.08,
    outer + 0.16,
    1,
  ] as const;
}

function centerBloomColors(isDark: boolean) {
  const rgb = isDark ? '176,176,184' : '92,92,102';
  return [
    isDark ? `rgba(${rgb},0.05)` : `rgba(${rgb},0.035)`,
    isDark ? `rgba(${rgb},0.025)` : `rgba(${rgb},0.018)`,
    isDark ? `rgba(${rgb},0.01)` : `rgba(${rgb},0.007)`,
    'rgba(0,0,0,0)',
  ] as const;
}

export function MeetingCardRippleArt({ isDark }: Props) {
  return (
    <Canvas style={{ width: ART_W, height: ART_H }}>
      {/* Outermost ambient bloom */}
      <Circle cx={CX} cy={CY} r={108}>
        <RadialGradient
          c={vec(CX, CY)}
          r={108}
          colors={[...diffuseRingColors(isDark, 0.05)]}
          positions={[...diffuseRingPositions(0.8, 0.14)]}
        />
      </Circle>
      <Circle cx={CX} cy={CY} r={94}>
        <RadialGradient
          c={vec(CX, CY)}
          r={94}
          colors={[...diffuseRingColors(isDark, 0.07)]}
          positions={[...diffuseRingPositions(0.78, 0.13)]}
        />
      </Circle>
      <Circle cx={CX} cy={CY} r={76}>
        <RadialGradient
          c={vec(CX, CY)}
          r={76}
          colors={[...diffuseRingColors(isDark, 0.1)]}
          positions={[...diffuseRingPositions(0.76, 0.12)]}
        />
      </Circle>
      <Circle cx={CX} cy={CY} r={58}>
        <RadialGradient
          c={vec(CX, CY)}
          r={58}
          colors={[...diffuseRingColors(isDark, 0.08)]}
          positions={[...diffuseRingPositions(0.74, 0.11)]}
        />
      </Circle>
      {/* Soft center fill */}
      <Circle cx={CX} cy={CY} r={40}>
        <RadialGradient
          c={vec(CX, CY)}
          r={40}
          colors={[...centerBloomColors(isDark)]}
          positions={[0, 0.35, 0.72, 1]}
        />
      </Circle>
    </Canvas>
  );
}

export const MEETING_RIPPLE_ART = {
  width: ART_W,
  height: ART_H,
  iconSize: 48,
  orbSize: 108,
  iconLeft: CX - 24,
  iconTop: CY - 24,
};
