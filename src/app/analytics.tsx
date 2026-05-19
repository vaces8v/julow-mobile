import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { LineChart } from '@/components/charts/LineChart';
import { ScreenShell } from '@/components/screen-shell';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  MOCK_BURNDOWN,
  MOCK_CATEGORY_SHARE,
  MOCK_FLOW_STAGES,
  MOCK_KPI,
  MOCK_MONTHLY_TREND,
  MOCK_SPRINT_VELOCITY,
  MOCK_TEAM,
  MOCK_WEEKLY_ACTIVITY,
} from '@/data/analytics-mock';
import {
  ActivitySparkIcon,
  ChartAnalysisIcon,
  ChartBarLineIcon,
  ChartEvaluationIcon,
  CheckmarkBadge01Icon,
  Download01Icon,
  FlowCircleIcon,
  Idea01Icon,
  Target01Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

type Tab = 'overview' | 'sprints' | 'team' | 'flow';

const ACCENT_BLUE = '#3b82f6';
const ACCENT_VIOLET = '#8b5cf6';
const ACCENT_ORANGE = '#f97316';
const ACCENT_GREEN = '#22c55e';

export default function AnalyticsScreen() {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const ins = t.insights;
  const [tab, setTab] = useState<Tab>('overview');

  const kpis = [
    { label: ins.velocity, value: String(MOCK_KPI.velocityPts), sub: ins.velocitySub, color: ACCENT_BLUE, icon: ActivitySparkIcon },
    { label: ins.cycleTime, value: `${MOCK_KPI.cycleDays}d`, sub: ins.cycleTimeSub, color: ACCENT_ORANGE, icon: Target01Icon },
    { label: ins.throughput, value: String(MOCK_KPI.throughputTasks), sub: ins.throughputSub, color: ACCENT_GREEN, icon: ChartEvaluationIcon },
    { label: ins.bugRate, value: '4.2%', sub: ins.bugRateSub, color: '#ef4444', icon: ChartBarLineIcon },
  ];

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: ins.tabOverview },
    { key: 'sprints', label: ins.tabSprints },
    { key: 'team', label: ins.tabTeam },
    { key: 'flow', label: ins.tabFlow },
  ];

  const catColors: Record<string, string> = {
    dev: ACCENT_BLUE,
    design: ACCENT_VIOLET,
    testing: ACCENT_ORANGE,
    planning: ACCENT_GREEN,
  };
  const catLabels: Record<string, string> = {
    dev: ins.catDev,
    design: ins.catDesign,
    testing: ins.catTesting,
    planning: ins.catPlanning,
  };

  const donutData = MOCK_CATEGORY_SHARE.map((d) => ({
    label: catLabels[d.key],
    value: d.pct,
    color: catColors[d.key],
  }));

  const insights = [ins.insightVelocity, ins.insightBug, ins.insightCycle, ins.insightFocus];

  return (
    <ScreenShell
      title={ins.title}
      subtitle={ins.subtitle}
      right={
        <Pressable style={[styles.exportBtn, { borderColor: c.border }]}>
          <HugeiconsIcon icon={Download01Icon} size={16} color={c.muted} strokeWidth={1.8} />
          <Text style={[styles.exportLabel, { color: c.muted }]}>{ins.export}</Text>
        </Pressable>
      }
    >
      {/* KPI cards 2×2 */}
      <View style={styles.kpiGrid}>
        {kpis.map((k, i) => (
          <Fade key={k.label} delay={i * 70} initialY={6} style={styles.kpiCell}>
            <View style={[styles.kpiCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <LinearGradient
                colors={[k.color + '20', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={[styles.kpiIconWrap, { backgroundColor: k.color + '22' }]}>
                <HugeiconsIcon icon={k.icon} size={18} color={k.color} strokeWidth={1.8} />
              </View>
              <Text style={[styles.kpiValue, { color: c.foreground }]}>{k.value}</Text>
              <Text style={[styles.kpiLabel, { color: c.foreground }]} numberOfLines={1}>{k.label}</Text>
              <Text style={[styles.kpiSub, { color: c.muted }]} numberOfLines={1}>{k.sub}</Text>
            </View>
          </Fade>
        ))}
      </View>

      {/* Sprint progress */}
      <Fade delay={320} initialY={6} style={{ marginTop: 16 }}>
        <SprintProgressCard
          label={ins.sprintProgress}
          done={MOCK_KPI.sprintCompleted}
          remaining={MOCK_KPI.sprintRemaining}
          daysLeft={MOCK_KPI.sprintDaysLeft}
          pct={MOCK_KPI.sprintProgressPct}
          doneLabel={ins.sprintDone}
          daysLeftLabel={ins.daysLeft}
          accent={ACCENT_BLUE}
        />
      </Fade>

      {/* Tab bar */}
      <Fade delay={380} initialY={4} style={{ marginTop: 20 }}>
        <View style={styles.tabRow}>
          {tabs.map((t) => (
            <TabPill
              key={t.key}
              label={t.label}
              active={tab === t.key}
              onPress={() => setTab(t.key)}
              activeColor={ACCENT_BLUE}
            />
          ))}
        </View>
      </Fade>

      {/* Tab content */}
      <View style={{ marginTop: 16, gap: 16 }}>
        {tab === 'overview' && (
          <OverviewTab ins={ins} donutData={donutData} catColors={catColors} catLabels={catLabels} insights={insights} />
        )}
        {tab === 'sprints' && <SprintsTab ins={ins} />}
        {tab === 'team' && <TeamTab ins={ins} />}
        {tab === 'flow' && <FlowTab ins={ins} />}
      </View>
    </ScreenShell>
  );
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({ ins, donutData, catColors, catLabels, insights }: {
  ins: any; donutData: any[]; catColors: Record<string,string>; catLabels: Record<string,string>; insights: string[];
}) {
  const c = useSemanticTheme();

  const weeklyLabels = MOCK_WEEKLY_ACTIVITY.map(d => d.day);
  const weeklyTasks = MOCK_WEEKLY_ACTIVITY.map(d => d.tasks);
  const weeklyHours = MOCK_WEEKLY_ACTIVITY.map(d => d.hours);

  const monthlyLabels = MOCK_MONTHLY_TREND.map(d => d.month);

  return (
    <>
      {/* Weekly Activity */}
      <Fade delay={0} initialY={8}>
        <SectionCard title={ins.weeklyActivity} sub={ins.weeklyActivitySub} icon={ActivitySparkIcon} accent={ACCENT_BLUE}>
          <LineChart
            labels={weeklyLabels}
            series={[
              { label: ins.tasks, color: ACCENT_BLUE, values: weeklyTasks },
              { label: ins.hours, color: ACCENT_GREEN, values: weeklyHours, dashed: true },
            ]}
            height={180}
            legend
          />
        </SectionCard>
      </Fade>

      {/* Categories donut */}
      <Fade delay={80} initialY={8}>
        <SectionCard title={ins.categories} sub={ins.categoriesSub} icon={ChartAnalysisIcon} accent={ACCENT_VIOLET}>
          <View style={styles.donutRow}>
            <DonutChart
              data={donutData}
              size={148}
              thickness={20}
              centerValue="100%"
              centerLabel={ins.tasks}
            />
            <View style={styles.legendColumn}>
              {donutData.map((d) => (
                <View key={d.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.legendLabel, { color: c.foreground }]}>{d.label}</Text>
                    <Text style={[styles.legendPct, { color: c.muted }]}>{d.value}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </SectionCard>
      </Fade>

      {/* Monthly trend */}
      <Fade delay={160} initialY={8}>
        <SectionCard title={ins.monthlyTrend} sub={ins.monthlyTrendSub} icon={ChartBarLineIcon} accent={ACCENT_GREEN}>
          <LineChart
            labels={monthlyLabels}
            series={[
              { label: ins.completed, color: ACCENT_GREEN, values: MOCK_MONTHLY_TREND.map(d => d.completed) },
              { label: ins.created, color: ACCENT_BLUE, values: MOCK_MONTHLY_TREND.map(d => d.created), dashed: true },
            ]}
            height={180}
            legend
          />
        </SectionCard>
      </Fade>

      {/* Key insights */}
      <Fade delay={240} initialY={8}>
        <SectionCard title={ins.topInsights} icon={Idea01Icon} accent={ACCENT_ORANGE}>
          <View style={{ gap: 10 }}>
            {insights.map((text, i) => (
              <InsightRow key={i} text={text} index={i} />
            ))}
          </View>
        </SectionCard>
      </Fade>
    </>
  );
}

// ─── Sprints Tab ─────────────────────────────────────────────────────────────

function SprintsTab({ ins }: { ins: any }) {
  const c = useSemanticTheme();
  const labels = MOCK_SPRINT_VELOCITY.map(d => d.sprint);
  const burndownLabels = MOCK_BURNDOWN.map(d => d.day);

  return (
    <>
      <Fade delay={0} initialY={8}>
        <SectionCard title={ins.sprintVelocity} sub={ins.sprintVelocitySub} icon={ActivitySparkIcon} accent={ACCENT_BLUE}>
          <LineChart
            labels={labels}
            series={[
              { label: ins.actual, color: ACCENT_BLUE, values: MOCK_SPRINT_VELOCITY.map(d => d.actual) },
              { label: ins.planned, color: ACCENT_VIOLET, values: MOCK_SPRINT_VELOCITY.map(d => d.planned), dashed: true },
            ]}
            height={200}
            legend
          />
        </SectionCard>
      </Fade>

      <Fade delay={80} initialY={8}>
        <SectionCard title={ins.burndown} sub={ins.burndownSub} icon={Target01Icon} accent={ACCENT_ORANGE}>
          <LineChart
            labels={burndownLabels}
            series={[
              { label: ins.remaining, color: ACCENT_ORANGE, values: MOCK_BURNDOWN.map(d => d.remaining) },
              { label: ins.ideal, color: c.muted, values: MOCK_BURNDOWN.map(d => d.ideal), dashed: true },
            ]}
            height={180}
            legend
          />
        </SectionCard>
      </Fade>
    </>
  );
}

// ─── Team Tab ────────────────────────────────────────────────────────────────

function TeamTab({ ins }: { ins: any }) {
  const c = useSemanticTheme();

  return (
    <>
      <Fade delay={0} initialY={8}>
        <SectionCard title={ins.teamPerf} sub={ins.teamPerfSub} icon={UserMultipleIcon} accent={ACCENT_VIOLET}>
          <BarChart
            data={MOCK_TEAM.map(m => ({ label: m.name.split(' ')[0], value: m.done, color: ACCENT_VIOLET }))}
            height={180}
            showGrid
          />
        </SectionCard>
      </Fade>

      <Fade delay={80} initialY={8}>
        <SectionCard title={ins.member} icon={UserMultipleIcon} accent={ACCENT_BLUE}>
          <View style={styles.tableHeader}>
            {[ins.member, ins.tasksDone, ins.inProgress, ins.totalPts].map((h, i) => (
              <Text key={i} style={[styles.tableHead, { color: c.muted, flex: i === 0 ? 2 : 1, textAlign: i === 0 ? 'left' : 'right' }]}>{h}</Text>
            ))}
          </View>
          {MOCK_TEAM.map((m, i) => (
            <Fade key={m.id} delay={i * 40} initialY={4}>
              <View style={[styles.tableRow, { borderTopColor: c.border }]}>
                <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[styles.avatar, { backgroundColor: ACCENT_BLUE + '22' }]}>
                    <Text style={[styles.avatarLetter, { color: ACCENT_BLUE }]}>{m.name[0]}</Text>
                  </View>
                  <View>
                    <Text style={[styles.memberName, { color: c.foreground }]}>{m.name}</Text>
                    <Text style={[styles.memberRole, { color: c.muted }]}>{m.role}</Text>
                  </View>
                </View>
                <Text style={[styles.tableCell, { color: ACCENT_GREEN }]}>{m.done}</Text>
                <Text style={[styles.tableCell, { color: ACCENT_ORANGE }]}>{m.inProgress}</Text>
                <Text style={[styles.tableCell, { color: c.foreground, fontWeight: '700' }]}>{m.pts}</Text>
              </View>
            </Fade>
          ))}
        </SectionCard>
      </Fade>
    </>
  );
}

// ─── Flow Tab ─────────────────────────────────────────────────────────────────

function FlowTab({ ins }: { ins: any }) {
  const c = useSemanticTheme();
  const stageLabels = [ins.stageCreated, ins.stageInProgress, ins.stageReview, ins.stageDone];

  return (
    <Fade delay={0} initialY={8}>
      <SectionCard title={ins.flowTitle} sub={ins.flowSub} icon={FlowCircleIcon} accent={ACCENT_GREEN}>
        <View style={{ gap: 14 }}>
          {MOCK_FLOW_STAGES.map((stage, i) => (
            <FlowStageRow
              key={i}
              label={stageLabels[i]}
              value={stage.value}
              max={stage.max}
              color={stage.color}
              conv={stage.conv}
              convLabel={ins.convRate}
            />
          ))}
        </View>
        <View style={[styles.flowSummary, { backgroundColor: ACCENT_GREEN + '12', borderColor: ACCENT_GREEN + '30' }]}>
          {[
            { label: ins.convRate, val: MOCK_KPI.flowSummary.conv },
            { label: 'Cycle', val: MOCK_KPI.flowSummary.cycle },
            { label: ins.completed, val: MOCK_KPI.flowSummary.completed },
          ].map((item) => (
            <View key={item.label} style={styles.flowSumItem}>
              <Text style={[styles.flowSumVal, { color: ACCENT_GREEN }]}>{item.val}</Text>
              <Text style={[styles.flowSumLabel, { color: c.muted }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </Fade>
  );
}

// ─── Reusable Components ─────────────────────────────────────────────────────

function SectionCard({
  title, sub, icon, accent, children
}: {
  title: string; sub?: string; icon: any; accent: string; children: React.ReactNode;
}) {
  const c = useSemanticTheme();
  return (
    <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <LinearGradient
        colors={[accent + '10', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIconWrap, { backgroundColor: accent + '20' }]}>
          <HugeiconsIcon icon={icon} size={16} color={accent} strokeWidth={1.8} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>{title}</Text>
          {!!sub && <Text style={[styles.sectionSub, { color: c.muted }]}>{sub}</Text>}
        </View>
      </View>
      {children}
    </View>
  );
}

function TabPill({ label, active, onPress, activeColor }: {
  label: string; active: boolean; onPress: () => void; activeColor: string;
}) {
  const c = useSemanticTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 14, stiffness: 300 }) }],
  }));
  return (
    <Pressable
      onPressIn={() => { scale.value = 0.93; }}
      onPressOut={() => { scale.value = 1; }}
      onPress={onPress}
      style={{ flex: 1 }}
    >
      <Animated.View style={[
        styles.tabPill,
        { backgroundColor: active ? activeColor + '22' : c.surface, borderColor: active ? activeColor + '55' : c.border },
        anim,
      ]}>
        <Text style={[styles.tabLabel, { color: active ? activeColor : c.muted }]} numberOfLines={1}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

function SprintProgressCard({
  label, done, remaining, pct, daysLeft, doneLabel, daysLeftLabel, accent
}: {
  label: string; done: number; remaining: number; pct: number;
  daysLeft: number; doneLabel: string; daysLeftLabel: string; accent: string;
}) {
  const c = useSemanticTheme();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(pct / 100, { duration: 1000 });
  }, [pct, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));

  return (
    <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
      <LinearGradient
        colors={[accent + '14', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.sprintRow}>
        <View style={[styles.sectionIconWrap, { backgroundColor: accent + '20' }]}>
          <HugeiconsIcon icon={CheckmarkBadge01Icon} size={16} color={accent} strokeWidth={1.8} />
        </View>
        <Text style={[styles.sectionTitle, { color: c.foreground, flex: 1 }]}>{label}</Text>
        <Text style={[styles.pctLabel, { color: accent }]}>{pct}%</Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: accent }, barStyle]} />
      </View>
      <View style={styles.sprintStats}>
        <Text style={[styles.sprintStat, { color: c.muted }]}>
          <Text style={{ color: ACCENT_GREEN, fontWeight: '700' }}>{done}</Text> {doneLabel}
        </Text>
        <Text style={[styles.sprintStat, { color: c.muted }]}>
          <Text style={{ color: c.foreground, fontWeight: '700' }}>{remaining}</Text> left
        </Text>
        <Text style={[styles.sprintStat, { color: c.muted }]}>
          <Text style={{ color: ACCENT_ORANGE, fontWeight: '700' }}>{daysLeft}</Text> {daysLeftLabel}
        </Text>
      </View>
    </View>
  );
}

function InsightRow({ text, index }: { text: string; index: number }) {
  const c = useSemanticTheme();
  const colors = [ACCENT_BLUE, '#ef4444', ACCENT_ORANGE, ACCENT_GREEN];
  const col = colors[index % colors.length];
  return (
    <View style={[styles.insightRow, { backgroundColor: col + '0E', borderLeftColor: col }]}>
      <HugeiconsIcon icon={Idea01Icon} size={14} color={col} strokeWidth={1.8} />
      <Text style={[styles.insightText, { color: c.foreground }]}>{text}</Text>
    </View>
  );
}

function FlowStageRow({
  label, value, max, color, conv, convLabel
}: {
  label: string; value: number; max: number; color: string; conv?: string; convLabel: string;
}) {
  const c = useSemanticTheme();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(value / max, { duration: 900 });
  }, [value, max, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));

  return (
    <View>
      <View style={styles.flowLabelRow}>
        <View style={[styles.flowDot, { backgroundColor: color }]} />
        <Text style={[styles.flowLabel, { color: c.foreground }]}>{label}</Text>
        <Text style={[styles.flowValue, { color: c.foreground }]}>{value}</Text>
        {conv && (
          <View style={[styles.convBadge, { backgroundColor: color + '20' }]}>
            <Text style={[styles.convText, { color }]}>{conv}</Text>
          </View>
        )}
      </View>
      <View style={[styles.progressTrack, { backgroundColor: c.border, marginTop: 6 }]}>
        <Animated.View style={[styles.progressFill, { backgroundColor: color }, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCell: { width: '48%' },
  kpiCard: {
    padding: 14,
    borderRadius: SigmaRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
    gap: 6,
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  kpiValue: { fontSize: SigmaTypo.title2, fontWeight: '800', letterSpacing: -0.5 },
  kpiLabel: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  kpiSub: { fontSize: SigmaTypo.caption, fontWeight: '500' },

  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  exportLabel: { fontSize: SigmaTypo.caption, fontWeight: '600' },

  sectionCard: {
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
    gap: 14,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  sectionSub: { fontSize: SigmaTypo.caption, fontWeight: '500', marginTop: 1 },

  tabRow: { flexDirection: 'row', gap: 8 },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: SigmaRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  tabLabel: { fontSize: SigmaTypo.caption, fontWeight: '600' },

  sprintRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pctLabel: { fontSize: SigmaTypo.title3, fontWeight: '800', letterSpacing: -0.4 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  sprintStats: { flexDirection: 'row', justifyContent: 'space-between' },
  sprintStat: { fontSize: SigmaTypo.caption, fontWeight: '500' },

  donutRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  legendColumn: { flex: 1, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: SigmaTypo.caption, fontWeight: '600' },
  legendPct: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 1 },

  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: SigmaRadius.sm,
    borderLeftWidth: 3,
  },
  insightText: { flex: 1, fontSize: SigmaTypo.caption, fontWeight: '500', lineHeight: 17 },

  tableHeader: { flexDirection: 'row', paddingBottom: 8 },
  tableHead: { fontSize: SigmaTypo.captionSmall, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  tableCell: { flex: 1, fontSize: SigmaTypo.bodySmall, fontWeight: '600', textAlign: 'right' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: SigmaTypo.caption, fontWeight: '800' },
  memberName: { fontSize: SigmaTypo.caption, fontWeight: '600' },
  memberRole: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 1 },

  flowLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flowDot: { width: 10, height: 10, borderRadius: 5 },
  flowLabel: { flex: 1, fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  flowValue: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  convBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  convText: { fontSize: SigmaTypo.captionSmall, fontWeight: '700' },
  flowSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 14,
    borderRadius: SigmaRadius.sm,
    borderWidth: 1,
    marginTop: 6,
  },
  flowSumItem: { alignItems: 'center', gap: 4 },
  flowSumVal: { fontSize: SigmaTypo.title3, fontWeight: '800', letterSpacing: -0.3 },
  flowSumLabel: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },
});
