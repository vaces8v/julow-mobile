import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  api,
  type CommentPayload,
  type ProjectPayload,
  type TaskDetailPayload,
  type TaskPayload,
  type WorkflowStatusPayload,
} from '@/lib/api';
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
import { router, useLocalSearchParams } from 'expo-router';
import { BottomSheet, Skeleton } from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
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
  useAnimatedStyle,
  useSharedValue,
  withSpring,
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

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#ef4444' },
  high: { label: 'High', color: '#f97316' },
  medium: { label: 'Medium', color: '#f59e0b' },
  low: { label: 'Low', color: '#94a3b8' },
};

function categoryOf(cat?: string) {
  const k = cat?.toLowerCase() ?? 'todo';
  return CATEGORY_META[k] ?? CATEGORY_META.todo;
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  const [project, setProject] = useState<ProjectPayload | null>(null);
  const [tasks, setTasks] = useState<TaskPayload[]>([]);
  const [statuses, setStatuses] = useState<WorkflowStatusPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createColumnId, setCreateColumnId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      // Find project — try getMyProjects first (cross-workspace)
      const allProjects = await api.getMyProjects();
      const found = allProjects.find(p => p.id === id);
      if (found) {
        setProject(found);
        // Fetch board data + tasks using project's workspaceId
        const wsId = found.workspaceId;
        const [boardData, projectTasks] = await Promise.all([
          api.getBoardData(wsId, id).catch(() => ({ columns: [], workflowStatuses: [] })),
          api.getProjectTasks(wsId, id).catch(() => [] as TaskPayload[]),
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

  useEffect(() => { void loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const openCreateModal = useCallback((columnId?: string) => {
    setCreateColumnId(columnId ?? null);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setCreateModalVisible(true);
  }, []);

  const handleCreateTask = useCallback(async () => {
    if (!newTaskTitle.trim() || !project) return;
    try {
      await api.createTask({
        workspaceId: project.workspaceId,
        projectId: project.id,
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim() || undefined,
        descriptionFormat: 'MARKDOWN',
      });
      setCreateModalVisible(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      await loadData();
    } catch (e) {
      console.error('Failed to create task:', e);
    }
  }, [newTaskTitle, newTaskDesc, project, loadData]);

  const handleStatusChange = useCallback(async (taskId: string, newStatusId: string) => {
    try {
      await api.updateTaskStatus(taskId, newStatusId);
      await loadData();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  }, [loadData]);

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
          label: ws.name,
          category: ws.category,
          color: meta.color,
          dot: meta.dot,
          tasks: tasks.filter(t => t.statusId === ws.id && filterTask(t)),
        };
      });
    }

    // Fallback: group by task.status string
    const fallbackStatuses = ['todo', 'in_progress', 'review', 'done'] as const;
    return fallbackStatuses.map(s => {
      const meta = CATEGORY_META[s];
      return {
        id: s,
        label: s.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase()),
        category: s,
        color: meta.color,
        dot: meta.dot,
        tasks: tasks.filter(t => t.status === s && filterTask(t)),
      };
    });
  }, [tasks, statuses, search]);

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
  const projInitials = project?.icon ?? project?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '??';
  const selectedTask = tasks.find(t => t.id === selectedId);

  // Open detail sheet when task is selected
  useEffect(() => {
    if (selectedId) setDetailSheetOpen(true);
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
          <Text style={[styles.projectName, { color: c.foreground }]} numberOfLines={1}>{project?.name ?? 'Project'}</Text>
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
                <Text style={styles.memberInitial}>{m.name?.[0]?.toUpperCase() ?? '?'}</Text>
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
          onPress={() => openCreateModal()}
        >
          <HugeiconsIcon icon={Add01Icon} size={16} color="#fff" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Content */}
      {viewMode === 'board' ? (
        <ScrollView
          horizontal
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
                onAddTask={() => openCreateModal(col.id)}
              />
            </Fade>
          ))}
        </ScrollView>
      ) : viewMode === 'list' ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.foreground} colors={[c.accent]} />
          }
        >
          <View style={[styles.listHeader, { borderBottomColor: c.border }]}>
            {['Task', 'Status', 'Priority', 'Due'].map((h, i) => (
              <Text key={h} style={[styles.listHead, { color: c.muted, flex: i === 0 ? 3 : 1, textAlign: i === 0 ? 'left' : 'right' }]}>{h}</Text>
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
      <BottomSheet isOpen={detailSheetOpen} onOpenChange={(v) => { setDetailSheetOpen(v); if (!v) setSelectedId(null); }}>
        <BottomSheet.Portal>
          <BottomSheet.Overlay />
          <BottomSheet.Content snapPoints={['70%', '92%']} backgroundClassName="rounded-t-[28px]">
            {selectedTask && (
              <TaskDetail
                task={selectedTask}
                statuses={statuses}
                statusMap={statusMap}
                onStatusChange={handleStatusChange}
              />
            )}
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>

      {/* Create Task Modal */}
      <Modal visible={createModalVisible} transparent animationType="fade" onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <Pressable style={styles.modalOverlay} onPress={() => setCreateModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: c.surface, borderColor: c.border }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: c.foreground }]}>{t.common.create}</Text>
            <TextInput
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              placeholder={t.dashboard.newTask}
              placeholderTextColor={c.muted}
              style={[styles.modalInput, { color: c.foreground, backgroundColor: c.background, borderColor: c.border }]}
              autoFocus
            />
            <TextInput
              value={newTaskDesc}
              onChangeText={setNewTaskDesc}
              placeholder="Description..."
              placeholderTextColor={c.muted}
              style={[styles.modalInput, styles.modalTextArea, { color: c.foreground, backgroundColor: c.background, borderColor: c.border }]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, { backgroundColor: c.background, borderColor: c.border }]} onPress={() => setCreateModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: c.muted }]}>{t.common.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: c.accent }]} onPress={handleCreateTask}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{t.common.create}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Board Column ─────────────────────────────────────────────────────────────

