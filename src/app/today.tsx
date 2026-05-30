import { ScreenShell } from '@/components/screen-shell';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useWorkspace } from '@/contexts/workspace-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import type { TaskPayload } from '@/lib/api';
import { TODAY_MOCK_TASKS, todayMockProjectName } from '@/lib/today-mock-tasks';
import {
  getDayState,
  loadBundle,
  setDayState,
  setFocusSlots,
  setPresenceSelf,
  standUpsForDay,
  upsertMyStandUp,
} from '@/lib/today-storage';
import type { FocusSessionState, FocusSlots, PresencePreset } from '@/lib/today-types';
import { TODAY_FOCUS_MAX, dayKeyFromDate, emptyFocusSlots } from '@/lib/today-types';
import { Add01Icon, Calendar01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { Button } from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

function formatMmSs(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function elapsedSeconds(session: FocusSessionState, now: number): number {
  const seg =
    session.segmentStartedAt != null ? (now - session.segmentStartedAt) / 1000 : 0;
  return Math.min(session.targetSeconds, session.accumulatedSeconds + seg);
}

function pauseSession(session: FocusSessionState, now: number): FocusSessionState {
  if (session.segmentStartedAt == null) return session;
  return {
    ...session,
    accumulatedSeconds: session.accumulatedSeconds + (now - session.segmentStartedAt) / 1000,
    segmentStartedAt: null,
  };
}

export default function TodayScreen() {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const td = t.today;
  const d = t.dashboard;
  const { activeWorkspaceId } = useWorkspace();

  const dayKey = useMemo(() => dayKeyFromDate(new Date()), []);
  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof loadBundle>> | null>(null);
  const tasks = TODAY_MOCK_TASKS;
  const [tick, setTick] = useState(() => Date.now());
  const [panel, setPanel] = useState<'focus' | 'team'>('focus');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickIndex, setPickIndex] = useState<number | null>(null);
  const [taskQuery, setTaskQuery] = useState('');

  const [suY, setSuY] = useState('');
  const [suT, setSuT] = useState('');
  const [suB, setSuB] = useState('');

  const projectName = useCallback((projectId: string) => todayMockProjectName(projectId), []);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    let cancelled = false;
    void loadBundle(activeWorkspaceId).then((b) => {
      if (!cancelled) setBundle(b);
    });
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const dayState = bundle ? getDayState(bundle, dayKey) : null;
  const slots = dayState?.focusSlots ?? emptyFocusSlots();
  const filledCount = slots.filter(Boolean).length;

  const taskById = useMemo(() => {
    const m = new Map<string, TaskPayload>();
    for (const x of tasks) m.set(x.id, x);
    return m;
  }, [tasks]);

  useEffect(() => {
    if (!dayState?.myStandUp) return;
    const nextStandUp = dayState.myStandUp;
    const timeoutId = setTimeout(() => {
      setSuY(nextStandUp.yesterday);
      setSuT(nextStandUp.today);
      setSuB(nextStandUp.blockers);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [dayState?.myStandUp]);

  const patch = useCallback(
    (next: NonNullable<typeof bundle>) => {
      setBundle(next);
    },
    [],
  );

  const onSlotsChange = (next: FocusSlots) => {
    if (!activeWorkspaceId || !bundle) return;
    patch(setFocusSlots(activeWorkspaceId, bundle, dayKey, next));
  };

  const swap = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from > 2 || to > 2) return;
    const next: FocusSlots = [...slots] as FocusSlots;
    const tmp = next[from];
    next[from] = next[to]!;
    next[to] = tmp!;
    onSlotsChange(next);
  };

  const clearSlot = (i: number) => {
    const next: FocusSlots = [...slots] as FocusSlots;
    next[i] = null;
    onSlotsChange(next);
  };

  const openPicker = (i: number) => {
    setPickIndex(i);
    setTaskQuery('');
    setPickerOpen(true);
  };

  const pickTask = (taskId: string) => {
    if (pickIndex == null || !activeWorkspaceId || !bundle) return;
    const next: FocusSlots = [...slots] as FocusSlots;
    next[pickIndex] = taskId;
    patch(setFocusSlots(activeWorkspaceId, bundle, dayKey, next));
    setPickerOpen(false);
    setPickIndex(null);
  };

  const filteredPickTasks = useMemo(() => {
    const q = taskQuery.trim().toLowerCase();
    const used = new Set(
      slots.flatMap((id, i) => (id && i !== pickIndex ? [id] : [])) as string[],
    );
    return tasks.filter((task) => {
      if (used.has(task.id)) return false;
      if (!q) return true;
      return (
        task.title.toLowerCase().includes(q) ||
        projectName(task.projectId).toLowerCase().includes(q)
      );
    });
  }, [taskQuery, tasks, slots, pickIndex, projectName]);

  const updateDayNote = (dayNote: string) => {
    if (!activeWorkspaceId || !bundle) return;
    patch(setDayState(activeWorkspaceId, bundle, dayKey, { dayNote }));
  };

  const submitStandUp = () => {
    if (!activeWorkspaceId || !bundle) return;
    patch(
      upsertMyStandUp(
        activeWorkspaceId,
        bundle,
        dayKey,
        { yesterday: suY, today: suT, blockers: suB },
        'You',
      ),
    );
  };

  const onPresence = (preset: PresencePreset) => {
    if (!activeWorkspaceId || !bundle) return;
    patch(setPresenceSelf(activeWorkspaceId, bundle, preset));
  };

  const firstFocusTaskId = slots.find((x) => x != null) ?? null;
  const session = dayState?.focusSession ?? null;

  const setTimerSession = (next: FocusSessionState | null) => {
    if (!activeWorkspaceId || !bundle) return;
    patch(setDayState(activeWorkspaceId, bundle, dayKey, { focusSession: next }));
  };

  const startTimer = (targetSeconds: number) => {
    const taskId = firstFocusTaskId;
    if (!taskId) return;
    setTimerSession({
      taskId,
      targetSeconds,
      accumulatedSeconds: 0,
      segmentStartedAt: Date.now(),
    });
  };

  const togglePause = () => {
    if (!session || !bundle || !activeWorkspaceId) return;
    const now = tick;
    if (session.segmentStartedAt != null) {
      setTimerSession(pauseSession(session, now));
    } else {
      setTimerSession({ ...session, segmentStartedAt: now });
    }
  };

  const resetTimer = () => setTimerSession(null);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    if (!bundle) return;
    const s = getDayState(bundle, dayKey).focusSession;
    if (!s?.segmentStartedAt) return;
    if (elapsedSeconds(s, tick) < s.targetSeconds - 0.5) return;

    const pausedSession = pauseSession(s, tick);
    const timeoutId = setTimeout(() => {
      setTimerSession(pausedSession);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [tick, dayKey, activeWorkspaceId, bundle]);

  const timerDisplay = session
    ? formatMmSs(Math.max(0, session.targetSeconds - elapsedSeconds(session, tick)))
    : '0:00';

  const presets: { id: PresencePreset; label: string }[] = [
    { id: 'deep_work', label: td.presetDeep },
    { id: 'meeting', label: td.presetMeeting },
    { id: 'need_help', label: td.presetHelp },
    { id: 'available', label: td.presetAvailable },
  ];

  const standUps = bundle ? standUpsForDay(bundle, dayKey) : [];

  const statusLabel = (st: TaskPayload['status']) =>
    st === 'in_progress' ? d.inProgress : st === 'todo' ? d.todo : st === 'review' ? d.review : d.done;

  if (!activeWorkspaceId || !bundle || !dayState) {
    return (
      <ScreenShell title={td.title} subtitle={td.subtitle}>
        <Text style={{ color: c.muted, padding: 20 }}>{t.common.loading}</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={td.title} subtitle={td.subtitle}>
      <Fade delay={0} initialY={6}>
        <View style={[styles.tabs, { borderColor: c.border }]}>
          <Pressable
            onPress={() => setPanel('focus')}
            style={[styles.tabBtn, panel === 'focus' && { backgroundColor: c.accent + '22' }]}
          >
            <HugeiconsIcon icon={Calendar01Icon} size={16} color={c.accent} strokeWidth={1.8} />
            <Text style={[styles.tabText, { color: panel === 'focus' ? c.accent : c.muted }]}>
              {td.tabMyDay}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPanel('team')}
            style={[styles.tabBtn, panel === 'team' && { backgroundColor: c.accent + '22' }]}
          >
            <Text style={[styles.tabText, { color: panel === 'team' ? c.accent : c.muted }]}>
              {td.tabTeam}
            </Text>
          </Pressable>
        </View>
        <Text style={[styles.syncLine, { color: c.muted }]}>{td.syncLine}</Text>
      </Fade>

      {panel === 'focus' && (
        <>
          <Fade delay={40} initialY={8}>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>{td.focusTitle}</Text>
              <Text style={[styles.progress, { color: c.accent }]}>
                {td.focusProgress.replace('{{filled}}', String(filledCount))}
              </Text>
              {slots.map((taskId, i) => {
                const task = taskId ? taskById.get(taskId) : undefined;
                return (
                  <View
                    key={i}
                    style={[styles.slot, { borderColor: c.border, backgroundColor: c.background }]}
                  >
                    {task ? (
                      <>
                        <Text style={[styles.taskTitle, { color: c.foreground }]} numberOfLines={2}>
                          {task.title}
                        </Text>
                        <Text style={[styles.taskMeta, { color: c.muted }]} numberOfLines={1}>
                          {projectName(task.projectId)}
                        </Text>
                        <View style={styles.chips}>
                          <View style={[styles.miniChip, { backgroundColor: c.border + '44' }]}>
                            <Text style={{ fontSize: 11, color: c.foreground }}>{statusLabel(task.status)}</Text>
                          </View>
                          <View style={[styles.miniChip, { backgroundColor: c.border + '44' }]}>
                            <Text style={{ fontSize: 11, color: c.foreground }}>{task.priority}</Text>
                          </View>
                        </View>
                        <View style={styles.rowActions}>
                          <Button size="sm" variant="ghost" onPress={() => clearSlot(i)}>
                            <Text style={{ color: c.danger }}>{td.clearSlot}</Text>
                          </Button>
                          <View style={styles.reorder}>
                            <Pressable
                              onPress={() => swap(i, i - 1)}
                              disabled={i === 0}
                              style={styles.iconAct}
                            >
                              <ChevronUp size={20} color={c.muted} strokeWidth={2} />
                            </Pressable>
                            <Pressable
                              onPress={() => swap(i, i + 1)}
                              disabled={i === 2}
                              style={styles.iconAct}
                            >
                              <ChevronDown size={20} color={c.muted} strokeWidth={2} />
                            </Pressable>
                          </View>
                        </View>
                      </>
                    ) : (
                      <View>
                        <Text style={{ color: c.muted, marginBottom: 8 }}>
                          {td.emptySlot} · {i + 1}/{TODAY_FOCUS_MAX}
                        </Text>
                        <Button
                          size="sm"
                          variant="primary"
                          onPress={() => openPicker(i)}
                          isDisabled={filledCount >= TODAY_FOCUS_MAX}
                        >
                          <HugeiconsIcon icon={Add01Icon} size={16} color={c.accentForeground} />
                          <Text style={{ color: c.accentForeground, marginLeft: 6 }}>{td.addFromTasks}</Text>
                        </Button>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </Fade>

          <Fade delay={80} initialY={8} style={{ marginTop: 14 }}>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>{td.timerTitle}</Text>
              {!firstFocusTaskId && (
                <Text style={[styles.hint, { color: c.muted }]}>{td.timerIdleHint}</Text>
              )}
              <Text style={[styles.timer, { color: c.accent }]}>{timerDisplay}</Text>
              <View style={styles.timerRow}>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => startTimer(25 * 60)}
                  isDisabled={!firstFocusTaskId || !!(session?.segmentStartedAt)}
                >
                  {td.minutes25}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => startTimer(50 * 60)}
                  isDisabled={!firstFocusTaskId || !!(session?.segmentStartedAt)}
                >
                  {td.minutes50}
                </Button>
                <Button size="sm" variant="primary" onPress={togglePause} isDisabled={!session}>
                  {session?.segmentStartedAt != null ? td.pause : td.start}
                </Button>
                <Button size="sm" variant="ghost" onPress={resetTimer} isDisabled={!session}>
                  {td.reset}
                </Button>
              </View>
            </View>
          </Fade>

          <Fade delay={120} initialY={8} style={{ marginTop: 14 }}>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>{td.wrapTitle}</Text>
              <Text style={[styles.label, { color: c.muted }]}>{td.wrapLabel}</Text>
              <TextInput
                multiline
                value={dayState.dayNote}
                onChangeText={updateDayNote}
                placeholder={td.wrapPlaceholder}
                placeholderTextColor={c.muted}
                style={[styles.textArea, { color: c.foreground, borderColor: c.border }]}
              />
            </View>
          </Fade>
        </>
      )}

      {panel === 'team' && (
        <>
          <Fade delay={40} initialY={8}>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>{td.standUpTitle}</Text>
              <Field label={td.standUpYesterday} value={suY} onChange={setSuY} c={c} />
              <Field label={td.standUpToday} value={suT} onChange={setSuT} c={c} />
              <Field label={td.standUpBlockers} value={suB} onChange={setSuB} c={c} />
              <Button variant="primary" onPress={submitStandUp} style={{ marginTop: 8 }}>
                <Text style={{ color: c.accentForeground }}>{td.standUpSubmit}</Text>
              </Button>
              {dayState.myStandUp && (
                <Text style={[styles.posted, { color: c.muted }]}>{td.standUpPosted}</Text>
              )}
            </View>
          </Fade>

          <Fade delay={80} initialY={8} style={{ marginTop: 14 }}>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>{td.feedTitle}</Text>
              <Text style={[styles.privacy, { color: c.muted }]}>{td.privacyHint}</Text>
              {standUps.length === 0 ? (
                <Text style={{ color: c.muted }}>{td.noStandUps}</Text>
              ) : (
                standUps.map((post) => (
                  <View
                    key={post.id}
                    style={[styles.suCard, { borderColor: c.border }]}
                  >
                    <Text style={[styles.taskTitle, { color: c.foreground }]}>{post.userName}</Text>
                    <Text style={[styles.suLine, { color: c.muted }]}>
                      {td.standUpYesterday}: {post.yesterday || '—'}
                    </Text>
                    <Text style={[styles.suLine, { color: c.muted }]}>
                      {td.standUpToday}: {post.today || '—'}
                    </Text>
                    <Text style={[styles.suLine, { color: c.muted }]}>
                      {td.standUpBlockers}: {post.blockers || '—'}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </Fade>

          <Fade delay={120} initialY={8} style={{ marginTop: 14 }}>
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.foreground }]}>{td.presenceTitle}</Text>
              <Text style={[styles.hint, { color: c.muted }]}>{td.presenceSet}</Text>
              <View style={styles.presenceRow}>
                {presets.map((p) => (
                  <Button key={p.id} size="sm" variant="secondary" onPress={() => onPresence(p.id)}>
                    {p.label}
                  </Button>
                ))}
              </View>
              {bundle.presence.map((p) => (
                <View key={p.userId} style={[styles.presenceLine, { borderColor: c.border }]}>
                  <Text style={{ color: c.foreground, flex: 1 }} numberOfLines={1}>
                    {p.userName}
                  </Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>
                    {presets.find((x) => x.id === p.preset)?.label ?? p.preset}
                  </Text>
                </View>
              ))}
            </View>
          </Fade>
        </>
      )}

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.modalSheet, { backgroundColor: c.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.cardTitle, { color: c.foreground }]}>{td.pickTaskTitle}</Text>
            <TextInput
              value={taskQuery}
              onChangeText={setTaskQuery}
              placeholder={td.searchTasks}
              placeholderTextColor={c.muted}
              style={[styles.search, { color: c.foreground, borderColor: c.border }]}
            />
            {filteredPickTasks.map((task) => (
              <Pressable
                key={task.id}
                style={[styles.pickRow, { borderColor: c.border }]}
                onPress={() => pickTask(task.id)}
              >
                <Text style={{ color: c.foreground, fontWeight: '600' }}>{task.title}</Text>
                <Text style={{ color: c.muted, fontSize: 12 }}>{projectName(task.projectId)}</Text>
              </Pressable>
            ))}
            {filteredPickTasks.length === 0 && (
              <Text style={{ color: c.muted, textAlign: 'center', padding: 16 }}>{d.noTasksYet}</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

function Field({
  label,
  value,
  onChange,
  c,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  c: ReturnType<typeof useSemanticTheme>;
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.label, { color: c.muted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={[styles.input, { color: c.foreground, borderColor: c.border }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SigmaRadius.lg,
    padding: 4,
    marginBottom: 8,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: SigmaRadius.md,
  },
  tabText: {
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '600',
  },
  syncLine: {
    fontSize: 12,
    marginBottom: 12,
  },
  card: {
    borderRadius: SigmaRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  cardTitle: {
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
    marginBottom: 10,
  },
  progress: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  slot: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SigmaRadius.lg,
    padding: 12,
    marginBottom: 10,
  },
  taskTitle: {
    fontSize: SigmaTypo.body,
    fontWeight: '600',
  },
  taskMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  miniChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SigmaRadius.sm,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  reorder: {
    flexDirection: 'row',
    gap: 4,
  },
  iconAct: {
    padding: 6,
  },
  hint: {
    fontSize: 13,
    marginBottom: 8,
  },
  timer: {
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    marginVertical: 8,
  },
  timerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  textArea: {
    minHeight: 88,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SigmaRadius.md,
    padding: 10,
    fontSize: SigmaTypo.body,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SigmaRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: SigmaTypo.body,
  },
  posted: {
    fontSize: 12,
    marginTop: 8,
  },
  privacy: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  suCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SigmaRadius.md,
    padding: 10,
    marginBottom: 8,
  },
  suLine: {
    fontSize: 12,
    marginTop: 4,
  },
  presenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    marginTop: 8,
  },
  presenceLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: SigmaRadius.xl,
    borderTopRightRadius: SigmaRadius.xl,
    padding: 20,
    maxHeight: '70%',
  },
  search: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SigmaRadius.md,
    padding: 10,
    marginBottom: 12,
    fontSize: SigmaTypo.body,
  },
  pickRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: SigmaRadius.md,
    padding: 12,
    marginBottom: 8,
  },
});
