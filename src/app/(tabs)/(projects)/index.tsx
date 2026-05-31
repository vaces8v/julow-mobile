import { AccentCardSurface } from '@/components/card-surface';
import { HeaderBlurBackground } from '@/components/header-blur-background';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useWorkspace } from '@/contexts/workspace-context';
import { useCollapsibleHeaderScroll } from '@/hooks/use-collapsible-header-scroll';
import { useCollapsibleHeaderStyles } from '@/hooks/use-collapsible-header-styles';
import { useCollapsibleRefreshControl } from '@/hooks/use-collapsible-refresh-control';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import type { Locale, Translations } from '@/i18n/translations';
import { api, normalizeProjectStatus, type ProjectPayload } from '@/lib/api';
import { cachedApi } from '@/lib/cache/cached-api';
import { getLightRaisedCardStyle, getModalBorderStops, getAccentSheenStops } from '@/lib/theme-surfaces';
import { useCacheSync } from '@/lib/cache/use-cache-sync';
import {
  Add01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  Folder02Icon,
  Task01Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FALLBACK_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e',
  '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#ef4444',
];

function projectColor(project: ProjectPayload, idx: number) {
  return project.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function statusMeta(status: string | undefined, c: SemanticTheme, p: Translations['projectsPage']) {
  const key = normalizeProjectStatus(status);
  if (key === 'archived') return { label: p.statusArchived, bg: c.muted + '22', fg: c.muted };
  if (key === 'suspended') return { label: p.statusSuspended, bg: c.warning + '18', fg: c.warning };
  if (key === 'pending_deletion') return { label: p.statusPendingDeletion, bg: c.danger + '18', fg: c.danger };
  return { label: p.statusActive, bg: c.success + '18', fg: c.success };
}


function formatTemplate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));
}

function pickPluralForm(
  n: number,
  locale: Locale,
  forms: { one: string; few: string; many: string },
) {
  if (locale === 'ru') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms.one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms.few;
    return forms.many;
  }
  return n === 1 ? forms.one : forms.many;
}

