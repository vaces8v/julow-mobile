import { AreaChart } from '@/components/charts/AreaChart';
import { BarChart } from '@/components/charts/BarChart';
import { Fade } from '@/components/ui/fade';
import { SlidingNumber } from '@/components/ui/sliding-number';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, type AnalyticsPayload, type TaskPayload } from '@/lib/api';
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  ArrowUpRight01Icon,
  Call02Icon,
  CheckmarkCircle02Icon,
  GridViewIcon,
  Menu01Icon,
  MoreHorizontalIcon,
  Notification03Icon,
  Search01Icon,
  Settings02Icon,
  Task01Icon,
  UserAdd01Icon,
  UserGroup02Icon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Button, Card, Chip, Popover } from 'heroui-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Dimensions,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Helpers ────────────────────────────────────────────────────────
function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const isDoneStatus = (s: string) => {
  const l = s?.toLowerCase() ?? '';
  return l === 'done' || l === 'completed' || l === 'closed';
};

const isActiveStatus = (s: string) => {
  const l = s?.toLowerCase() ?? '';
  return l === 'in_progress' || l === 'active' || l === 'in-progress' ||
    l === 'review' || l === 'in_review' || l === 'in-review';
};

function formatRelativeTime(
  iso: string | undefined,
  labels: { timeNow: string; timeMinutes: string; timeHours: string; timeDays: string },
): string {
  const date = safeDate(iso);
  if (!date) return '';
  const diffSec = Math.max(0, (Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return labels.timeNow;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return labels.timeMinutes.replace('{n}', String(diffMin));
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return labels.timeHours.replace('{n}', String(diffHr));
  const diffDay = Math.floor(diffHr / 24);
  return labels.timeDays.replace('{n}', String(diffDay));
}

type TaskEvent = {
  id: string;
  taskTitle: string;
  kind: 'created' | 'completed';
  at: Date;
};

function buildRecentEvents(tasks: TaskPayload[], limit = 5): TaskEvent[] {
  const events: TaskEvent[] = [];
  for (const task of tasks) {
    const created = safeDate(task.createdAt);
    if (created) {
      events.push({ id: `${task.id}:c`, taskTitle: task.title, kind: 'created', at: created });
    }
    const completed = safeDate(task.completedAt);
    if (completed) {
      events.push({ id: `${task.id}:d`, taskTitle: task.title, kind: 'completed', at: completed });
    }
  }
  events.sort((a, b) => b.at.getTime() - a.at.getTime());
  return events.slice(0, limit);
}

function buildWeeklySeries(tasks: TaskPayload[]): { day: string; created: number; completed: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 6);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const next = new Date(date);
    next.setDate(date.getDate() + 1);

    let created = 0;
    let completed = 0;
    for (const task of tasks) {
      const c = safeDate(task.createdAt);
      if (c && c >= date && c < next) created++;
      const dd = safeDate(task.completedAt);
      if (dd && dd >= date && dd < next) completed++;
    }
    return { day: date.toLocaleDateString('en-US', { weekday: 'short' }), created, completed };
  });
}

function parseInviteToken(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  try {
    const url = s.startsWith('http') ? new URL(s) : new URL(s, 'http://x.local');
    const idx = url.pathname.toLowerCase().lastIndexOf('/invite/');
    if (idx >= 0) {
      const tail = url.pathname.slice(idx + '/invite/'.length).replace(/\/.*/, '');
      if (tail) return tail.toLowerCase();
    }
  } catch {
    // not a URL — continue as plain text
  }
  return s.toLowerCase();
}

