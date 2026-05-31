import { Fade } from '@/components/ui/fade';
import { AppBottomSheetContent, BottomSheet } from '@/components/app-bottom-sheet';
import { TaskCreateSheet } from '@/components/task/task-create-sheet';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { formatAppDate } from '@/i18n/format';
import type { Translations } from '@/i18n/translations';
import { api, type ProjectPayload, type TaskDetailPayload, type TaskPayload, type WorkflowStatusPayload } from '@/lib/api';
import { cachedApi } from '@/lib/cache/cached-api';
import { useCacheSync } from '@/lib/cache/use-cache-sync';
import {
  Add01Icon,
  ArrowLeft01Icon,
  Calendar01Icon,
  ChartGanttIcon,
  Download04Icon,
  File01Icon,
  GridViewIcon,
  Menu01Icon,
  SentIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { Skeleton } from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


type ViewMode = 'board' | 'list' | 'gantt';

const FALLBACK_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#f97316', '#22c55e',
  '#ec4899', '#14b8a6', '#f59e0b', '#6366f1', '#ef4444',
];

const CATEGORY_META: Record<string, { color: string; dot: string }> = {
  todo: { color: '#94a3b8', dot: '#94a3b8' },
  in_progress: { color: '#3b82f6', dot: '#3b82f6' },
  review: { color: '#f97316', dot: '#f97316' },
  done: { color: '#22c55e', dot: '#22c55e' },
  cancelled: { color: '#6b7280', dot: '#6b7280' },
  blocked: { color: '#ef4444', dot: '#ef4444' },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#94a3b8',
};

function normalizeCategoryKey(category?: string) {
  if (!category) return '';
  const raw = category.toLowerCase().trim();
  const underscored = raw.replace(/[\s-]+/g, '_');
  const aliases: Record<string, string> = {
    todo: 'todo',
    to_do: 'todo',
    backlog: 'todo',
    in_progress: 'in_progress',
    inprogress: 'in_progress',
    active: 'in_progress',
    review: 'review',
    in_review: 'review',
    done: 'done',
    completed: 'done',
    closed: 'done',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    blocked: 'blocked',
  };
  return aliases[raw] ?? aliases[underscored] ?? underscored;
}

function translateStatusToken(token: string | undefined, t: Translations): string | null {
  if (!token) return null;
  const key = normalizeCategoryKey(token);
  const d = t.dashboard;
  const p = t.projectDetail;
  const map: Record<string, string> = {
    todo: d.todo,
    to_do: d.todo,
    backlog: d.todo,
    open: d.todo,
    new: d.todo,
    in_progress: d.inProgress,
    inprogress: d.inProgress,
    active: d.inProgress,
    doing: d.inProgress,
    working: d.inProgress,
    review: d.review,
    in_review: d.review,
    qa: d.review,
    testing: d.review,
    done: d.done,
    completed: d.done,
    closed: d.done,
    resolved: d.done,
    cancelled: p.cancelled,
    canceled: p.cancelled,
    blocked: p.blocked,
  };
  return map[key] ?? null;
}

function translateStatusByCategory(category: string | undefined, t: Translations): string | null {
  return translateStatusToken(category, t);
}

function resolveStatusLabel(
  ws: WorkflowStatusPayload | undefined,
  taskStatus: string | undefined,
  t: Translations,
) {
  for (const token of [ws?.category, ws?.name, taskStatus]) {
    const translated = translateStatusToken(token, t);
    if (translated) return translated;
  }
  return ws?.name ?? taskStatus ?? t.dashboard.todo;
}

function priorityMeta(priority: string | undefined, t: Translations) {
  const key = priority?.toLowerCase() ?? 'medium';
  const p = t.projectDetail;
  const label =
    key === 'critical' ? p.priorityCritical
      : key === 'high' ? p.priorityHigh
        : key === 'low' ? p.priorityLow
          : p.priorityMedium;
  return { label, color: PRIORITY_COLORS[key] ?? PRIORITY_COLORS.medium };
}

function categoryOf(cat?: string) {
  const k = cat?.toLowerCase() ?? 'todo';
  return CATEGORY_META[k] ?? CATEGORY_META.todo;
}