function BoardColumn({ col, selectedId, onSelectTask, projectColor, statusMap, onAddTask }: {
  col: { id: string; label: string; category: string; color: string; dot: string; tasks: TaskPayload[] };
  selectedId: string | null;
  onSelectTask: (id: string) => void;
  projectColor: string;
  statusMap: Map<string, WorkflowStatusPayload>;
  onAddTask: () => void;
}) {
  const c = useSemanticTheme();
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
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled style={{ maxHeight: 480 }} contentContainerStyle={{ gap: 8, paddingBottom: 8 }}>
        {col.tasks.length === 0 ? (
          <View style={[styles.emptyCol, { borderColor: c.border }]}>
            <Text style={[styles.emptyColText, { color: c.muted }]}>No tasks</Text>
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
  const prio = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: withSpring(scale.value, { damping: 14, stiffness: 300 }) }] }));

  return (
    <Pressable
      onPressIn={() => { scale.value = 0.97; }}
      onPressOut={() => { scale.value = 1; }}
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
              <Text style={[styles.dueDate, { color: c.muted }]}>{task.dueDate.slice(5, 10)}</Text>
            </>
          )}
          {task.assignee && (
            <View style={[styles.assigneeAv, { backgroundColor: '#6b7280', marginLeft: 'auto' }]}>
              <Text style={styles.assigneeInitial}>{typeof task.assignee === 'string' ? task.assignee[0].toUpperCase() : '?'}</Text>
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
  const ws = task.statusId ? statusMap.get(task.statusId) : undefined;
  const sm = categoryOf(ws?.category ?? task.status);
  const statusLabel = ws?.name ?? task.status;
  const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
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
      <Text style={[styles.listCell, { color: c.muted }]}>{task.dueDate ? task.dueDate.slice(5, 10) : '—'}</Text>
    </Pressable>
  );
}

// ─── Task Detail (renders inside Hero UI BottomSheet.Content) ─────────────────