type ViewMode = 'board' | 'list';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { t, locale } = useI18n();
  const d = t.dashboard;
  const { activeWorkspaceId, activeProjectId, projects } = useWorkspace();
  const { user } = useAuth();
  // Local blur target: the BlurView in the header samples THIS screen's
  // scrollable content. Must be a SIBLING of the BlurView (not an ancestor),
  // otherwise Android's dimezisBlurViewSdk31Plus native sampler crashes.
  const blurTargetRef = useRef<View>(null);

  const userInitial = (user?.email?.[0] ?? 'U').toUpperCase();
  const userLabel = user?.email?.split('@')[0] ?? d.title;

  const [tasks, setTasks] = useState<TaskPayload[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [statusMessage, setStatusMessage] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // ── Join project by invite code ──
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinedOk, setJoinedOk] = useState(false);

  const refreshData = useCallback(async () => {
    if (!activeWorkspaceId) return;
    const [taskList, ana] = await Promise.all([
      api.getTasks(activeWorkspaceId),
      api.getAnalytics(activeWorkspaceId),
    ]);
    setTasks(taskList);
    setAnalytics(ana);
  }, [activeWorkspaceId]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const createTask = async () => {
    if (!activeWorkspaceId || !newTaskTitle.trim()) return;
    const projectId = activeProjectId || projects[0]?.id;
    if (!projectId) return;
    await api.createTask({
      workspaceId: activeWorkspaceId,
      projectId,
      title: newTaskTitle.trim(),
      priority: 'medium',
    });
    setNewTaskTitle('');
    await refreshData();
    setStatusMessage(d.taskAdded);
    setTimeout(() => setStatusMessage(''), 2500);
  };

  const handleJoin = async () => {
    const token = parseInviteToken(joinCode);
    if (!token) {
      setJoinError(d.joinInvalid);
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const result = await api.redeemProjectInvitation(token);
      setJoinedOk(true);
      setStatusMessage(d.joinSuccess);
      setTimeout(() => setStatusMessage(''), 3000);
      await refreshData();
      // Jump straight into the newly joined project (parity with web).
      if (result?.projectId) {
        setTimeout(() => router.push(`/project/${result.projectId}` as any), 600);
      }
    } catch (e) {
      console.error('Failed to redeem invitation:', e);
      setJoinError(e instanceof Error ? e.message : d.joinInvalid);
    } finally {
      setJoining(false);
    }
  };

  // ── Productivity metrics (computed from tasks, mirrors web) ──
  const productivity = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);

    let velocityThisWeek = 0;
    let velocityPrevWeek = 0;
    const cycleDurations: number[] = [];
    let activeNow = 0;

    for (const task of tasks) {
      const completed = safeDate(task.completedAt);
      if (completed) {
        if (completed >= weekStart && completed <= now) velocityThisWeek++;
        else if (completed >= prevWeekStart && completed < weekStart) velocityPrevWeek++;
        const created = safeDate(task.createdAt);
        if (created && completed >= created) {
          cycleDurations.push((completed.getTime() - created.getTime()) / 86_400_000);
        }
      }
      if (isActiveStatus(task.status)) activeNow++;
    }

    const cycleDaysAvg = cycleDurations.length
      ? cycleDurations.reduce((a, b) => a + b, 0) / cycleDurations.length
      : null;

    const wowDelta = velocityThisWeek - velocityPrevWeek;
    const wowPct = velocityPrevWeek > 0
      ? Math.round((wowDelta / velocityPrevWeek) * 100)
      : velocityThisWeek > 0 ? 100 : 0;

    return { velocityThisWeek, wowDelta, wowPct, cycleDaysAvg, activeNow };
  }, [tasks]);

  const grouped = useMemo(() => {
    const normalize = (s: string) => s?.toLowerCase() ?? '';
    return {
      todo: tasks.filter((tk) => { const s = normalize(tk.status); return s === 'todo' || s === 'backlog' || s === 'none'; }),
      inProgress: tasks.filter((tk) => { const s = normalize(tk.status); return s === 'in_progress' || s === 'active' || s === 'in-progress'; }),
      review: tasks.filter((tk) => { const s = normalize(tk.status); return s === 'review' || s === 'in_review' || s === 'in-review'; }),
      done: tasks.filter((tk) => isDoneStatus(tk.status)),
    };
  }, [tasks]);

  const throughput = analytics?.throughput ?? tasks.filter((tk) => isDoneStatus(tk.status)).length;

  const wowSign = productivity.wowDelta > 0 ? '+' : productivity.wowDelta < 0 ? '−' : '±';
  const wowAbs = Math.abs(productivity.wowPct);
  const velocitySub = productivity.wowDelta === 0
    ? d.velocityFlat
    : `${wowSign}${wowAbs}% ${d.velocityUp}`;
  const cycleValue = productivity.cycleDaysAvg !== null
    ? `${Math.round(productivity.cycleDaysAvg * 10) / 10}`
    : 0;
  const cycleSub = productivity.cycleDaysAvg !== null ? d.cycleTimeSub : d.cycleNoData;

  const statCards = useMemo(
    () => [
      { label: d.velocity, value: productivity.velocityThisWeek, sub: velocitySub, icon: ArrowUpRight01Icon, color: c.success },
      { label: d.throughput, value: throughput, sub: d.completedLabel, icon: CheckmarkCircle02Icon, color: c.accent },
      { label: d.activeNow, value: productivity.activeNow, sub: d.activeNowSub, icon: Task01Icon, color: '#a855f7' },
      { label: d.cycleTime, value: typeof cycleValue === 'number' ? cycleValue : 0, sub: cycleSub, icon: AlertCircleIcon, color: c.warning, suffix: 'd' },
    ],
    [c.accent, c.success, c.warning, d, productivity, throughput, velocitySub, cycleSub, cycleValue],
  );

  const columns = [
    { key: 'todo', title: d.todo, items: grouped.todo, dot: c.muted },
    { key: 'inProgress', title: d.inProgress, items: grouped.inProgress, dot: c.accent },
    { key: 'review', title: d.review, items: grouped.review, dot: c.warning },
    { key: 'done', title: d.done, items: grouped.done, dot: c.success },
  ];

  // ── Real activity feed from task events ──
  const activityFeed = useMemo(() => {
    const labels = {
      timeNow: d.timeNow,
      timeMinutes: d.timeMinutes,
      timeHours: d.timeHours,
      timeDays: d.timeDays,
    };
    return buildRecentEvents(tasks, 5).map((event) => ({
      id: event.id,
      title: event.taskTitle,
      meta: `${event.kind === 'completed' ? d.eventCompleted : d.eventCreated} · ${formatRelativeTime(event.at.toISOString(), labels)}`,
      icon: event.kind === 'completed' ? CheckmarkCircle02Icon : Task01Icon,
      color: event.kind === 'completed' ? c.success : c.accent,
    }));
  }, [tasks, d, c.success, c.accent]);

  // ── Weekly chart data (real, from tasks) ──
  const weeklyData = useMemo(() => buildWeeklySeries(tasks), [tasks]);

  const scrollY = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tabPress', (tab) => {
      if (tab === '(home)') scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => sub.remove();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const leftIconsStyle = useAnimatedStyle(() => {
    const tx = interpolate(scrollY.value, [-50, 0, 60, 100], [SCREEN_W - 200, SCREEN_W - 200, 0, 0], Extrapolation.CLAMP);
    return { transform: [{ translateX: withSpring(tx, { damping: 20, stiffness: 200, mass: 0.5 }) }] };
  });

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 50], [0, 1], Extrapolation.CLAMP),
  }));

  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [30, 60], [12, 0], Extrapolation.CLAMP) }],
  }));

  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [-50, 0, 40], [1.05, 1, 0.92], Extrapolation.CLAMP) },
      { translateY: interpolate(scrollY.value, [-1000, 0, 40], [-1000, 0, -10], Extrapolation.CLAMP) },
    ],
  }));

  const HEADER_H = insets.top + 54;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── STICKY HEADER ── */}
      <View style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <BlurView
            {...(blurTargetRef ? { blurTarget: blurTargetRef } : {})}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
            intensity={c.scheme === 'dark' ? 60 : 70}
            tint={c.scheme === 'dark' ? 'dark' : 'prominent'}
            blurReductionFactor={Platform.OS === 'android' ? 0.5 : 1}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.headerBorder, { backgroundColor: c.border }]} />
        </Animated.View>

        <View style={styles.headerContent} pointerEvents="box-none">
          <Animated.Text style={[styles.headerTitleSmall, { color: c.foreground }, headerTitleStyle]}>Julow</Animated.Text>

          <Animated.View style={[styles.headerIconsLayer, leftIconsStyle]} pointerEvents="box-none">
            <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/(settings)')}>
              <HugeiconsIcon icon={Settings02Icon} size={21} color={c.foreground} strokeWidth={1.5} />
            </Pressable>
            <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications' as any)}>
              <HugeiconsIcon icon={Notification03Icon} size={21} color={c.foreground} strokeWidth={1.5} />
              <View style={[styles.headerBadge, { backgroundColor: c.danger, borderColor: c.background }]} />
            </Pressable>
          </Animated.View>

          <View style={[styles.headerIconsLayer, { justifyContent: 'flex-end' }]} pointerEvents="box-none">
            <Pressable
              onPress={() => router.push('/(tabs)/(settings)')}
              accessibilityLabel={userLabel}
              style={[styles.iconBtnFilled, { backgroundColor: c.accent, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }]}
            >
              <Text style={styles.avatarLetter}>{userInitial}</Text>
            </Pressable>

            <Popover>
              <Popover.Trigger>
                <Pressable style={styles.iconBtn} accessibilityLabel="Menu">
                  <HugeiconsIcon icon={MoreHorizontalIcon} size={21} color={c.foreground} strokeWidth={1.5} />
                </Pressable>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Overlay />
                <Popover.Content
                  presentation="popover"
                  placement="bottom"
                  align="end"
                  offset={4}
                  style={{ minWidth: 220 }}
                >
                  <HeaderMenu c={c} t={t} locale={locale} />
                </Popover.Content>
              </Popover.Portal>
            </Popover>
          </View>
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 9, paddingBottom: insets.bottom + 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.foreground}
            colors={[c.accent]}
            progressBackgroundColor={c.surfaceSecondary}
          />
        }
      >
        <Animated.View style={[styles.largeTitleContainer, largeTitleStyle]}>
          <Text style={[styles.largeTitle, { color: c.foreground }]}>{d.title}</Text>
          <Text style={[styles.largeSubtitle, { color: c.muted }]}>{d.subtitle}</Text>
        </Animated.View>

        {/* Status chip */}
        {!!statusMessage && (
          <Fade initialY={6} style={{ paddingHorizontal: 20, marginBottom: 10 }}>
            <Chip color="success" variant="secondary" size="sm">
              <Chip.Label>{statusMessage}</Chip.Label>
            </Chip>
          </Fade>
        )}

        {/* Stat cards */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, i) => (
            <Fade key={stat.label} delay={i * 70} initialY={12} style={styles.statWrap}>
              <StatCard stat={stat} c={c} />
            </Fade>
          ))}
        </View>

        {/* Join Project + Quick Add row */}
        <Fade delay={240} style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <Card className="overflow-hidden" style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1 }}>
            <Card.Body style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.statIcon, { backgroundColor: c.accent + '1A' }]}>
                  <HugeiconsIcon icon={UserAdd01Icon} size={18} color={c.accent} strokeWidth={1.7} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardHeadline, { color: c.foreground }]}>{d.joinTitle}</Text>
                  <Text style={{ fontSize: SigmaTypo.captionSmall, color: c.muted, fontWeight: '500' }}>{d.joinHint}</Text>
                </View>
              </View>
              <View style={styles.quickAddRow}>
                <TextInput
                  value={joinCode}
                  onChangeText={(text) => { setJoinCode(text); if (joinError) setJoinError(null); }}
                  placeholder={d.joinPlaceholder}
                  placeholderTextColor={c.muted}
                  style={[styles.quickInput, { color: c.foreground, backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
                  editable={!joining && !joinedOk}
                  onSubmitEditing={() => void handleJoin()}
                  returnKeyType="go"
                />
                <Button
                  size="sm"
                  onPress={() => void handleJoin()}
                  variant="primary"
                  isDisabled={!joinCode.trim() || joining || joinedOk}
                >
                  <Button.Label>
                    {joinedOk ? '✓' : joining ? d.joining : d.joinAction}
                  </Button.Label>
                </Button>
              </View>
              {!!joinError && (
                <Text style={{ fontSize: SigmaTypo.captionSmall, color: c.danger, fontWeight: '500' }}>{joinError}</Text>
              )}
            </Card.Body>
          </Card>
        </Fade>

        {/* Meetings featured card */}
        <Fade delay={340} style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <MeetingsFeaturedCard c={c} label={t.meetings.title} subtitle={t.meetings.subtitle} joinLabel={t.meetings.join} />
        </Fade>

        {/* Productivity trend */}
        <Fade delay={460} style={{ marginTop: 28, paddingHorizontal: 20 }}>
          <Card style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }} className="overflow-hidden">
            <Card.Header>
              <Card.Title style={{ color: c.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>{d.productivityTrends}</Card.Title>
              <Text style={[styles.cardSub, { color: c.muted }]}>{d.focusHours}</Text>
            </Card.Header>
            <Card.Body style={{ paddingTop: 0 }}>
              <AreaChart data={weeklyData.map((w) => ({ label: w.day, value: w.completed }))} height={180} color={c.accent} />
            </Card.Body>
          </Card>
        </Fade>

        {/* Sprint board */}
        <Fade delay={520} style={{ marginTop: 20, paddingHorizontal: 20 }}>
          <Card style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }} className="overflow-hidden">
            <Card.Header>
              <View style={styles.boardHeaderRow}>
                <Card.Title style={{ color: c.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>{d.sprintBoardTitle}</Card.Title>
                <View style={styles.toggleRow}>
                  <Pressable
                    onPress={() => setViewMode('board')}
                    style={[styles.toggleBtn, viewMode === 'board' && { backgroundColor: c.accent + '22' }]}
                  >
                    <HugeiconsIcon icon={GridViewIcon} size={16} color={viewMode === 'board' ? c.accent : c.muted} strokeWidth={1.8} />
                  </Pressable>
                  <Pressable
                    onPress={() => setViewMode('list')}
                    style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: c.accent + '22' }]}
                  >
                    <HugeiconsIcon icon={Menu01Icon} size={16} color={viewMode === 'list' ? c.accent : c.muted} strokeWidth={1.8} />
                  </Pressable>
                </View>
              </View>
            </Card.Header>
            <Card.Body style={{ paddingTop: 4 }}>
              {viewMode === 'board' ? (
                <Animated.ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingRight: 4 }}
                >
                  {columns.map((col, idx) => (
                    <Fade key={col.key} delay={idx * 60} initialY={8}>
                      <View style={[styles.boardCol, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                        <View style={styles.boardColHead}>
                          <View style={[styles.dot, { backgroundColor: col.dot }]} />
                          <Text style={[styles.boardColTitle, { color: c.foreground }]}>{col.title}</Text>
                          <View style={[styles.countBadge, { backgroundColor: c.default }]}>
                            <Text style={[styles.countBadgeText, { color: c.foreground }]}>{col.items.length}</Text>
                          </View>
                        </View>
                        <View style={{ gap: 8 }}>
                          {col.items.length === 0 ? (
                            <Text style={[styles.emptyText, { color: c.muted }]}>{d.empty}</Text>
                          ) : (
                            col.items.slice(0, 4).map((task) => (
                              <TaskCardMini key={task.id} task={task} c={c} />
                            ))
                          )}
                        </View>
                      </View>
                    </Fade>
                  ))}
                </Animated.ScrollView>
              ) : (
                <View style={{ gap: 4 }}>
                  {tasks.slice(0, 8).map((task) => (
                    <TaskRowItem key={task.id} task={task} c={c} />
                  ))}
                  {tasks.length === 0 && (
                    <Text style={[styles.emptyText, { color: c.muted, paddingVertical: 24 }]}>{d.noTasksYet}</Text>
                  )}
                </View>
              )}
            </Card.Body>
          </Card>
        </Fade>

        {/* Task distribution */}
        <Fade delay={580} style={{ marginTop: 20, paddingHorizontal: 20 }}>
          <Card style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }} className="overflow-hidden">
            <Card.Header>
              <Card.Title style={{ color: c.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>{d.taskDist}</Card.Title>
              <Text style={[styles.cardSub, { color: c.muted }]}>{d.perDayWeek}</Text>
            </Card.Header>
            <Card.Body style={{ paddingTop: 0 }}>
              <BarChart data={weeklyData.map((w) => ({ label: w.day, value: w.created }))} height={160} color={c.accent} />
            </Card.Body>
          </Card>
        </Fade>

        {/* Activity feed */}
        <Fade delay={640} style={{ marginTop: 20, paddingHorizontal: 20 }}>
          <Card style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border }} className="overflow-hidden">
            <Card.Header>
              <Card.Title style={{ color: c.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>{d.activity}</Card.Title>
              <Text style={[styles.cardSub, { color: c.muted }]}>{d.activityPulse}</Text>
            </Card.Header>
            <Card.Body style={{ padding: 0 }}>
              {activityFeed.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.muted, paddingVertical: 24 }]}>{d.noTasksYet}</Text>
              ) : activityFeed.map((row, idx) => (
                <View
                  key={row.id}
                  style={[
                    styles.activityRow,
                    idx < activityFeed.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
                  ]}
                >
                  <View style={[styles.activityIcon, { backgroundColor: row.color + '22' }]}>
                    <HugeiconsIcon icon={row.icon} size={16} color={row.color} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2} style={[styles.activityTitle, { color: c.foreground }]}>{row.title}</Text>
                    <Text style={[styles.activityMeta, { color: c.muted }]}>{row.meta}</Text>
                  </View>
                </View>
              ))}
            </Card.Body>
          </Card>
        </Fade>
      </Animated.ScrollView>
      </BlurTargetView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function HeaderMenu({ c, t, locale }: { c: SemanticTheme; t: ReturnType<typeof useI18n>['t']; locale: 'en' | 'ru' | 'de' }) {
  const notifLabel = locale === 'en' ? 'Notifications' : locale === 'de' ? 'Benachrichtigungen' : 'Уведомления';
  const items: { icon: any; label: string; href: any; color?: string }[] = [
    { icon: Search01Icon, label: t.common.search.replace('...', '').replace('…', '').trim(), href: '/(tabs)/(search)' },
    { icon: Notification03Icon, label: notifLabel, href: '/notifications' },
    { icon: Settings02Icon, label: t.settings.title, href: '/(tabs)/(settings)' },
  ];
  return (
    <View style={{ gap: 2 }}>
      {items.map((it, idx) => (
        <Pressable
          key={it.label + idx}
          onPress={() => router.push(it.href)}
          style={({ pressed }) => [
            styles.menuItem,
            { backgroundColor: pressed ? c.surfaceSecondary : 'transparent' },
          ]}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: (it.color ?? c.foreground) + '14' }]}>
            <HugeiconsIcon icon={it.icon} size={16} color={it.color ?? c.foreground} strokeWidth={1.7} />
          </View>
          <Text style={[styles.menuLabel, { color: c.foreground }]} numberOfLines={1}>
            {it.label}
          </Text>
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={c.muted} strokeWidth={1.6} />
        </Pressable>
      ))}
    </View>
  );
}