export default function ProjectDetailScreen() {
  const { id, task: taskParam } = useLocalSearchParams<{ id: string; task?: string }>();
  const c = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [project, setProject] = useState<ProjectPayload | null>(() => {
    if (!id) return null;
    return cachedApi.getMyProjectsSync().find((p) => p.id === id) ?? null;
  });
  const [tasks, setTasks] = useState<TaskPayload[]>(() =>
    id ? cachedApi.getProjectTasksSync(id) : [],
  );
  const [statuses, setStatuses] = useState<WorkflowStatusPayload[]>([]);
  const [loading, setLoading] = useState(() => {
    if (!id) return true;
    return cachedApi.getProjectTasksSync(id).length === 0;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const loadData = useCallback(async (force = false) => {
    if (!id) return;
    try {
      const allProjects = await cachedApi.getMyProjects({ force });
      const found = allProjects.find((p) => p.id === id);
      if (found) {
        setProject(found);
        const wsId = found.workspaceId;
        const [boardData, projectTasks] = await Promise.all([
          api.getBoardData(wsId, id).catch(() => ({ columns: [], workflowStatuses: [] })),
          cachedApi.getProjectTasks(wsId, id, { force }),
        ]);
        setStatuses(boardData.workflowStatuses);
        setTasks(projectTasks);
      }
    } catch (e) {
      console.error('Failed to load project:', e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const syncFromCache = useCallback(() => {
    if (!id) return;
    const found = cachedApi.getMyProjectsSync().find((p) => p.id === id);
    if (found) setProject(found);
    setTasks(cachedApi.getProjectTasksSync(id));
  }, [id]);

  useCacheSync(syncFromCache);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    void (async () => {
      try {
        syncFromCache();
        const allProjects = await cachedApi.getMyProjects();
        const found = allProjects.find((projectItem) => projectItem.id === id);
        if (!found || cancelled) {
          return;
        }

        const wsId = found.workspaceId;
        const [boardData, projectTasks] = await Promise.all([
          api.getBoardData(wsId, id).catch(() => ({ columns: [], workflowStatuses: [] })),
          cachedApi.getProjectTasks(wsId, id),
        ]);
        if (cancelled) return;

        setProject(found);
        setStatuses(boardData.workflowStatuses);
        setTasks(projectTasks);
      } catch (e) {
        console.error('Failed to load project:', e);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const openCreateSheet = useCallback((columnId?: string) => {
    setCreateColumnId(columnId ?? null);
    setCreateSheetOpen(true);
  }, []);

  const handleStatusChange = useCallback(async (taskId: string, newStatusId: string) => {
    try {
      await cachedApi.updateTaskStatus(taskId, newStatusId);
      syncFromCache();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  }, [syncFromCache]);

  // Build status map from workflow statuses
  const statusMap = useMemo(() => {
    const m = new Map<string, WorkflowStatusPayload>();
    for (const s of statuses) m.set(s.id, s);
    return m;
  }, [statuses]);

  // Build columns from workflow statuses (ordered) — if no statuses, fallback
  const columns = useMemo(() => {
    const lc = search.toLowerCase();
    const filterTask = (task: TaskPayload) => !lc || task.title.toLowerCase().includes(lc);

    if (statuses.length > 0) {
      const sorted = [...statuses].sort((a, b) => a.order - b.order);
      return sorted.map(ws => {
        const meta = categoryOf(ws.category);
        return {
          id: ws.id,
          label: resolveStatusLabel(ws, ws.category, t),
          category: ws.category,
          color: meta.color,
          dot: meta.dot,
          tasks: tasks.filter(tk => tk.statusId === ws.id && filterTask(tk)),
        };
      });
    }

    // Fallback: group by task.status string
    const fallbackStatuses = ['todo', 'in_progress', 'review', 'done'] as const;
    return fallbackStatuses.map(s => {
      const meta = CATEGORY_META[s];
      return {
        id: s,
        label: translateStatusByCategory(s, t) ?? s,
        category: s,
        color: meta.color,
        dot: meta.dot,
        tasks: tasks.filter(tk => tk.status === s && filterTask(tk)),
      };
    });
  }, [tasks, statuses, search, t]);

  const totalDone = useMemo(() => {
    if (statuses.length > 0) {
      const doneIds = new Set(statuses.filter(s => s.category.toLowerCase() === 'done').map(s => s.id));
      return tasks.filter(t => t.statusId && doneIds.has(t.statusId)).length;
    }
    return tasks.filter(t => t.status === 'done' || t.status === 'completed').length;
  }, [tasks, statuses]);

  const pct = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(pct / 100, { duration: 900 });
  }, [pct, progress]);
  const progressStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));

  const projColor = project?.color || '#3b82f6';
  const projInitials = project?.icon ?? project?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? t.projectDetail.unknownInitial;
  const selectedTask = tasks.find(t => t.id === selectedId);

  // Open task from search / notification deep link
  useEffect(() => {
    if (!taskParam || tasks.length === 0) return;
    const match = tasks.find((taskItem) => taskItem.id === taskParam);
    if (match) setSelectedId(match.id);
  }, [taskParam, tasks]);

  // Open detail sheet when task is selected
  useEffect(() => {
    if (!selectedId) return;
    const timeoutId = setTimeout(() => {
      setDetailSheetOpen(true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [selectedId]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: insets.top + 8 }}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <Skeleton style={{ width: 36, height: 36, borderRadius: 18 }} />
          <Skeleton style={{ width: 38, height: 38, borderRadius: 10 }} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton style={{ width: '60%', height: 14, borderRadius: 6 }} />
            <Skeleton style={{ width: '40%', height: 10, borderRadius: 4 }} />
          </View>
        </View>
        <View style={[styles.toolbar, { borderBottomColor: c.border }]}>
          <Skeleton style={{ flex: 1, height: 36, borderRadius: SigmaRadius.sm }} />
          <Skeleton style={{ width: 90, height: 32, borderRadius: SigmaRadius.sm }} />
          <Skeleton style={{ width: 34, height: 34, borderRadius: SigmaRadius.sm }} />
        </View>
        <ScrollView horizontal contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
          {[1, 2, 3].map(i => (
            <View key={i} style={{ width: 260, gap: 10 }}>
              <Skeleton style={{ width: '100%', height: 32, borderRadius: 8 }} />
              <Skeleton style={{ width: '100%', height: 90, borderRadius: SigmaRadius.sm }} />
              <Skeleton style={{ width: '100%', height: 90, borderRadius: SigmaRadius.sm }} />
              <Skeleton style={{ width: '100%', height: 70, borderRadius: SigmaRadius.sm }} />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={20} color={c.foreground} strokeWidth={1.8} />
        </Pressable>
        <View style={[styles.projectBadge, { backgroundColor: projColor }]}>
          <Text style={styles.projectKey}>{projInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.projectName, { color: c.foreground }]} numberOfLines={1}>{project?.name ?? t.projectDetail.fallbackTitle}</Text>
          <View style={styles.progressRow}>
            <Text style={[styles.progressMeta, { color: c.muted }]}>{tasks.length} {t.common.tasks.toLowerCase()} · {pct}%</Text>
            <View style={[styles.progressTrack, { backgroundColor: c.border, width: 80 }]}>
              <Animated.View style={[styles.progressFill, { backgroundColor: projColor }, progressStyle]} />
            </View>
          </View>
        </View>

        {/* Member avatars */}
        <View style={styles.membersStack}>
          {(project?.members ?? []).slice(0, 3).map((m, i) => {
            const col = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
            return (
              <View key={m.id} style={[styles.memberAv, { backgroundColor: col, marginLeft: i > 0 ? -7 : 0, borderColor: c.background }]}>
                <Text style={styles.memberInitial}>{m.name?.[0]?.toUpperCase() ?? t.projectDetail.unknownMember}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Toolbar */}
      <View style={[styles.toolbar, { borderBottomColor: c.border, backgroundColor: c.background }]}>
        <View style={[styles.searchWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={t.common.search}
            placeholderTextColor={c.muted}
            style={[styles.searchInput, { color: c.foreground }]}
          />
        </View>

        <View style={[styles.viewToggle, { backgroundColor: c.surface, borderColor: c.border }]}>
          <ViewBtn active={viewMode === 'board'} icon={GridViewIcon} onPress={() => setViewMode('board')} />
          <ViewBtn active={viewMode === 'list'} icon={Menu01Icon} onPress={() => setViewMode('list')} />
          <ViewBtn active={viewMode === 'gantt'} icon={ChartGanttIcon} onPress={() => setViewMode('gantt')} />
        </View>

        <Pressable
          style={[styles.addTaskBtn, { backgroundColor: c.accent }]}
          onPress={() => openCreateSheet()}
        >
          <HugeiconsIcon icon={Add01Icon} size={16} color="#fff" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Content */}
      {viewMode === 'board' ? (
        <ScrollView
          horizontal
          scrollEnabled={!detailSheetOpen}
          showsHorizontalScrollIndicator
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 100, gap: 12, alignItems: 'flex-start' }}
          nestedScrollEnabled
        >
          {columns.map((col, ci) => (
            <Fade key={col.id} delay={ci * 60} initialY={6}>
              <BoardColumn
                col={col}
                selectedId={selectedId}
                onSelectTask={tid => setSelectedId(tid === selectedId ? null : tid)}
                projectColor={projColor}
                statusMap={statusMap}
                onAddTask={() => openCreateSheet(col.id)}
                scrollEnabled={!detailSheetOpen}
              />
            </Fade>
          ))}
        </ScrollView>
      ) : viewMode === 'list' ? (
        <ScrollView
          scrollEnabled={!detailSheetOpen}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.foreground} colors={[c.accent]} />
          }
        >
          <View style={[styles.listHeader, { borderBottomColor: c.border }]}>
            {[
              { key: 'task', label: t.projectDetail.listTask, flex: 3, align: 'left' as const },
              { key: 'status', label: t.projectDetail.listStatus, flex: 1, align: 'right' as const },
              { key: 'priority', label: t.projectDetail.listPriority, flex: 1, align: 'right' as const },
              { key: 'due', label: t.projectDetail.listDue, flex: 1, align: 'right' as const },
            ].map((h) => (
              <Text
                key={h.key}
                style={[styles.listHead, { color: c.muted, flex: h.flex, textAlign: h.align }]}
              >
                {h.label}
              </Text>
            ))}
          </View>
          {columns.flatMap(col => col.tasks).map((task, i) => (
            <Fade key={task.id} delay={i * 30} initialY={4}>
              <TaskListRow
                task={task}
                statusMap={statusMap}
                selected={selectedId === task.id}
                onPress={() => setSelectedId(task.id === selectedId ? null : task.id)}
              />
            </Fade>
          ))}
          {columns.every(col => col.tasks.length === 0) && (
            <Text style={{ textAlign: 'center', color: c.muted, paddingVertical: 40, fontSize: SigmaTypo.bodySmall }}>
              {t.dashboard.noTasksYet}
            </Text>
          )}
        </ScrollView>
      ) : (
        <GanttView tasks={tasks} statusMap={statusMap} />
      )}

      {/* Task detail bottom sheet (Hero UI) */}
      {detailSheetOpen && selectedTask ? (
      <BottomSheet isOpen onOpenChange={(v) => { setDetailSheetOpen(v); if (!v) setSelectedId(null); }}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <AppBottomSheetContent
            size="dynamic"
            contentContainerClassName="p-0"
            enableHandlePanningGesture
            enableContentPanningGesture
          >
              <TaskDetail
                task={selectedTask}
                statuses={statuses}
                statusMap={statusMap}
                onStatusChange={handleStatusChange}
                onRequestClose={() => { setDetailSheetOpen(false); setSelectedId(null); }}
              />
          </AppBottomSheetContent>
        </BottomSheet.Portal>
      </BottomSheet>
      ) : null}

      {project ? (
        <TaskCreateSheet
          isOpen={createSheetOpen}
          onOpenChange={(open) => {
            setCreateSheetOpen(open);
            if (!open) setCreateColumnId(null);
          }}
          workspaceId={project.workspaceId}
          projectId={project.id}
          statuses={statuses}
          defaultStatusId={createColumnId}
          onCreated={syncFromCache}
        />
      ) : null}
    </View>
  );
}

// ─── Board Column ─────────────────────────────────────────────────────────────

function BoardColumn({ col, selectedId, onSelectTask, projectColor, statusMap, onAddTask, scrollEnabled = true }: {
  col: { id: string; label: string; category: string; color: string; dot: string; tasks: TaskPayload[] };
  selectedId: string | null;
  onSelectTask: (id: string) => void;
  projectColor: string;
  statusMap: Map<string, WorkflowStatusPayload>;
  onAddTask: () => void;
  scrollEnabled?: boolean;
}) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.column, { backgroundColor: c.surface + 'CC', borderColor: c.border }]}>
      <View style={styles.colHeader}>
        <View style={[styles.colDot, { backgroundColor: col.dot }]} />
        <Text style={[styles.colLabel, { color: c.foreground }]}>{col.label}</Text>
        <View style={[styles.colCount, { backgroundColor: col.color + '20' }]}>
          <Text style={[styles.colCountText, { color: col.color }]}>{col.tasks.length}</Text>
        </View>
        <Pressable style={styles.colAddBtn} onPress={onAddTask}>
          <HugeiconsIcon icon={Add01Icon} size={13} color={c.muted} strokeWidth={2} />
        </Pressable>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled scrollEnabled={scrollEnabled} style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        {col.tasks.length === 0 ? (
          <View style={[styles.emptyCol, { borderColor: c.border }]}>
            <Text style={[styles.emptyColText, { color: c.muted }]}>{t.projectDetail.noTasks}</Text>
          </View>
        ) : (
          col.tasks.map((task, i) => (
            <Fade key={task.id} delay={i * 40} initialY={4}>
              <TaskCard
                task={task}
                selected={selectedId === task.id}
                onPress={() => onSelectTask(task.id)}
                statusColor={col.color}
              />
            </Fade>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, selected, onPress, statusColor }: {
  task: TaskPayload; selected: boolean; onPress: () => void; statusColor: string;
}) {
  const c = useSemanticTheme();
  const { t, locale } = useI18n();
  const prio = priorityMeta(task.priority, t);
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.96]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.94]),
  }));

  return (
    <Pressable
      onPressIn={() => { pressed.value = withTiming(1, { duration: 80 }); }}
      onPressOut={() => { pressed.value = withTiming(0, { duration: 120 }); }}
      onPress={onPress}
    >
      <Animated.View style={[
        styles.taskCard,
        { backgroundColor: c.background, borderColor: selected ? statusColor + '80' : c.border },
        selected && { backgroundColor: statusColor + '08' },
        anim,
      ]}>
        {(task.labels?.length ?? 0) > 0 && (
          <View style={styles.labelRow}>
            {task.labels.slice(0, 2).map(l => (
              <View key={l} style={[styles.label, { backgroundColor: c.surface }]}>
                <Text style={[styles.labelText, { color: c.muted }]}>{l}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={[styles.taskTitle, { color: c.foreground }]}>{task.title}</Text>
        <View style={styles.taskMeta}>
          <View style={[styles.prioDot, { backgroundColor: prio.color }]} />
          <Text style={[styles.prioText, { color: prio.color }]}>{prio.label}</Text>
          {task.dueDate && (
            <>
              <Text style={{ color: c.muted, fontSize: 10 }}>·</Text>
              <HugeiconsIcon icon={Calendar01Icon} size={10} color={c.muted} strokeWidth={2} />
              <Text style={[styles.dueDate, { color: c.muted }]}>{formatAppDate(task.dueDate, locale, 'dayMonth')}</Text>
            </>
          )}
          {task.assignee && (
            <View style={[styles.assigneeAv, { backgroundColor: '#6b7280', marginLeft: 'auto' }]}>
              <Text style={styles.assigneeInitial}>{typeof task.assignee === 'string' ? task.assignee[0].toUpperCase() : t.projectDetail.unknownMember}</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── List Row ─────────────────────────────────────────────────────────────────

function TaskListRow({ task, statusMap, selected, onPress }: {
  task: TaskPayload; statusMap: Map<string, WorkflowStatusPayload>; selected: boolean; onPress: () => void;
}) {
  const c = useSemanticTheme();
  const { t, locale } = useI18n();
  const ws = task.statusId ? statusMap.get(task.statusId) : undefined;
  const sm = categoryOf(ws?.category ?? task.status);
  const statusLabel = resolveStatusLabel(ws, task.status, t);
  const pm = priorityMeta(task.priority, t);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.listRow, { borderBottomColor: c.border, backgroundColor: selected ? sm.color + '08' : 'transparent' }]}
    >
      <View style={{ flex: 3, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={[styles.prioDot, { backgroundColor: pm.color }]} />
        <Text style={[styles.listTaskTitle, { color: c.foreground }]} numberOfLines={1}>{task.title}</Text>
      </View>
      <View style={[styles.statusChip, { backgroundColor: sm.color + '20', flex: 1 }]}>
        <Text style={[styles.statusChipText, { color: sm.color }]} numberOfLines={1}>{statusLabel}</Text>
      </View>
      <Text style={[styles.listCell, { color: pm.color }]}>{pm.label}</Text>
      <Text style={[styles.listCell, { color: c.muted }]}>{task.dueDate ? formatAppDate(task.dueDate, locale, 'dayMonth') : t.projectDetail.noDue}</Text>
    </Pressable>
  );
}

// ─── Task Detail (renders inside Hero UI BottomSheet.Content) ─────────────────

function TaskDetail({ task, statuses, statusMap, onStatusChange, onRequestClose }: {
  task: TaskPayload;
  statuses: WorkflowStatusPayload[];
  statusMap: Map<string, WorkflowStatusPayload>;
  onStatusChange: (taskId: string, newStatusId: string) => Promise<void>;
  onRequestClose: () => void;
}) {
  const c = useSemanticTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const ws = task.statusId ? statusMap.get(task.statusId) : undefined;
  const sm = categoryOf(ws?.category ?? task.status);
  const statusLabel = resolveStatusLabel(ws, task.status, t);
  const pm = priorityMeta(task.priority, t);

  const [detail, setDetail] = useState<TaskDetailPayload | null>(null);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  const ctaInset = Math.max(insets.bottom, 10);

  useEffect(() => {
    api.getTask(task.id).then(setDetail).catch(() => {});
    api
      .listComments('task', task.id)
      .then(items => setCommentCount(items.length))
      .catch(() => {});
  }, [task.id]);

  const handlePickStatus = async (sId: string) => {
    if (sId === task.statusId || statusUpdating) return;
    setStatusUpdating(sId);
    try {
      await onStatusChange(task.id, sId);
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleOpenComments = () => {
    onRequestClose();
    setTimeout(() => {
      router.push({
        pathname: '/task/[id]/comments',
        params: { id: task.id, title: task.title },
      });
    }, 120);
  };

  const handleDownloadFile = (fileId: string) => {
    void api.getFileDownloadUrl(fileId)
      .then(({ url }) => Linking.openURL(url))
      .catch(() => {});
  };

  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.order - b.order),
    [statuses],
  );

  return (
    <BottomSheetScrollView
      style={styles.sheetScroll}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: ctaInset + 16 }}
    >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetEyebrow, { color: c.accent }]}>{t.projectDetail.taskEyebrow}</Text>
          <BottomSheet.Title style={{ color: c.foreground, fontSize: SigmaTypo.title3, fontWeight: '800', letterSpacing: -0.3 }}>
            {task.title}
          </BottomSheet.Title>
        </View>

        {(task.labels?.length ?? 0) > 0 && (
          <View style={[styles.labelRow, { marginBottom: 10, paddingHorizontal: 16 }]}>
            {task.labels.map(l => (
              <View key={l} style={[styles.label, { backgroundColor: c.surfaceSecondary }]}>
                <Text style={[styles.labelText, { color: c.muted }]}>{l}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.sheetMetaRow, { paddingHorizontal: 16 }]}>
          <View style={[styles.sheetMetaPill, { backgroundColor: sm.color + '16' }]}>
            <View style={[styles.colDot, { backgroundColor: sm.dot }]} />
            <Text style={[styles.sheetMetaPillText, { color: sm.color }]}>{statusLabel}</Text>
          </View>
          <View style={[styles.sheetMetaPill, { backgroundColor: pm.color + '16' }]}>
            <Text style={[styles.sheetMetaPillText, { color: pm.color }]}>{pm.label}</Text>
          </View>
          {!!task.dueDate && (
            <View style={[styles.sheetMetaPill, { backgroundColor: c.surfaceSecondary }]}>
              <HugeiconsIcon icon={Calendar01Icon} size={12} color={c.muted} strokeWidth={1.8} />
              <Text style={[styles.sheetMetaPillText, { color: c.foreground }]}>
                {formatAppDate(task.dueDate, locale, 'short')}
              </Text>
            </View>
          )}
        </View>

        {sortedStatuses.length > 0 && (
          <View style={styles.statusRailSection}>
            <Text style={[styles.sheetSectionLabel, { color: c.muted, paddingHorizontal: 16 }]}>
              {t.projectDetail.changeStatus}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.statusRailContent}
            >
              {sortedStatuses.map(s => {
                const meta = categoryOf(s.category);
                const isActive = s.id === task.statusId;
                const label = resolveStatusLabel(s, task.status, t);
                const loading = statusUpdating === s.id;
                return (
                  <Pressable
                    key={s.id}
                    disabled={!!statusUpdating}
                    onPress={() => void handlePickStatus(s.id)}
                    style={[
                      styles.statusStep,
                      {
                        backgroundColor: isActive ? c.accent + '14' : c.surfaceSecondary,
                        borderColor: isActive ? c.accent + '55' : c.border,
                        opacity: loading ? 0.6 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.colDot, { backgroundColor: meta.dot }]} />
                    <Text style={[styles.statusStepText, { color: isActive ? c.accent : c.foreground }]} numberOfLines={1}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {!!detail?.description && (
          <View style={[styles.sheetSectionCard, { backgroundColor: c.surfaceSecondary, borderColor: c.border, marginHorizontal: 16, marginTop: 16 }]}>
            <Text style={[styles.sheetSectionLabel, { color: c.muted, marginBottom: 8 }]}>{t.projectDetail.description}</Text>
            <Text style={[styles.descText, { color: c.foreground }]}>{detail.description}</Text>
          </View>
        )}

      {(detail?.attachments?.length ?? 0) > 0 && (
        <View style={{ marginTop: 16, paddingHorizontal: 16 }}>
          <Text style={[styles.sheetSectionLabel, { color: c.muted, marginBottom: 10 }]}>
            {t.projectDetail.files} · {detail!.attachments.length}
          </Text>
          {detail!.attachments.map(a => (
            <Pressable
              key={a.fileId}
              style={[styles.fileRow, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}
              onPress={() => handleDownloadFile(a.fileId)}
            >
              <View style={[styles.fileIconWrap, { backgroundColor: c.accent + '14' }]}>
                <HugeiconsIcon icon={File01Icon} size={16} color={c.accent} strokeWidth={1.8} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.fileName, { color: c.foreground }]} numberOfLines={1}>{a.filename}</Text>
                <Text style={[styles.fileSize, { color: c.muted }]}>
                  {t.projectDetail.fileSizeKb.replace('{size}', (a.sizeBytes / 1024).toFixed(0))}
                </Text>
              </View>
              <HugeiconsIcon icon={Download04Icon} size={16} color={c.accent} strokeWidth={2} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Pressable
          onPress={handleOpenComments}
          style={({ pressed }) => [
            styles.openCommentsBtn,
            {
              backgroundColor: c.accent,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <HugeiconsIcon icon={SentIcon} size={16} color="#fff" strokeWidth={2} />
          <Text style={styles.openCommentsText}>
            {t.projectDetail.openComments}
          </Text>
          <View style={styles.openCommentsBadge}>
            <Text style={styles.openCommentsBadgeText}>{commentCount}</Text>
          </View>
        </Pressable>
      </View>
    </BottomSheetScrollView>
  );
}

// ─── Gantt View (simplified) ──────────────────────────────────────────────────

function GanttView({ tasks, statusMap }: {
  tasks: TaskPayload[]; statusMap: Map<string, WorkflowStatusPayload>;
}) {
  const c = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const tasksWithDates = tasks.filter(tk => tk.startDate || tk.dueDate);

  if (tasksWithDates.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: insets.bottom }}>
        <Text style={{ color: c.muted, fontSize: SigmaTypo.bodySmall }}>{t.dashboard.noTasksYet}</Text>
      </View>
    );
  }

  const allDates = tasksWithDates.flatMap(tk => [tk.startDate, tk.dueDate].filter(Boolean) as string[]);
  const minDate = new Date(Math.min(...allDates.map(d => new Date(d).getTime())));
  const maxDate = new Date(Math.max(...allDates.map(d => new Date(d).getTime())));
  const totalDays = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000));

  return (
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 80 }}>
      {tasksWithDates.map(task => {
        const start = task.startDate ? new Date(task.startDate) : task.dueDate ? new Date(task.dueDate) : minDate;
        const end = task.dueDate ? new Date(task.dueDate) : start;
        const left = ((start.getTime() - minDate.getTime()) / 86400000) / totalDays;
        const width = Math.max(0.02, ((end.getTime() - start.getTime()) / 86400000) / totalDays);
        const wsStatus = task.statusId ? statusMap.get(task.statusId) : undefined;
        const meta = categoryOf(wsStatus?.category ?? task.status);
        return (
          <View key={task.id} style={styles.ganttRow}>
            <Text style={[styles.ganttLabel, { color: c.foreground }]} numberOfLines={1}>{task.title}</Text>
            <View style={[styles.ganttTrack, { backgroundColor: c.border }]}>
              <View style={[styles.ganttBar, { backgroundColor: meta.color, left: `${left * 100}%`, width: `${width * 100}%` }]} />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function ViewBtn({ active, icon, onPress }: { active: boolean; icon: any; onPress: () => void }) {
  const c = useSemanticTheme();
  const ACCENT = '#3b82f6';
  return (
    <Pressable onPress={onPress} style={[styles.viewBtnInner, { backgroundColor: active ? ACCENT + '20' : 'transparent' }]}>
      <HugeiconsIcon icon={icon} size={14} color={active ? ACCENT : c.muted} strokeWidth={1.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  projectBadge: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  projectKey: { color: '#fff', fontSize: SigmaTypo.caption, fontWeight: '800' },
  projectName: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  progressMeta: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  membersStack: { flexDirection: 'row', alignItems: 'center' },
  memberAv: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  memberInitial: { color: '#fff', fontSize: 9, fontWeight: '800' },

  toolbar: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchWrap: {
    flex: 1, minHeight: 36, borderRadius: SigmaRadius.sm, borderWidth: 1,
    paddingHorizontal: 10, justifyContent: 'center',
  },
  searchInput: {
    fontSize: SigmaTypo.caption, fontWeight: '500',
    paddingVertical: Platform.OS === 'android' ? 6 : 4,
    includeFontPadding: false,
  },
  viewToggle: { flexDirection: 'row', borderRadius: SigmaRadius.sm, borderWidth: 1, padding: 2 },
  viewBtnInner: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addTaskBtn: { width: 34, height: 34, borderRadius: SigmaRadius.sm, alignItems: 'center', justifyContent: 'center' },

  column: {
    width: 260,
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  colHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  colDot: { width: 8, height: 8, borderRadius: 4 },
  colLabel: { flex: 1, fontSize: SigmaTypo.caption, fontWeight: '700' },
  colCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  colCountText: { fontSize: SigmaTypo.captionSmall, fontWeight: '700' },
  colAddBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  emptyCol: { borderWidth: 1, borderStyle: 'dashed', borderRadius: SigmaRadius.sm, paddingVertical: 24, alignItems: 'center' },
  emptyColText: { fontSize: SigmaTypo.caption, fontWeight: '500' },

  taskCard: { borderRadius: SigmaRadius.sm, borderWidth: 1, padding: 12, gap: 8 },
  labelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  label: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  labelText: { fontSize: 10, fontWeight: '500' },
  taskTitle: { fontSize: SigmaTypo.caption, fontWeight: '600', lineHeight: 17 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  prioDot: { width: 6, height: 6, borderRadius: 3 },
  prioText: { fontSize: 10, fontWeight: '600' },
  dueDate: { fontSize: 10, fontWeight: '500' },
  assigneeAv: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  assigneeInitial: { color: '#fff', fontSize: 8, fontWeight: '800' },

  listHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  listHead: { fontSize: SigmaTypo.captionSmall, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  listTaskTitle: { flex: 1, fontSize: SigmaTypo.caption, fontWeight: '600' },
  statusChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignItems: 'center' },
  statusChipText: { fontSize: 10, fontWeight: '700' },
  listCell: { flex: 1, fontSize: SigmaTypo.captionSmall, fontWeight: '600', textAlign: 'right' },

  sheetScroll: { minHeight: 0 },
  openCommentsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: { elevation: 8 },
    }),
  },
  openCommentsText: {
    color: '#fff',
    fontSize: SigmaTypo.body,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  openCommentsBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  openCommentsBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  sheetHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 4,
  },
  sheetEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  sheetMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  sheetMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sheetMetaPillText: { fontSize: 11, fontWeight: '700' },
  sheetSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  sheetSectionCard: { borderRadius: SigmaRadius.lg, borderWidth: 1, padding: 14 },
  statusRailSection: { marginTop: 14, marginBottom: 4 },
  statusRailContent: {
    paddingLeft: 16,
    paddingRight: 16,
    gap: 8,
    flexDirection: 'row',
    paddingTop: 10,
    paddingBottom: 4,
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusStepText: { fontSize: SigmaTypo.captionSmall, fontWeight: '700' },

  descText: { fontSize: SigmaTypo.bodySmall, lineHeight: 22, fontWeight: '500' },
  fileIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyComments: {
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    paddingVertical: 22,
    alignItems: 'center',
  },
  commentBubble: {
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  floatingComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    marginHorizontal: 16,
    padding: 8,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  sheetComposerDock: {
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },

  emptyText: { fontSize: SigmaTypo.captionSmall, fontStyle: 'italic' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: SigmaRadius.lg,
    marginBottom: 8,
  },
  fileName: { fontSize: SigmaTypo.caption, fontWeight: '600' },
  fileSize: { fontSize: SigmaTypo.captionSmall, marginTop: 2 },

  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 10, fontWeight: '700' },
  commentContent: { fontSize: SigmaTypo.bodySmall, lineHeight: 20, fontWeight: '500' },
  commentDate: { fontSize: SigmaTypo.captionSmall },
  commentFile: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 4 },
  commentFileName: { fontSize: SigmaTypo.captionSmall, fontWeight: '600' },
  commentFileSize: { fontSize: 10 },
  commentInput: {
    flex: 1,
    fontSize: SigmaTypo.bodySmall,
    maxHeight: 96,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'android' ? 10 : 11,
    fontWeight: '500',
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },

  // Gantt
  ganttRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ganttLabel: { width: 110, fontSize: SigmaTypo.captionSmall, fontWeight: '600' },
  ganttTrack: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden', position: 'relative' },
  ganttBar: { position: 'absolute', top: 0, bottom: 0, borderRadius: 7, minWidth: 6 },
});