function TaskDetail({ task, statuses, statusMap, onStatusChange }: {
  task: TaskPayload;
  statuses: WorkflowStatusPayload[];
  statusMap: Map<string, WorkflowStatusPayload>;
  onStatusChange: (taskId: string, newStatusId: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const c = useSemanticTheme();
  const ws = task.statusId ? statusMap.get(task.statusId) : undefined;
  const sm = categoryOf(ws?.category ?? task.status);
  const statusLabel = ws?.name ?? task.status;
  const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;

  const [detail, setDetail] = useState<TaskDetailPayload | null>(null);
  const [comments, setComments] = useState<CommentPayload[]>([]);
  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getTask(task.id).then(setDetail).catch(() => {});
    api.listComments('task', task.id).then(setComments).catch(() => {});
  }, [task.id]);

  const handlePickStatus = async (sId: string) => {
    setStatusPickerOpen(false);
    await onStatusChange(task.id, sId);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    try {
      const newComment = await api.addComment({
        targetType: 'task',
        targetId: task.id,
        content: commentText.trim(),
      });
      setComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (e) {
      console.error('Failed to send comment:', e);
    } finally {
      setSending(false);
    }
  };

  const handleDownloadFile = (fileId: string) => {
    const url = `https://backend.julow.ru/api/v1/files/${fileId}/download`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }}>
      <BottomSheet.Title style={{ color: c.foreground, fontSize: SigmaTypo.headline, fontWeight: '700', marginBottom: 4 }}>
        {task.title}
      </BottomSheet.Title>

      {(task.labels?.length ?? 0) > 0 && (
        <View style={[styles.labelRow, { marginBottom: 10 }]}>
          {task.labels.map(l => (
            <View key={l} style={[styles.label, { backgroundColor: c.background }]}>
              <Text style={[styles.labelText, { color: c.muted }]}>{l}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 30 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Description */}
        {detail?.description ? (
          <Text style={[styles.descText, { color: c.foreground, marginBottom: 12 }]}>{detail.description}</Text>
        ) : null}

        {/* Status + Priority */}
        <View style={[styles.metaTable, { borderColor: c.border }]}>
          <Pressable style={[styles.metaRow, { borderTopWidth: 0 }]} onPress={() => setStatusPickerOpen(!statusPickerOpen)}>
            <Text style={[styles.metaLabel, { color: c.muted }]}>Status</Text>
            <View style={[styles.statusChip, { backgroundColor: sm.color + '20' }]}>
              <Text style={[styles.statusChipText, { color: sm.color }]}>{statusLabel} ▾</Text>
            </View>
          </Pressable>
          <View style={[styles.metaRow, { borderTopColor: c.border }]}>
            <Text style={[styles.metaLabel, { color: c.muted }]}>Priority</Text>
            <Text style={[styles.detailMeta, { color: pm.color }]}>{pm.label}</Text>
          </View>
          {task.dueDate && (
            <View style={[styles.metaRow, { borderTopColor: c.border }]}>
              <Text style={[styles.metaLabel, { color: c.muted }]}>Due</Text>
              <Text style={[styles.detailMeta, { color: c.foreground }]}>{task.dueDate.slice(0, 10)}</Text>
            </View>
          )}
        </View>

        {/* Status picker dropdown */}
        {statusPickerOpen && statuses.length > 0 && (
          <View style={[styles.statusPicker, { backgroundColor: c.background, borderColor: c.border }]}>
            {[...statuses].sort((a, b) => a.order - b.order).map(s => {
              const meta = categoryOf(s.category);
              const isActive = s.id === task.statusId;
              return (
                <Pressable key={s.id} style={[styles.statusOption, isActive && { backgroundColor: c.accent + '10' }]} onPress={() => handlePickStatus(s.id)}>
                  <View style={[styles.colDot, { backgroundColor: meta.dot }]} />
                  <Text style={[styles.statusOptionText, { color: isActive ? c.accent : c.foreground }]}>{s.name}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Attachments */}
        {(detail?.attachments?.length ?? 0) > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Files ({detail!.attachments.length})</Text>
            {detail!.attachments.map(a => (
              <Pressable key={a.fileId} style={[styles.fileRow, { borderColor: c.border }]} onPress={() => handleDownloadFile(a.fileId)}>
                <HugeiconsIcon icon={File01Icon} size={16} color={c.muted} strokeWidth={1.8} />
                <Text style={[styles.fileName, { color: c.foreground }]} numberOfLines={1}>{a.filename}</Text>
                <Text style={[styles.fileSize, { color: c.muted }]}>{(a.sizeBytes / 1024).toFixed(0)} KB</Text>
                <HugeiconsIcon icon={Download04Icon} size={14} color={c.accent} strokeWidth={2} />
              </Pressable>
            ))}
          </View>
        )}

        {/* Comments */}
        <View style={{ marginTop: 16, marginBottom: 16 }}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>Comments ({comments.length})</Text>
          {comments.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.muted }]}>No comments yet</Text>
          ) : (
            comments.map(cm => {
              const isOwn = cm.authorId === user?.id;
              return (
                <View key={cm.id} style={[styles.commentRow, { backgroundColor: isOwn ? c.accent + '18' : c.background }]}>
                  <View style={styles.commentHeader}>
                    <View style={[styles.commentAvatar, { backgroundColor: isOwn ? c.accent : c.accent + '30' }]}>
                      <Text style={[styles.commentAvatarText, { color: isOwn ? '#fff' : c.accent }]}>{cm.authorId?.slice(0, 1).toUpperCase() ?? '?'}</Text>
                    </View>
                    <Text style={[styles.commentDate, { color: c.muted }]}>{cm.createdAt?.slice(0, 16).replace('T', ' ')}</Text>
                  </View>
                  {!!cm.content && <Text style={[styles.commentContent, { color: c.foreground }]}>{cm.content}</Text>}
                  {cm.attachments?.length > 0 && cm.attachments.map(att => (
                    <Pressable key={att.id} style={[styles.commentFile, { backgroundColor: c.surface, borderColor: c.border }]} onPress={() => handleDownloadFile(att.fileId)}>
                      <HugeiconsIcon icon={File01Icon} size={16} color={c.accent} strokeWidth={1.8} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.commentFileName, { color: c.foreground }]} numberOfLines={1}>{att.name ?? 'File'}</Text>
                        {att.sizeBytes != null && <Text style={[styles.commentFileSize, { color: c.muted }]}>{(att.sizeBytes / 1024).toFixed(0)} KB</Text>}
                      </View>
                      <HugeiconsIcon icon={Download04Icon} size={14} color={c.accent} strokeWidth={2} />
                    </Pressable>
                  ))}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Comment input */}
      <View style={[styles.commentInputRow, { borderColor: c.border, backgroundColor: c.background }]}>
        <TextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Write a comment..."
          placeholderTextColor={c.muted}
          style={[styles.commentInput, { color: c.foreground }]}
          multiline
        />
        <Pressable style={[styles.sendBtn, { backgroundColor: commentText.trim() ? c.accent : c.border }]} onPress={handleSendComment} disabled={!commentText.trim() || sending}>
          <HugeiconsIcon icon={SentIcon} size={16} color={commentText.trim() ? '#fff' : c.muted} strokeWidth={2} />
        </Pressable>
      </View>
    </View>
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

  // Detail (used inside Hero UI BottomSheet)
  descText: { fontSize: SigmaTypo.caption, lineHeight: 18 },
  metaTable: { borderRadius: SigmaRadius.sm, borderWidth: 1, overflow: 'hidden' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  metaLabel: { fontSize: SigmaTypo.caption, fontWeight: '500' },
  detailMeta: { fontSize: SigmaTypo.caption, fontWeight: '600' },

  statusPicker: { borderRadius: SigmaRadius.sm, borderWidth: 1, marginTop: 6, padding: 6, gap: 2 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 6 },
  statusOptionText: { fontSize: SigmaTypo.caption, fontWeight: '600' },

  sectionTitle: { fontSize: SigmaTypo.caption, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: SigmaTypo.captionSmall, fontStyle: 'italic' },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderRadius: 10, marginBottom: 6 },
  fileName: { fontSize: SigmaTypo.caption, fontWeight: '500', flex: 1 },
  fileSize: { fontSize: SigmaTypo.captionSmall, marginRight: 4 },

  // Comments
  commentRow: { borderRadius: 10, padding: 12, marginBottom: 8, gap: 6 },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 10, fontWeight: '700' },
  commentContent: { fontSize: SigmaTypo.caption, lineHeight: 18 },
  commentDate: { fontSize: SigmaTypo.captionSmall },
  commentFile: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 },
  commentFileName: { fontSize: SigmaTypo.captionSmall, fontWeight: '600' },
  commentFileSize: { fontSize: 10 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'android' ? 6 : 8, marginBottom: 30 },
  commentInput: { flex: 1, fontSize: SigmaTypo.caption, maxHeight: 80, paddingVertical: 0 },
  sendBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000050', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalContent: { width: '100%', borderRadius: SigmaRadius.lg, borderWidth: 1, padding: 20, gap: 14 },
  modalTitle: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  modalInput: { borderRadius: SigmaRadius.sm, borderWidth: 1, paddingHorizontal: 12, paddingVertical: Platform.OS === 'android' ? 10 : 12, fontSize: SigmaTypo.caption },
  modalTextArea: { minHeight: 80, paddingTop: 10 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: { flex: 1, paddingVertical: 10, borderRadius: SigmaRadius.sm, borderWidth: 1, alignItems: 'center' },
  modalBtnText: { fontSize: SigmaTypo.caption, fontWeight: '600' },

  // Gantt
  ganttRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  ganttLabel: { width: 110, fontSize: SigmaTypo.captionSmall, fontWeight: '600' },
  ganttTrack: { flex: 1, height: 14, borderRadius: 7, overflow: 'hidden', position: 'relative' },
  ganttBar: { position: 'absolute', top: 0, bottom: 0, borderRadius: 7, minWidth: 6 },
});
