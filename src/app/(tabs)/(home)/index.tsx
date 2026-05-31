import { AreaChart } from '@/components/charts/AreaChart';
import { BarChart } from '@/components/charts/BarChart';
import { AccentCardSurface, CardSurface } from '@/components/card-surface';
import { HeaderBlurBackground } from '@/components/header-blur-background';
import { MEETING_RIPPLE_ART, MeetingCardRippleArt, meetingRippleIconColor } from '@/components/meeting-card-ripple-art';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/contexts/workspace-context';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, type AnalyticsPayload, type TaskPayload } from '@/lib/api';
import { cachedApi } from '@/lib/cache/cached-api';
import { getMeetingBorderStops, getMeetingHeroSheenStops } from '@/lib/theme-surfaces';
import { useCacheSync } from '@/lib/cache/use-cache-sync';
import { useCollapsibleHeaderScroll } from '@/hooks/use-collapsible-header-scroll';
import { useCollapsibleHeaderStyles } from '@/hooks/use-collapsible-header-styles';
import { useCollapsibleRefreshControl } from '@/hooks/use-collapsible-refresh-control';
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
import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Chip, Popover } from 'heroui-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Dimensions,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_ANIMATE = Platform.OS !== 'android';

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
  const { t } = useI18n();
  const d = t.dashboard;
  const { activeWorkspaceId, activeProjectId, projects } = useWorkspace();
  const { user } = useAuth();
  // Local blur target: the BlurView in the header samples THIS screen's
  // scrollable content. Must be a SIBLING of the BlurView (not an ancestor),
  // otherwise Android's dimezisBlurViewSdk31Plus native sampler crashes.
  const blurTargetRef = useRef<View>(null);

  const userInitial = (user?.email?.[0] ?? 'U').toUpperCase();
  const userLabel = user?.email?.split('@')[0] ?? d.title;

  const [tasks, setTasks] = useState<TaskPayload[]>(() => cachedApi.getTasksSync());
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(() =>
    activeWorkspaceId ? cachedApi.getAnalyticsSync(activeWorkspaceId) : null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [statusMessage, setStatusMessage] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  // ── Join project by invite code ──
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinedOk, setJoinedOk] = useState(false);

  const refreshData = useCallback(async (force = false) => {
    if (!activeWorkspaceId) return;
    const [taskList, ana] = await Promise.all([
      cachedApi.getTasks({ force }),
      cachedApi.getAnalytics(activeWorkspaceId, { force }),
    ]);
    setTasks(taskList);
    setAnalytics(ana);
  }, [activeWorkspaceId]);

  const syncFromCache = useCallback(() => {
    if (!activeWorkspaceId) return;
    setTasks(cachedApi.getTasksSync());
    setAnalytics(cachedApi.getAnalyticsSync(activeWorkspaceId));
  }, [activeWorkspaceId]);

  useCacheSync(syncFromCache);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let cancelled = false;

    void (async () => {
      syncFromCache();
      const [taskList, ana] = await Promise.all([
        cachedApi.getTasks(),
        cachedApi.getAnalytics(activeWorkspaceId),
      ]);

      if (cancelled) return;
      setTasks(taskList);
      setAnalytics(ana);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData(true);
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);

  const refreshControl = useCollapsibleRefreshControl({ refreshing, onRefresh, c });

  const createTask = async () => {
    if (!activeWorkspaceId || !newTaskTitle.trim()) return;
    const projectId = activeProjectId || projects[0]?.id;
    if (!projectId) return;
    await cachedApi.createTask({
      workspaceId: activeWorkspaceId,
      projectId,
      title: newTaskTitle.trim(),
      priority: 'medium',
    });
    setNewTaskTitle('');
    syncFromCache();
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

  const { scrollRef, headerProgress, scrollHandler, resetScroll } = useCollapsibleHeaderScroll('home');
  const iconsRestX = SCREEN_W - 200;
  const {
    headerBgStyle,
    smallTitleStyle: headerTitleStyle,
    largeTitleStyle,
    leftIconsStyle,
  } = useCollapsibleHeaderStyles(headerProgress, { iconsRestX });

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tabPress', (tab) => {
      if (tab === '(home)') resetScroll();
    });
    return () => sub.remove();
  }, [resetScroll]);

  const HEADER_H = insets.top + 54;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── STICKY HEADER ── */}
      <View style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <HeaderBlurBackground blurTargetRef={blurTargetRef} />
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
                  <HeaderMenu c={c} t={t} />
                </Popover.Content>
              </Popover.Portal>
            </Popover>
          </View>
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }} collapsable={false}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 9, paddingBottom: insets.bottom + 110 }}
        refreshControl={refreshControl}
      >
        <Animated.View style={[styles.largeTitleContainer, largeTitleStyle]}>
          <Text style={[styles.largeTitle, { color: c.foreground }]}>{d.title}</Text>
          <Text style={[styles.largeSubtitle, { color: c.muted }]}>{d.subtitle}</Text>
          <View style={styles.heroPulseRow}>
            <View style={[styles.heroPulseDot, { backgroundColor: c.success }]} />
            <Text style={[styles.heroPulseText, { color: c.muted }]}>
              {productivity.activeNow} {d.activeNowSub.toLowerCase()}
            </Text>
          </View>
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
          {statCards.map((stat) => (
            <View key={stat.label} style={styles.statWrap}>
              <StatCard stat={stat} c={c} />
            </View>
          ))}
        </View>

        {/* Join Project */}
        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <CardSurface c={c} accent={c.accent}>
            <View style={styles.premiumCardBody}>
              <View style={styles.premiumCardHead}>
                <View style={[styles.premiumIconWrap, { backgroundColor: c.accent + '20' }]}>
                  <HugeiconsIcon icon={UserAdd01Icon} size={20} color={c.accent} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.premiumCardTitle, { color: c.foreground }]}>{d.joinTitle}</Text>
                  <Text style={[styles.premiumCardHint, { color: c.muted }]}>{d.joinHint}</Text>
                </View>
              </View>
              <View style={styles.quickAddRow}>
                <TextInput
                  value={joinCode}
                  onChangeText={(text) => { setJoinCode(text); if (joinError) setJoinError(null); }}
                  placeholder={d.joinPlaceholder}
                  placeholderTextColor={c.muted}
                  style={[styles.premiumInput, { color: c.foreground, backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
                  editable={!joining && !joinedOk}
                  onSubmitEditing={() => void handleJoin()}
                  returnKeyType="go"
                />
                <Pressable
                  onPress={() => void handleJoin()}
                  disabled={!joinCode.trim() || joining || joinedOk}
                  style={({ pressed }) => [
                    styles.premiumPrimaryBtn,
                    { backgroundColor: c.accent, opacity: !joinCode.trim() || joining || joinedOk ? 0.45 : pressed ? 0.88 : 1 },
                  ]}
                >
                  <Text style={styles.premiumPrimaryBtnText}>
                    {joinedOk ? '✓' : joining ? d.joining : d.joinAction}
                  </Text>
                </Pressable>
              </View>
              {!!joinError && (
                <Text style={[styles.premiumError, { color: c.danger }]}>{joinError}</Text>
              )}
            </View>
          </CardSurface>
        </View>

        {/* Meetings featured card */}
        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          <MeetingsFeaturedCard c={c} m={t.meetings} />
        </View>

        {/* Productivity trend */}
        <View style={{ marginTop: 18, paddingHorizontal: 20 }}>
          <CardSurface c={c} accent={c.accent}>
            <View style={styles.premiumCardBody}>
              <SectionHeader c={c} eyebrow={d.focusHours} title={d.productivityTrends} />
              <View style={[styles.chartWell, { backgroundColor: c.surfaceSecondary }]}>
                <AreaChart
                  data={weeklyData.map((w) => ({ label: w.day, value: w.completed }))}
                  height={188}
                  color={c.accent}
                  animate={CHART_ANIMATE}
                />
              </View>
            </View>
          </CardSurface>
        </View>

        {/* Sprint board */}
        <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
          <CardSurface c={c} allowOverflow>
            <View style={styles.premiumCardBody}>
              <View style={styles.boardHeaderRow}>
                <SectionHeader c={c} title={d.sprintBoardTitle} compact />
                <View style={[styles.toggleRow, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                  <Pressable
                    onPress={() => setViewMode('board')}
                    style={[styles.toggleBtn, viewMode === 'board' && { backgroundColor: c.surface }]}
                  >
                    <HugeiconsIcon icon={GridViewIcon} size={16} color={viewMode === 'board' ? c.accent : c.muted} strokeWidth={1.8} />
                  </Pressable>
                  <Pressable
                    onPress={() => setViewMode('list')}
                    style={[styles.toggleBtn, viewMode === 'list' && { backgroundColor: c.surface }]}
                  >
                    <HugeiconsIcon icon={Menu01Icon} size={16} color={viewMode === 'list' ? c.accent : c.muted} strokeWidth={1.8} />
                  </Pressable>
                </View>
              </View>
              {viewMode === 'board' ? (
                <View style={styles.boardScrollWrap}>
                  <Animated.ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.boardScrollContent}
                  >
                    {columns.map((col, idx) => (
                      <View
                        key={col.key}
                        style={[
                          styles.boardCol,
                          { backgroundColor: c.surfaceSecondary, borderColor: c.border },
                          idx < columns.length - 1 && styles.boardColGap,
                        ]}
                      >
                        <View style={styles.boardColHead}>
                          <View style={[styles.boardColAccent, { backgroundColor: col.dot }]} />
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
                    ))}
                  </Animated.ScrollView>
                </View>
              ) : (
                <View style={[styles.listWell, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                  {tasks.slice(0, 8).map((task) => (
                    <TaskRowItem key={task.id} task={task} c={c} />
                  ))}
                  {tasks.length === 0 && (
                    <Text style={[styles.emptyText, { color: c.muted, paddingVertical: 28 }]}>{d.noTasksYet}</Text>
                  )}
                </View>
              )}
            </View>
          </CardSurface>
        </View>

        {/* Task distribution */}
        <View style={{ marginTop: 16, paddingHorizontal: 20 }}>
          <CardSurface c={c} accent="#a855f7">
            <View style={styles.premiumCardBody}>
              <SectionHeader c={c} eyebrow={d.perDayWeek} title={d.taskDist} />
              <View style={[styles.chartWell, { backgroundColor: c.surfaceSecondary }]}>
                <BarChart
                  data={weeklyData.map((w) => ({ label: w.day, value: w.created }))}
                  height={168}
                  color="#a855f7"
                  animate={CHART_ANIMATE}
                />
              </View>
            </View>
          </CardSurface>
        </View>

        {/* Activity feed */}
        <View style={{ marginTop: 16, paddingHorizontal: 20, marginBottom: 8 }}>
          <CardSurface c={c} accent={c.success}>
            <View style={styles.premiumCardBody}>
              <SectionHeader c={c} eyebrow={d.activityPulse} title={d.activity} />
              {activityFeed.length === 0 ? (
                <Text style={[styles.emptyText, { color: c.muted, paddingVertical: 28 }]}>{d.noTasksYet}</Text>
              ) : (
                <View style={[styles.activityWell, { backgroundColor: c.surfaceSecondary }]}>
                  {activityFeed.map((row, idx) => (
                    <View
                      key={row.id}
                      style={[
                        styles.activityRow,
                        idx < activityFeed.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
                      ]}
                    >
                      <View style={styles.activityTimeline}>
                        <View style={[styles.activityIcon, { backgroundColor: row.color + '22' }]}>
                          <HugeiconsIcon icon={row.icon} size={16} color={row.color} strokeWidth={1.8} />
                        </View>
                        {idx < activityFeed.length - 1 && (
                          <View style={[styles.activityLine, { backgroundColor: c.separator }]} />
                        )}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 2 }}>
                        <Text numberOfLines={2} style={[styles.activityTitle, { color: c.foreground }]}>{row.title}</Text>
                        <Text style={[styles.activityMeta, { color: c.muted }]}>{row.meta}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </CardSurface>
        </View>
      </Animated.ScrollView>
      </BlurTargetView>
    </View>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function SectionHeader({
  c,
  eyebrow,
  title,
  compact,
}: {
  c: SemanticTheme;
  eyebrow?: string;
  title: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.sectionHeader, compact && { marginBottom: 10 }]}>
      {!!eyebrow && (
        <Text style={[styles.sectionEyebrow, { color: c.accent }]}>{eyebrow.toUpperCase()}</Text>
      )}
      <Text style={[styles.sectionTitle, { color: c.foreground }]}>{title}</Text>
    </View>
  );
}

function HeaderMenu({ c, t }: { c: SemanticTheme; t: ReturnType<typeof useI18n>['t'] }) {
  const items: { icon: any; label: string; href: any; color?: string }[] = [
    { icon: Search01Icon, label: t.tabs.search, href: '/(tabs)/(search)' },
    { icon: Notification03Icon, label: t.notifications.title, href: '/notifications' },
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
    transform: [{ scale: pressed.value ? 0.97 : 1 }],
  }));

  return (
    <Pressable
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
      style={{ flex: 1 }}
    >
      <Animated.View style={animStyle}>
        <AccentCardSurface c={c} color={stat.color} style={styles.statBorder} innerStyle={styles.statCard}>
          <View style={styles.statCardContent}>
            <View style={[styles.statIconWrap, { backgroundColor: stat.color + (c.scheme === 'dark' ? '14' : '10') }]}>
              <HugeiconsIcon icon={stat.icon} size={59} color={stat.color} strokeWidth={1.5} />
            </View>
            <View style={styles.statValueBlock}>
              <Text style={[styles.statValue, { color: c.foreground }]} allowFontScaling={false}>
                {stat.value}
                {stat.suffix ?? ''}
              </Text>
            </View>
            <View style={styles.statTextBlock}>
              <Text style={[styles.statLabel, { color: c.foreground }]} allowFontScaling={false}>{stat.label}</Text>
              <Text style={[styles.statSub, { color: c.muted }]} numberOfLines={1} allowFontScaling={false}>
                {stat.sub}
              </Text>
            </View>
          </View>
        </AccentCardSurface>
      </Animated.View>
    </Pressable>
  );
}

function TaskCardMini({ task, c }: { task: TaskPayload; c: SemanticTheme }) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ translateY: pressed.value ? -2 : 0 }],
  }));
  const dotColor =
    task.priority === 'high' ? c.danger : task.priority === 'medium' ? c.warning : c.success;

  return (
    <Pressable
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
    >
      <Animated.View style={[styles.miniTaskCard, { backgroundColor: c.surface, borderColor: c.border }, anim]}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
          <View style={[styles.miniPriorityBar, { backgroundColor: dotColor }]} />
          <View style={{ flex: 1 }}>
            <Text numberOfLines={2} style={[styles.miniTaskTitle, { color: c.foreground }]}>{task.title}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {task.dueDate && (
                <Text style={[styles.miniTaskMeta, { color: c.muted }]}>
                  {new Date(task.dueDate).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' })}
                </Text>
              )}
              {task.labels[0] && (
                <View style={[styles.labelChip, { backgroundColor: c.accent + '16', borderColor: c.accent + '30' }]}>
                  <Text style={[styles.labelChipText, { color: c.accent }]}>{task.labels[0]}</Text>
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
  const { t } = useI18n();
  const d = t.dashboard;
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
      ? d.done
      : task.status === 'in_progress'
        ? d.inProgress
        : task.status === 'review'
          ? d.review
          : d.todo;

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
  m,
}: {
  c: SemanticTheme;
  m: ReturnType<typeof useI18n>['t']['meetings'];
}) {
  const ctaPressed = useSharedValue(0);
  const ctaAnim = useAnimatedStyle(() => ({
    opacity: ctaPressed.value ? 0.88 : 1,
    transform: [{ scale: ctaPressed.value ? 0.98 : 1 }],
  }));

  const iconAccent = meetingRippleIconColor(c.scheme === 'dark');
  const borderColors = getMeetingBorderStops(c.scheme);
  const heroSubtitle = m.subtitle.split('—')[0]?.trim() || m.subtitle;

  const heroInner = (
    <>
        <LinearGradient
          colors={getMeetingHeroSheenStops(c.scheme)}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        <View pointerEvents="none" style={styles.meetingArtLayer}>
          <MeetingCardRippleArt isDark={c.scheme === 'dark'} />
          <View style={styles.meetingIconOrb}>
            <HugeiconsIcon
              icon={Call02Icon}
              size={MEETING_RIPPLE_ART.iconSize}
              color={iconAccent}
              strokeWidth={1.5}
            />
          </View>
        </View>

        <View style={styles.meetingHeroBody}>
          <View style={styles.meetingHeroTop}>
            <View style={{ flex: 1, paddingRight: 96 }}>
              <View style={[styles.meetingEyebrowPill, { backgroundColor: c.scheme === 'dark' ? 'rgba(129,140,248,0.14)' : 'rgba(99,102,241,0.08)' }]}>
                <View style={[styles.meetingLiveDot, { backgroundColor: '#22c55e' }]} />
                <Text style={[styles.meetingEyebrowText, { color: c.scheme === 'dark' ? '#c7d2fe' : '#4338ca' }]}>
                  {m.preview.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.meetingHeroTitle, { color: c.foreground }]}>
                {m.title}
              </Text>
              <Text style={[styles.meetingHeroSub, { color: c.muted }]} numberOfLines={2}>
                {heroSubtitle}
              </Text>
            </View>
          </View>

          <View style={styles.meetingCtaRow}>
            <Pressable
              onPress={() => router.push('/meetings')}
              onPressIn={() => { ctaPressed.value = 1; }}
              onPressOut={() => { ctaPressed.value = 0; }}
              accessibilityRole="button"
              accessibilityLabel={m.join}
            >
              <Animated.View style={[styles.meetingCtaBtn, { backgroundColor: c.accent }, ctaAnim]}>
                <Text style={[styles.meetingCtaText, { color: c.accentForeground }]}>{m.join}</Text>
                <HugeiconsIcon icon={ArrowRight01Icon} size={16} color={c.accentForeground} strokeWidth={2} />
              </Animated.View>
            </Pressable>
          </View>
        </View>
    </>
  );

  if (borderColors) {
    return (
      <LinearGradient colors={borderColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.meetingBorder}>
        <View style={[styles.meetingHero, { backgroundColor: c.surface }]}>{heroInner}</View>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.meetingBorderLight, { borderColor: c.border, backgroundColor: c.surface }]}>
      <View style={styles.meetingHero}>{heroInner}</View>
    </View>
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
    marginBottom: 12,
    paddingRight: 160,
  },
  largeTitle: {
    fontSize: SigmaTypo.largeTitle,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  largeSubtitle: {
    marginTop: 6,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
    lineHeight: 20,
  },
  heroPulseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  heroPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  heroPulseText: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  meetingBorder: {
    borderRadius: SigmaRadius.xl,
    padding: 1,
  },
  meetingBorderLight: {
    borderRadius: SigmaRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  meetingHero: {
    borderRadius: SigmaRadius.xl - 1,
    overflow: 'hidden',
    minHeight: MEETING_RIPPLE_ART.height,
  },
  meetingArtLayer: {
    position: 'absolute',
    top: 0,
    right: -20,
    width: MEETING_RIPPLE_ART.width,
    height: MEETING_RIPPLE_ART.height,
    zIndex: 0,
  },
  meetingIconOrb: {
    position: 'absolute',
    top: MEETING_RIPPLE_ART.iconTop,
    left: MEETING_RIPPLE_ART.iconLeft,
    width: MEETING_RIPPLE_ART.iconSize,
    height: MEETING_RIPPLE_ART.iconSize,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  meetingHeroBody: {
    padding: 20,
    gap: 18,
    position: 'relative',
    zIndex: 2,
  },
  meetingHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  meetingEyebrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  meetingLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  meetingEyebrowText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  meetingHeroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  meetingHeroSub: {
    marginTop: 6,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
    lineHeight: 20,
  },
  meetingCtaRow: {
    marginTop: 2,
  },
  meetingCtaBtn: {
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  meetingCtaText: {
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  premiumCardBody: {
    padding: 18,
    gap: 14,
  },
  premiumCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  premiumIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumCardTitle: {
    fontSize: SigmaTypo.headline,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  premiumCardHint: {
    marginTop: 3,
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '500',
    lineHeight: 15,
  },
  premiumInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
  },
  premiumPrimaryBtn: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 88,
  },
  premiumPrimaryBtnText: {
    color: '#fff',
    fontSize: SigmaTypo.caption,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  premiumError: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '600',
  },
  sectionHeader: {
    marginBottom: 4,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: SigmaTypo.title3,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  chartWell: {
    borderRadius: SigmaRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  listWell: {
    borderRadius: SigmaRadius.lg,
    overflow: 'hidden',
  },
  activityWell: {
    borderRadius: SigmaRadius.lg,
    overflow: 'hidden',
  },

  statsGrid: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  statWrap: {
    width: (SCREEN_W - 40 - 12) / 2,
  },
  statBorder: {
    borderRadius: SigmaRadius.xl,
    padding: 1,
  },
  statCard: {
    height: 136,
  },
  statCardContent: {
    flex: 1,
    position: 'relative',
    zIndex: 1,
  },
  statValueBlock: {
    position: 'absolute',
    left: 22,
    top: 38,
    paddingRight: 72,
    zIndex: 2,
  },
  statTextBlock: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    alignItems: 'flex-start',
    gap: 3,
    zIndex: 2,
  },
  statIconWrap: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 68,
    height: 68,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.92,
  },
  statValue: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 38,
  },
  statLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  statSub: {
    fontSize: SigmaTypo.caption,
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
    padding: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boardScrollWrap: {
    marginHorizontal: -2,
    overflow: 'visible',
  },
  boardScrollContent: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  boardCol: {
    width: SCREEN_W * 0.64,
    padding: 12,
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
  },
  boardColGap: {
    marginRight: 12,
  },
  boardColHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  boardColAccent: {
    width: 4,
    height: 16,
    borderRadius: 2,
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
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  miniPriorityBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    minHeight: 32,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
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
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  activityTimeline: {
    alignItems: 'center',
    width: 34,
  },
  activityLine: {
    width: 2,
    flex: 1,
    minHeight: 10,
    marginTop: 3,
    borderRadius: 1,
    opacity: 0.7,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: SigmaTypo.caption,
    fontWeight: '600',
    lineHeight: 16,
  },
  activityMeta: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '500',
    marginTop: 2,
  },

  meetingIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
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
