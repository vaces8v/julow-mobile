import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useWorkspace } from '@/contexts/workspace-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, type ProjectPayload } from '@/lib/api';
import {
  Add01Icon,
  ArrowUpRight01Icon,
  UserMultipleIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
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
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useColorScheme } from 'react-native';

const FALLBACK_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e',
  '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#ef4444',
];

function projectColor(project: ProjectPayload, idx: number) {
  return project.color || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  active: { label: 'Active', bg: '#22c55e1A', fg: '#16a34a' },
  paused: { label: 'Paused', bg: '#f59e0b1A', fg: '#d97706' },
  archived: { label: 'Archived', bg: '#6b72801A', fg: '#6b7280' },
  completed: { label: 'Completed', bg: '#3b82f61A', fg: '#2563eb' },
};

const isDoneStatus = (s: string) => {
  const l = s?.toLowerCase() ?? '';
  return l === 'done' || l === 'completed' || l === 'closed';
};

export default function ProjectsScreen() {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  // Local blur target: BlurView in the header samples THIS screen's
  // ScrollView (a sibling), not the global tab BlurTargetView ancestor —
  // which would crash Android's dimezisBlurViewSdk31Plus sampler.
  const blurTargetRef = useRef<View>(null);
  const { activeWorkspaceId, projects: wsProjects, refreshProjects } = useWorkspace();

  const [allProjects, setAllProjects] = useState<ProjectPayload[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; done: number }>>({});
  const [refreshing, setRefreshing] = useState(false);

  // ── Create project modal ──
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Fetch all projects across workspaces
      const myProjects = await api.getMyProjects();
      setAllProjects(myProjects);

      // Fetch tasks and compute counts per project
      const allTasks = await api.getTasks();
      const counts: Record<string, { total: number; done: number }> = {};
      for (const p of myProjects) {
        counts[p.id] = { total: 0, done: 0 };
      }
      for (const task of allTasks) {
        const entry = counts[task.projectId];
        if (!entry) continue;
        entry.total++;
        if (isDoneStatus(task.status)) entry.done++;
      }
      setTaskCounts(counts);
    } catch (e) {
      console.error('Failed to load projects:', e);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCreate = async () => {
    if (!activeWorkspaceId || !newName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await api.createProject({
        workspaceId: activeWorkspaceId,
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      setNewName('');
      setNewDesc('');
      setCreateOpen(false);
      await refreshProjects();
      await loadData();
    } catch (e) {
      console.error('Failed to create project:', e);
      setCreateError(e instanceof Error ? e.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const totalTasks = useMemo(() => Object.values(taskCounts).reduce((s, c) => s + c.total, 0), [taskCounts]);
  const totalDone = useMemo(() => Object.values(taskCounts).reduce((s, c) => s + c.done, 0), [taskCounts]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({ onScroll: e => { scrollY.value = e.contentOffset.y; } });
  const HEADER_H = insets.top + 54;

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 50], [0, 1], 'clamp'),
  }));
  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [1, 0], 'clamp'),
    transform: [
      { scale: interpolate(scrollY.value, [-50, 0, 40], [1.04, 1, 0.94], 'clamp') },
      { translateY: interpolate(scrollY.value, [0, 40], [0, -10], 'clamp') },
    ],
  }));
  const smallTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], 'clamp'),
    transform: [{ translateY: interpolate(scrollY.value, [30, 60], [10, 0], 'clamp') }],
  }));
  const headerAddStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], 'clamp'),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Fixed blur header */}
      <View style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <BlurView
            {...(blurTargetRef ? { blurTarget: blurTargetRef } : {})}
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
            intensity={scheme === 'dark' ? 60 : 70}
            tint={scheme === 'dark' ? 'dark' : 'prominent'}
            blurReductionFactor={Platform.OS === 'android' ? 0.5 : 1}
            style={StyleSheet.absoluteFill}
          />
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
              <HugeiconsIcon icon={Add01Icon} size={18} color="#fff" strokeWidth={2.2} />
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 20,
        }}
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
        {/* Large title */}
        <Animated.View style={[styles.largeTitleWrap, largeTitleStyle]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.largeTitle, { color: c.foreground }]}>{t.common.projects}</Text>
            <Text style={[styles.largeSubtitle, { color: c.muted }]}>
              {allProjects.length} {t.common.projects.toLowerCase()} · {totalDone}/{totalTasks} {t.common.tasks.toLowerCase()}
            </Text>
          </View>
          <Pressable style={[styles.addBtn, { backgroundColor: c.accent }]} onPress={() => setCreateOpen(true)}>
            <HugeiconsIcon icon={Add01Icon} size={18} color="#fff" strokeWidth={2} />
          </Pressable>
        </Animated.View>

        {/* Project cards */}
        <View style={styles.grid}>
          {allProjects.map((p, i) => (
            <Fade key={p.id} delay={i * 70} initialY={10} style={styles.gridCell}>
              <ProjectCard
                project={p}
                idx={i}
                counts={taskCounts[p.id] ?? { total: 0, done: 0 }}
                onPress={() => router.push(`/project/${p.id}` as any)}
              />
            </Fade>
          ))}

          {/* Add placeholder */}
          <Fade delay={allProjects.length * 70} initialY={10} style={styles.gridCell}>
            <Pressable style={[styles.addCard, { borderColor: c.border }]} onPress={() => setCreateOpen(true)}>
              <View style={[styles.addCardIcon, { backgroundColor: c.surfaceSecondary }]}>
                <HugeiconsIcon icon={Add01Icon} size={20} color={c.muted} strokeWidth={2} />
              </View>
              <Text style={[styles.addCardText, { color: c.muted }]}>{t.common.create}</Text>
            </Pressable>
          </Fade>
        </View>
      </Animated.ScrollView>
      </BlurTargetView>

      {/* ── Create Project Modal ── */}
      <Modal visible={createOpen} animationType="fade" transparent onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>{t.common.create}</Text>

            <Text style={[styles.modalLabel, { color: c.foreground }]}>Name</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Project name"
              placeholderTextColor={c.muted}
              style={[styles.modalInput, { color: c.foreground, backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
              autoFocus
            />

            <Text style={[styles.modalLabel, { color: c.foreground, marginTop: 12 }]}>Description</Text>
            <TextInput
              value={newDesc}
              onChangeText={setNewDesc}
              placeholder="Optional description"
              placeholderTextColor={c.muted}
              style={[styles.modalInput, styles.modalTextarea, { color: c.foreground, backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
              multiline
            />

            {!!createError && (
              <Text style={{ fontSize: SigmaTypo.captionSmall, color: c.danger, marginTop: 8 }}>{createError}</Text>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: c.surfaceSecondary, borderColor: c.border, borderWidth: 1 }]}
                onPress={() => { setCreateOpen(false); setCreateError(null); }}
              >
                <Text style={[styles.modalBtnText, { color: c.foreground }]}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: c.accent, opacity: (!newName.trim() || creating) ? 0.5 : 1 }]}
                onPress={() => void handleCreate()}
                disabled={!newName.trim() || creating}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{creating ? '…' : t.common.create}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Project card sub-component ──────────────────────────────────────

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

  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 14, stiffness: 280 }) }],
  }));

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(pct / 100, { duration: 900 });
  }, [pct, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));

  const initials = project.icon ?? project.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const badge = STATUS_BADGE[project.status ?? 'active'] ?? STATUS_BADGE.active;

  return (
    <Pressable
      onPressIn={() => { scale.value = 0.97; }}
      onPressOut={() => { scale.value = 1; }}
      onPress={onPress}
    >
      <Animated.View style={[styles.projectCard, { backgroundColor: c.surface, borderColor: c.border }, anim]}>
        <LinearGradient colors={[color + '1A', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

        {/* Header */}
        <View style={styles.cardTop}>
          <View style={[styles.projectAvatar, { backgroundColor: color }]}>
            <Text style={styles.projectInitials}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.projectName, { color: c.foreground }]} numberOfLines={1}>{project.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              {project.methodology && (
                <Text style={[styles.projectMethodology, { color: c.muted }]}>{project.methodology}</Text>
              )}
              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.statusBadgeText, { color: badge.fg }]}>{badge.label}</Text>
              </View>
            </View>
          </View>
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={14} color={c.muted} strokeWidth={2} />
        </View>

        {/* Description */}
        {!!project.description && (
          <Text numberOfLines={2} style={[styles.projectDesc, { color: c.muted }]}>{project.description}</Text>
        )}

        {/* Progress */}
        <View>
          <View style={styles.progressLabelRow}>
            <Text style={[styles.progressLabel, { color: c.muted }]}>{counts.done} / {counts.total} {t.common.tasks.toLowerCase()}</Text>
            <Text style={[styles.progressPct, { color }]}>{pct}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
            <Animated.View style={[styles.progressFill, barStyle]}>
              <LinearGradient colors={[color, color + 'CC']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
          <View style={styles.membersRow}>
            <HugeiconsIcon icon={UserMultipleIcon} size={12} color={c.muted} strokeWidth={2} />
            <View style={styles.avatarStack}>
              {(project.members ?? []).slice(0, 4).map((m, i) => {
                const avatarColor = FALLBACK_COLORS[(i + idx) % FALLBACK_COLORS.length];
                return (
                  <View
                    key={m.id}
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: avatarColor, marginLeft: i > 0 ? -6 : 0, borderColor: c.surface },
                    ]}
                  >
                    <Text style={styles.memberInitial}>{m.name?.[0] ?? '?'}</Text>
                  </View>
                );
              })}
            </View>
            {(project.members?.length ?? 0) > 4 && (
              <Text style={{ fontSize: 10, color: c.muted, fontWeight: '600' }}>
                +{(project.members?.length ?? 0) - 4}
              </Text>
            )}
          </View>
          {project.dueDate && (
            <Text style={[styles.dueDateText, { color: c.muted }]}>
              {new Date(project.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          )}
          <Text style={[styles.openBoard, { color }]}>{t.common.open} →</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  headerBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  headerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  headerTitleSmall: { flex: 1, fontSize: SigmaTypo.headline, fontWeight: '700' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAddBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  largeTitleWrap: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  largeTitle: { fontSize: SigmaTypo.largeTitle, fontWeight: '800', letterSpacing: -0.5 },
  largeSubtitle: { marginTop: 4, fontSize: SigmaTypo.bodySmall, fontWeight: '500' },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 4 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCell: { width: '100%' },

  projectCard: {
    borderRadius: SigmaRadius.lg, borderWidth: 1, padding: 16, gap: 12, overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  projectAvatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  projectInitials: { color: '#fff', fontSize: SigmaTypo.bodySmall, fontWeight: '800' },
  projectName: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  projectMethodology: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
  projectDesc: { fontSize: SigmaTypo.caption, fontWeight: '500', lineHeight: 17 },

  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  progressLabel: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },
  progressPct: { fontSize: SigmaTypo.captionSmall, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, overflow: 'hidden' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  memberAvatar: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  memberInitial: { color: '#fff', fontSize: 8, fontWeight: '800' },
  dueDateText: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },
  openBoard: { fontSize: SigmaTypo.caption, fontWeight: '600' },

  addCard: {
    height: 120, borderRadius: SigmaRadius.lg, borderWidth: 1.5, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addCardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addCardText: { fontSize: SigmaTypo.bodySmall, fontWeight: '500' },

  // ── Modal styles ──
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)', padding: 24,
  },
  modalCard: {
    width: '100%', maxWidth: 400, borderRadius: SigmaRadius.lg,
    borderWidth: 1, padding: 24, gap: 4,
  },
  modalTitle: { fontSize: SigmaTypo.headline, fontWeight: '700', marginBottom: 16 },
  modalLabel: { fontSize: SigmaTypo.caption, fontWeight: '600', marginBottom: 6 },
  modalInput: {
    fontSize: SigmaTypo.bodySmall, borderRadius: SigmaRadius.md,
    borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10,
  },
  modalTextarea: { minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: SigmaRadius.md },
  modalBtnText: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
});