function StatCard({
  stat,
  c,
}: {
  stat: { label: string; value: number; sub: string; icon: any; color: string; suffix?: string };
  c: SemanticTheme;
}) {
  const pressed = useSharedValue(0);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.97 : 1, { damping: 15, stiffness: 260 }) }],
  }));

  return (
    <Pressable
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.statCard,
          { backgroundColor: c.surface, borderColor: c.border },
          animStyle,
        ]}
      >
        <LinearGradient
          colors={[stat.color + '14', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.statIcon, { backgroundColor: stat.color + '1A' }]}>
          <HugeiconsIcon icon={stat.icon} size={20} color={stat.color} strokeWidth={1.7} />
        </View>
        <SlidingNumber
          value={stat.value}
          suffix={stat.suffix}
          textStyle={{ color: c.foreground, fontSize: 26, fontWeight: '700', letterSpacing: -0.4 }}
        />
        <Text style={[styles.statLabel, { color: c.foreground }]}>{stat.label}</Text>
        <Text style={[styles.statSub, { color: c.muted }]}>{stat.sub}</Text>
      </Animated.View>
    </Pressable>
  );
}

function TaskCardMini({ task, c }: { task: TaskPayload; c: SemanticTheme }) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: withSpring(pressed.value ? -2 : 0, { damping: 12, stiffness: 260 }) }],
  }));
  const dotColor =
    task.priority === 'high' ? c.danger : task.priority === 'medium' ? c.warning : c.success;

  return (
    <Pressable
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
    >
      <Animated.View style={[styles.miniTaskCard, { backgroundColor: c.surface, borderColor: c.border }, anim]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.dot, { backgroundColor: dotColor, marginTop: 6 }]} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={2} style={[styles.miniTaskTitle, { color: c.foreground }]}>{task.title}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {task.dueDate && (
                <Text style={[styles.miniTaskMeta, { color: c.muted }]}>
                  {new Date(task.dueDate).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
                </Text>
              )}
              {task.labels[0] && (
                <View style={[styles.labelChip, { backgroundColor: c.default }]}>
                  <Text style={[styles.labelChipText, { color: c.defaultForeground }]}>{task.labels[0]}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function TaskRowItem({ task, c }: { task: TaskPayload; c: SemanticTheme }) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    backgroundColor: pressed.value ? c.surfaceSecondary : 'transparent',
  }));
  const dotColor =
    task.priority === 'high' ? c.danger : task.priority === 'medium' ? c.warning : c.success;
  const statusColor =
    task.status === 'done' ? c.success : task.status === 'in_progress' ? c.accent : task.status === 'review' ? c.warning : c.muted;
  const statusLabel =
    task.status === 'done'
      ? 'Готово'
      : task.status === 'in_progress'
        ? 'В работе'
        : task.status === 'review'
          ? 'Ревью'
          : 'Todo';

  return (
    <Pressable
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
    >
      <Animated.View style={[styles.listRow, anim]}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text numberOfLines={1} style={[styles.listTitle, { color: c.foreground }]}>{task.title}</Text>
        <View style={[styles.statusChip, { backgroundColor: statusColor + '22' }]}>
          <Text style={[styles.statusChipText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function MeetingsFeaturedCard({
  c,
  label,
  subtitle,
  joinLabel,
}: {
  c: SemanticTheme;
  label: string;
  subtitle: string;
  joinLabel: string;
}) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [
      { scale: withSpring(pressed.value ? 0.98 : 1, { damping: 14, stiffness: 240 }) },
    ],
  }));
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withSpring(1, { damping: 12, stiffness: 160 });
  }, [pulse]);

  return (
    <Pressable
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      onPress={() => router.push('/meetings')}
    >
      <Animated.View
        style={[
          styles.meetingCard,
          { backgroundColor: c.surface, borderColor: c.border },
          anim,
        ]}
      >
        <LinearGradient
          colors={[c.accent + '26', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.meetingIcon, { backgroundColor: c.accent + '26' }]}>
          <HugeiconsIcon icon={Call02Icon} size={22} color={c.accent} strokeWidth={1.9} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.meetingTitle, { color: c.foreground }]} numberOfLines={1}>
            {label}
          </Text>
          <Text style={[styles.meetingSub, { color: c.muted }]} numberOfLines={2}>
            {subtitle}
          </Text>
          <View style={styles.meetingRow}>
            <View style={[styles.meetingPill, { backgroundColor: c.accent + '18', borderColor: c.accent + '40' }]}>
              <HugeiconsIcon icon={UserGroup02Icon} size={12} color={c.accent} strokeWidth={1.9} />
              <Text style={[styles.meetingPillText, { color: c.accent }]}>5</Text>
            </View>
            <Text style={[styles.meetingJoin, { color: c.accent }]}>{joinLabel} →</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  headerContent: {
    flex: 1,
    justifyContent: 'center',
  },
  headerIconsLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnFilled: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleSmall: {
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
    letterSpacing: 0.1,
    textAlign: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },

  largeTitleContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingRight: 160,
  },
  largeTitle: {
    fontSize: SigmaTypo.largeTitle,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  largeSubtitle: {
    marginTop: 4,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
  },

  statsGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  statWrap: {
    width: (SCREEN_W - 40 - 10) / 2,
  },
  statCard: {
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    overflow: 'hidden',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '600',
    marginTop: 4,
  },
  statSub: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '500',
  },

  cardHeadline: {
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '700',
  },
  cardSub: {
    marginTop: 2,
    fontSize: SigmaTypo.caption,
    fontWeight: '500',
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: SigmaTypo.bodySmall,
  },
  quickAddActions: {
    flexDirection: 'row',
    gap: 8,
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  ghostBtnText: {
    fontSize: SigmaTypo.caption,
    fontWeight: '600',
  },

  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  shortcutsRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutWrap: {
    width: (SCREEN_W - 40 - 10) / 2,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: SigmaRadius.md,
    borderWidth: 1,
    padding: 12,
    overflow: 'hidden',
  },
  shortcutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '600',
    letterSpacing: -0.2,
  },

  boardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 4,
  },
  toggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardCol: {
    width: SCREEN_W * 0.62,
    padding: 10,
    borderRadius: SigmaRadius.md,
    borderWidth: 1,
  },
  boardColHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  boardColTitle: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '700',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniTaskCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  miniTaskTitle: {
    fontSize: SigmaTypo.caption,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  miniTaskMeta: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '500',
  },
  labelChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  labelChipText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: SigmaTypo.caption,
    textAlign: 'center',
    paddingVertical: 8,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  listTitle: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '700',
  },

  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: SigmaTypo.caption,
    fontWeight: '600',
    lineHeight: 17,
  },
  activityMeta: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '500',
    marginTop: 3,
  },

  meetingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  meetingIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingTitle: {
    fontSize: SigmaTypo.headline,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  meetingSub: {
    marginTop: 4,
    fontSize: SigmaTypo.caption,
    fontWeight: '500',
    lineHeight: 17,
  },
  meetingRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  meetingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  meetingPillText: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '700',
  },
  meetingJoin: {
    fontSize: SigmaTypo.caption,
    fontWeight: '700',
    marginLeft: 'auto',
  },

  // Header avatar
  avatarLetter: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  // Popover menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '600',
  },
});
