import { BarChart } from '@/components/charts/BarChart';
import { ScreenShell } from '@/components/screen-shell';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { MOCK_SPRINT_VELOCITY, MOCK_TEAM } from '@/data/analytics-mock';
import {
  ChartBarLineIcon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const ACCENT = '#3b82f6';
const ACCENT2 = '#8b5cf6';

const sprintData = [
  { sprint: 'S10', velocity: 32, planned: 40 },
  { sprint: 'S11', velocity: 38, planned: 35 },
  { sprint: 'S12', velocity: 28, planned: 30 },
  { sprint: 'S13', velocity: 42, planned: 38 },
  { sprint: 'S14', velocity: 35, planned: 36 },
];

export default function AnalysisScreen() {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const an = t.analysis;

  return (
    <ScreenShell title={an.title}>
      {/* Team Performance Bar Chart */}
      <Fade delay={0} initialY={8}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <LinearGradient
            colors={[ACCENT + '14', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: ACCENT + '22' }]}>
              <HugeiconsIcon icon={UserMultipleIcon} size={16} color={ACCENT} strokeWidth={1.8} />
            </View>
            <Text style={[styles.cardTitle, { color: c.foreground }]}>{an.teamPerformance}</Text>
          </View>
          <BarChart
            data={MOCK_TEAM.map(m => ({
              label: m.name.split(' ')[0],
              value: m.done,
              color: ACCENT,
            }))}
            height={200}
            color={ACCENT}
            showGrid
          />
        </View>
      </Fade>

      {/* Sprint Velocity */}
      <Fade delay={80} initialY={8} style={{ marginTop: 14 }}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <LinearGradient
            colors={[ACCENT2 + '14', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: ACCENT2 + '22' }]}>
              <HugeiconsIcon icon={ChartBarLineIcon} size={16} color={ACCENT2} strokeWidth={1.8} />
            </View>
            <Text style={[styles.cardTitle, { color: c.foreground }]}>{an.sprintVelocity}</Text>
          </View>
          <View style={styles.legendRow}>
            {[{ label: 'Velocity', color: ACCENT }, { label: 'Planned', color: ACCENT2 }].map(l => (
              <View key={l.label} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                <Text style={[styles.legendText, { color: c.muted }]}>{l.label}</Text>
              </View>
            ))}
          </View>
          {/* Grouped bars (velocity / planned side by side) */}
          <View style={styles.groupedBars}>
            {sprintData.map((s, i) => (
              <SprintGroup key={s.sprint} sprint={s.sprint} velocity={s.velocity} planned={s.planned} delay={i * 60} />
            ))}
          </View>
          <View style={styles.xLabels}>
            {sprintData.map(s => (
              <Text key={s.sprint} style={[styles.xLabel, { color: c.muted }]}>{s.sprint}</Text>
            ))}
          </View>
        </View>
      </Fade>

      {/* Team Hours */}
      <Fade delay={160} initialY={8} style={{ marginTop: 14 }}>
        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <LinearGradient
            colors={['#22c55e14', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: '#22c55e22' }]}>
              <HugeiconsIcon icon={UserMultipleIcon} size={16} color="#22c55e" strokeWidth={1.8} />
            </View>
            <Text style={[styles.cardTitle, { color: c.foreground }]}>{an.teamHours}</Text>
          </View>
          <View style={{ gap: 12 }}>
            {MOCK_TEAM.map((m, i) => (
              <Fade key={m.id} delay={i * 45} initialY={4}>
                <TeamHoursRow member={m} tasksLabel={an.tasks} />
              </Fade>
            ))}
          </View>
        </View>
      </Fade>
    </ScreenShell>
  );
}

function SprintGroup({ sprint, velocity, planned, delay }: {
  sprint: string; velocity: number; planned: number; delay: number;
}) {
  const maxVal = 50;
  const maxHeight = 120;
  const velH = (velocity / maxVal) * maxHeight;
  const planH = (planned / maxVal) * maxHeight;

  const velAnim = useSharedValue(0);
  const planAnim = useSharedValue(0);
  React.useEffect(() => {
    velAnim.value = withDelay(delay, withTiming(velH, { duration: 600 }));
    planAnim.value = withDelay(delay + 40, withTiming(planH, { duration: 600 }));
  }, [velH, planH, delay, velAnim, planAnim]);

  const velStyle = useAnimatedStyle(() => ({ height: velAnim.value }));
  const planStyle = useAnimatedStyle(() => ({ height: planAnim.value }));

  return (
    <View style={[styles.group, { height: maxHeight }]}>
      <Animated.View style={[styles.bar, { backgroundColor: ACCENT, borderRadius: 4 }, velStyle]} />
      <Animated.View style={[styles.bar, { backgroundColor: ACCENT2, borderRadius: 4 }, planStyle]} />
    </View>
  );
}

function TeamHoursRow({ member, tasksLabel }: { member: typeof MOCK_TEAM[0]; tasksLabel: string }) {
  const c = useSemanticTheme();
  const maxPts = 55;
  const pct = member.pts / maxPts;

  const progress = useSharedValue(0);
  React.useEffect(() => {
    progress.value = withTiming(pct, { duration: 700 });
  }, [pct, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));

  return (
    <View style={styles.hoursRow}>
      <View style={[styles.avatar, { backgroundColor: ACCENT + '20' }]}>
        <Text style={[styles.avatarLetter, { color: ACCENT }]}>{member.name[0]}</Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.hoursTopRow}>
          <Text style={[styles.memberName, { color: c.foreground }]}>{member.name}</Text>
          <Text style={[styles.memberMeta, { color: c.muted }]}>{member.done} {tasksLabel}</Text>
          <Text style={[styles.memberPts, { color: c.foreground }]}>{member.focus}h</Text>
        </View>
        <View style={[styles.track, { backgroundColor: c.border }]}>
          <Animated.View style={[styles.fill, { backgroundColor: ACCENT }, barStyle]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    gap: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },

  legendRow: { flexDirection: 'row', gap: 14 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: SigmaTypo.caption, fontWeight: '500' },

  groupedBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    paddingHorizontal: 4,
  },
  group: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bar: { width: 14 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-around' },
  xLabel: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },

  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hoursTopRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: SigmaTypo.caption, fontWeight: '800' },
  memberName: { flex: 1, fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  memberMeta: { fontSize: SigmaTypo.caption, fontWeight: '500', marginRight: 8 },
  memberPts: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