function capitalizeLabel(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function ProjectsScreen() {
  const c = useSemanticTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const blurTargetRef = useRef<View>(null);
  const { activeWorkspaceId, refreshProjects } = useWorkspace();

  const [allProjects, setAllProjects] = useState<ProjectPayload[]>(() => cachedApi.getMyProjectsSync());
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>(
    () => cachedApi.getTaskCountsSync(),
  );
  const [refreshing, setRefreshing] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = useCallback(async (force = false) => {
    try {
      const myProjects = await cachedApi.getMyProjects({ force });
      setAllProjects(myProjects);

      const counts = await cachedApi.getTaskCounts({ force });
      setTaskCounts(counts);
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }, []);

  const syncFromCache = useCallback(() => {
    setAllProjects(cachedApi.getMyProjectsSync());
    setTaskCounts(cachedApi.getTaskCountsSync());
  }, []);

  useCacheSync(syncFromCache);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        syncFromCache();
        const myProjects = await cachedApi.getMyProjects();
        const counts = await cachedApi.getTaskCounts();
        if (cancelled) return;

        setAllProjects(myProjects);
        setTaskCounts(counts);
      } catch (e) {
        console.error('Failed to load projects:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadData(true), refreshProjects(true)]);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, refreshProjects]);

  const refreshControl = useCollapsibleRefreshControl({ refreshing, onRefresh, c });

  const handleCreate = async () => {
    if (!activeWorkspaceId || !newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await cachedApi.createProject({
        workspaceId: activeWorkspaceId,
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewName('');
      setNewDesc('');
      setCreateOpen(false);
      await refreshProjects(true);
      syncFromCache();
    } catch (e) {
      console.error('Failed to create project:', e);
      setCreateError(e instanceof Error ? e.message : t.projectsPage.createFailed);
    } finally {
      setCreating(false);
    }
  };

  const totalTasks = useMemo(() => Object.values(taskCounts).reduce((s, n) => s + n.total, 0), [taskCounts]);
  const totalDone = useMemo(() => Object.values(taskCounts).reduce((s, n) => s + n.done, 0), [taskCounts]);
  const completionPct = totalTasks > 0 ? Math.round((totalDone / totalTasks) * 100) : 0;
  const activeCount = useMemo(
    () => allProjects.filter((p) => normalizeProjectStatus(p.status) === 'active').length,
    [allProjects],
  );

  const projectLabel = capitalizeLabel(
    pickPluralForm(allProjects.length, locale, {
      one: t.projectsPage.projectOne,
      few: t.projectsPage.projectFew,
      many: t.projectsPage.projectMany,
    }),
  );
  const taskLabel = capitalizeLabel(
    pickPluralForm(totalTasks, locale, {
      one: t.projectsPage.taskOne,
      few: t.projectsPage.taskFew,
      many: t.projectsPage.taskMany,
    }),
  );

  const { scrollRef, headerProgress, scrollHandler } = useCollapsibleHeaderScroll('projects');
  const HEADER_H = insets.top + 54;
  const {
    headerBgStyle,
    smallTitleStyle,
    largeTitleStyle,
    headerActionStyle: headerAddStyle,
  } = useCollapsibleHeaderStyles(headerProgress);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <HeaderBlurBackground blurTargetRef={blurTargetRef} />
          <View style={[styles.headerBorder, { backgroundColor: c.border }]} />
        </Animated.View>
        <View style={styles.headerContent} pointerEvents="box-none">
          <Animated.Text style={[styles.headerTitleSmall, { color: c.foreground }, smallTitleStyle]} numberOfLines={1}>
            {t.common.projects}
          </Animated.Text>
          <Animated.View style={[styles.headerRight, headerAddStyle]} pointerEvents="box-none">
            <Pressable
              style={[styles.headerAddBtn, { backgroundColor: c.accent }]}
              onPress={() => setCreateOpen(true)}
            >
              <HugeiconsIcon icon={Add01Icon} size={18} color={c.accentForeground} strokeWidth={2.2} />
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }} collapsable={false}>
        <Animated.ScrollView
          ref={scrollRef}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 10,
            paddingBottom: insets.bottom + 100,
            paddingHorizontal: 20,
          }}
          refreshControl={refreshControl}
        >
          <Animated.View style={[styles.largeTitleWrap, largeTitleStyle]}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.largeTitle, { color: c.foreground }]}>{t.common.projects}</Text>
              <Text style={[styles.largeSubtitle, { color: c.muted }]}>
                {allProjects.length} {t.common.projects.toLowerCase()} · {totalDone}/{totalTasks} {t.common.tasks.toLowerCase()}
              </Text>
            </View>
            <Pressable style={[styles.addBtn, { backgroundColor: c.accent }]} onPress={() => setCreateOpen(true)}>
              <HugeiconsIcon icon={Add01Icon} size={18} color={c.accentForeground} strokeWidth={2} />
            </Pressable>
          </Animated.View>

          <View style={styles.metricsRow}>
            <MetricChip
              c={c}
              icon={Folder02Icon}
              title={projectLabel}
              subtitle={formatTemplate(t.projectsPage.activeCount, { n: activeCount })}
              value={String(allProjects.length)}
              color={c.accent}
            />
            <MetricChip
              c={c}
              icon={CheckmarkCircle02Icon}
              title={taskLabel}
              subtitle={formatTemplate(t.projectsPage.completedOf, { done: totalDone, total: totalTasks })}
              value={String(totalDone)}
              color={c.success}
            />
            <MetricChip
              c={c}
              icon={Task01Icon}
              title={t.dashboard.done}
              subtitle={t.projectsPage.overall}
              value={`${completionPct}%`}
              color={c.warning}
            />
          </View>

          <View style={styles.sectionHead}>
            <Text style={[styles.sectionEyebrow, { color: c.accent }]}>{t.projectsPage.workspaceEyebrow}</Text>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>{t.common.projects}</Text>
          </View>

          <View style={styles.grid}>
            {allProjects.map((p, i) => (
              <Fade key={p.id} delay={i * 60} initialY={8}>
                <ProjectCard
                  project={p}
                  idx={i}
                  counts={taskCounts[p.id] ?? { total: 0, done: 0 }}
                  onPress={() => router.push(`/project/${p.id}` as any)}
                />
              </Fade>
            ))}

            <Fade delay={allProjects.length * 60} initialY={8}>
              <Pressable
                onPress={() => setCreateOpen(true)}
                style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}
              >
                <View
                  style={[
                    styles.addCard,
                    c.scheme === 'light'
                      ? { ...getLightRaisedCardStyle(c), borderStyle: 'dashed', borderWidth: 1.5 }
                      : { borderColor: c.border, backgroundColor: c.surface, borderWidth: 1.5, borderStyle: 'dashed' },
                  ]}
                >
                  <View style={[styles.addCardIcon, { backgroundColor: c.surfaceSecondary }]}>
                    <HugeiconsIcon icon={Add01Icon} size={22} color={c.accent} strokeWidth={2} />
                  </View>
                  <Text style={[styles.addCardTitle, { color: c.foreground }]}>{t.common.create}</Text>
                  <Text style={[styles.addCardSub, { color: c.muted }]}>{t.nav.project}</Text>
                </View>
              </Pressable>
            </Fade>
          </View>
        </Animated.ScrollView>
      </BlurTargetView>

      <Modal visible={createOpen} animationType="fade" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          {(() => {
            const modalBorder = getModalBorderStops(c.scheme);
            const modalBody = (
            <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>{t.common.create}</Text>
              <Text style={[styles.modalHint, { color: c.muted }]}>{t.nav.project}</Text>

              <Text style={[styles.modalLabel, { color: c.foreground }]}>{t.projectsPage.createNameLabel}</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder={t.projectsPage.createNamePlaceholder}
                placeholderTextColor={c.muted}
                style={[styles.modalInput, { color: c.foreground, backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
                autoFocus
              />

              <Text style={[styles.modalLabel, { color: c.foreground, marginTop: 12 }]}>{t.projectsPage.createDescLabel}</Text>
              <TextInput
                value={newDesc}
                onChangeText={setNewDesc}
                placeholder={t.projectsPage.createDescPlaceholder}
                placeholderTextColor={c.muted}
                style={[styles.modalInput, styles.modalTextarea, { color: c.foreground, backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
                multiline
              />

              {!!createError && (
                <Text style={{ fontSize: SigmaTypo.captionSmall, color: c.danger, marginTop: 8 }}>{createError}</Text>
              )}

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtnGhost, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
                  onPress={() => { setCreateOpen(false); setCreateError(null); }}
                >
                  <Text style={[styles.modalBtnText, { color: c.foreground }]}>{t.common.cancel}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtnPrimary, { backgroundColor: c.accent, opacity: (!newName.trim() || creating) ? 0.5 : 1 }]}
                  onPress={() => void handleCreate()}
                  disabled={!newName.trim() || creating}
                >
                  <Text style={[styles.modalBtnText, { color: c.accentForeground }]}>{creating ? t.common.loading : t.common.create}</Text>
                </Pressable>
              </View>
            </View>
            );
            if (modalBorder) {
              return (
                <LinearGradient
                  colors={modalBorder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.modalBorder}
                >
                  {modalBody}
                </LinearGradient>
              );
            }
            return <View style={[styles.modalBorderLight, getLightRaisedCardStyle(c)]}>{modalBody}</View>;
          })()}
        </View>
      </Modal>
    </View>
  );
}

function MetricChip({
  c,
  icon,
  title,
  subtitle,
  value,
  color,
}: {
  c: SemanticTheme;
  icon: typeof Folder02Icon;
  title: string;
  subtitle?: string;
  value: string;
  color: string;
}) {
  return (
    <AccentCardSurface
      c={c}
      color={color}
      style={styles.metricBorder}
      innerStyle={styles.metricChip}
      contentStyle={styles.metricContent}
    >
      <View style={[styles.metricIconCap, { backgroundColor: color + (c.scheme === 'dark' ? '20' : '14') }]}>
        <HugeiconsIcon icon={icon} size={24} color={color} strokeWidth={1.6} />
      </View>
      <View style={styles.metricBody}>
        <View style={styles.metricTextCol}>
          <Text style={[styles.metricLabel, { color: c.foreground }]} numberOfLines={1}>{title}</Text>
          {!!subtitle && (
            <Text style={[styles.metricHint, { color: c.muted }]} numberOfLines={1}>{subtitle}</Text>
          )}
        </View>
        <Text style={[styles.metricValueCol, { color: c.foreground }]}>{value}</Text>
      </View>
    </AccentCardSurface>
  );
}

function ProjectCardSurface({
  c,
  color,
  children,
}: {
  c: SemanticTheme;
  color: string;
  children: ReactNode;
}) {
  if (c.scheme === 'light') {
    return (
      <View style={[styles.projectLight, getLightRaisedCardStyle(c)]}>
        <LinearGradient
          colors={getAccentSheenStops(c.scheme, color)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.projectContent}>{children}</View>
      </View>
    );
  }

  return (
    <AccentCardSurface c={c} color={color} style={styles.projectBorder} innerStyle={styles.projectInner}>
      <View style={styles.projectContent}>{children}</View>
    </AccentCardSurface>
  );
}

function ProjectCard({
  project,
  idx,
  counts,
  onPress,
}: {
  project: ProjectPayload;
  idx: number;
  counts: { total: number; done: number };
  onPress: () => void;
}) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const pct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
  const color = projectColor(project, idx);
  const badge = statusMeta(project.status, c, t.projectsPage);

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(pct / 100, { duration: 900 });
  }, [pct, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as `${number}%` }));

  const initials = project.icon ?? project.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const memberCount = project.members?.length ?? 0;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      <ProjectCardSurface c={c} color={color}>
        <View style={styles.cardTop}>
          <View style={styles.cardTopMain}>
            <View style={[styles.projectAvatar, { backgroundColor: color }]}>
              <Text style={styles.projectInitials}>{initials}</Text>
            </View>
            <Text style={[styles.projectName, { color: c.foreground }]} numberOfLines={2}>
              {project.name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusBadgeText, { color: badge.fg }]}>{badge.label}</Text>
          </View>
        </View>

        {!!project.description && (
          <Text numberOfLines={2} style={[styles.projectDesc, { color: c.muted }]}>
            {project.description}
          </Text>
        )}

        <View style={styles.progressBlock}>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: c.muted }]}>
              {counts.done} / {counts.total} {t.common.tasks.toLowerCase()}
            </Text>
            <Text style={[styles.progressPct, { color }]}>{pct}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
            <Animated.View style={[styles.progressFill, barStyle]}>
              <LinearGradient
                colors={[color, color + 'BB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: c.separator }]}>
          <View style={styles.footerLeft}>
            <View style={styles.membersRow}>
              <HugeiconsIcon icon={UserMultipleIcon} size={13} color={c.muted} strokeWidth={1.8} />
              <View style={styles.avatarStack}>
                {(project.members ?? []).slice(0, 4).map((m, i) => {
                  const avatarColor = FALLBACK_COLORS[(i + idx) % FALLBACK_COLORS.length];
                  return (
                    <View
                      key={m.id}
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: avatarColor, marginLeft: i > 0 ? -7 : 0, borderColor: c.surface },
                      ]}
                    >
                      <Text style={styles.memberInitial}>{m.name?.[0] ?? t.projectDetail.unknownMember}</Text>
                    </View>
                  );
                })}
              </View>
              {memberCount > 0 && (
                <Text style={[styles.memberCount, { color: c.muted }]}>
                  {memberCount > 4 ? `+${memberCount - 4}` : memberCount}
                </Text>
              )}
            </View>
            {!!project.dueDate && (
              <Text style={[styles.dueDateText, { color: c.muted }]}>
                {new Date(project.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Text>
            )}
          </View>
          <View style={[styles.openPill, { backgroundColor: color + '14' }]}>
            <Text style={[styles.openPillText, { color }]}>{t.common.open}</Text>
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={color} strokeWidth={2} />
          </View>
        </View>
      </ProjectCardSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  headerBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  headerTitleSmall: { flex: 1, fontSize: SigmaTypo.headline, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAddBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  largeTitleWrap: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  largeTitle: { fontSize: SigmaTypo.largeTitle, fontWeight: '800', letterSpacing: -0.6 },
  largeSubtitle: { marginTop: 6, fontSize: SigmaTypo.bodySmall, fontWeight: '500', lineHeight: 20 },
  addBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginTop: 2 },

  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 22,
  },
  metricBorder: {
    borderRadius: 999,
    padding: 1,
    alignSelf: 'flex-start',
    flexGrow: 0,
    flexShrink: 0,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    height: 62,
    paddingRight: 16,
    paddingLeft: 6,
    gap: 8,
    overflow: 'hidden',
    flexGrow: 0,
  },
  metricContent: {
    flexGrow: 0,
    flexShrink: 0,
  },
  metricIconCap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  metricBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
    paddingRight: 2,
  },
  metricValueCol: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.6,
    flexShrink: 0,
  },
  metricTextCol: {
    justifyContent: 'center',
    gap: 2,
    flexShrink: 1,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  metricHint: {
    fontSize: 11,
    fontWeight: '500',
  },

  sectionHead: {
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: SigmaTypo.title3,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  grid: { gap: 14 },

  projectBorder: {
    borderRadius: SigmaRadius.xl,
    padding: 1,
  },
  projectLight: {
    borderRadius: SigmaRadius.xl,
    overflow: 'hidden',
  },
  projectInner: {
    borderRadius: SigmaRadius.xl - 1,
    overflow: 'hidden',
  },
  projectContent: {
    padding: 18,
    gap: 14,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  cardTopMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  projectAvatar: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  projectInitials: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  projectName: { flex: 1, fontSize: SigmaTypo.headline, fontWeight: '800', letterSpacing: -0.3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, flexShrink: 0 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  projectDesc: { fontSize: SigmaTypo.bodySmall, fontWeight: '500', lineHeight: 20 },

  progressBlock: { gap: 8 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: SigmaTypo.captionSmall, fontWeight: '600' },
  progressPct: { fontSize: SigmaTypo.captionSmall, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, overflow: 'hidden' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  footerLeft: { flex: 1, gap: 6, minWidth: 0 },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  memberInitial: { color: '#fff', fontSize: 9, fontWeight: '800' },
  memberCount: { fontSize: 10, fontWeight: '600' },
  dueDateText: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  openPillText: { fontSize: SigmaTypo.captionSmall, fontWeight: '700' },

  addCard: {
    minHeight: 132,
    borderRadius: SigmaRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 20,
  },
  addCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addCardTitle: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  addCardSub: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.48)',
    padding: 24,
  },
  modalBorder: {
    width: '100%',
    maxWidth: 400,
    borderRadius: SigmaRadius.xl,
    padding: 1,
  },
  modalBorderLight: {
    width: '100%',
    maxWidth: 400,
    borderRadius: SigmaRadius.xl,
    overflow: 'hidden',
  },
  modalCard: {
    borderRadius: SigmaRadius.xl - 1,
    padding: 22,
  },
  modalTitle: { fontSize: SigmaTypo.title3, fontWeight: '800', letterSpacing: -0.3 },
  modalHint: { marginTop: 4, marginBottom: 18, fontSize: SigmaTypo.caption, fontWeight: '500' },
  modalLabel: { fontSize: SigmaTypo.captionSmall, fontWeight: '700', marginBottom: 6 },
  modalInput: {
    fontSize: SigmaTypo.bodySmall,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontWeight: '500',
  },
  modalTextarea: { minHeight: 88, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 22, justifyContent: 'flex-end' },
  modalBtnGhost: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalBtnPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
  },
  modalBtnText: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
});
