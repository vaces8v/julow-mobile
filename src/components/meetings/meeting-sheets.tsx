import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { showToast } from '@/components/toaster';
import { api, ApiError, type ProjectPayload } from '@/lib/api';
import {
  ArrowDown01Icon,
  Calendar01Icon,
  Call02Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { AppBottomSheetContent, BottomSheet, sheetSnapPercent } from '@/components/app-bottom-sheet';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Input, Label, TextField } from 'heroui-native';

const SCHEDULE_SNAP_POINTS = [sheetSnapPercent(0.78), sheetSnapPercent(0.92)] as const;
const CREATABLE_ROLES = new Set(['owner', 'admin', 'manager']);

const TIME_SUGGESTIONS = ['09:00', '11:00', '13:30', '15:00', '16:30', '18:00'];

type DateOption = { key: string; label: string; date: Date };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function buildDateOptions(t: ReturnType<typeof useI18n>['t']): DateOption[] {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [
    { key: 'today', label: t.common.today, date: today },
    { key: 'tomorrow', label: t.common.tomorrow, date: tomorrow },
  ];
}

function parseTimeToDate(base: Date, time: string): Date {
  const [h, min] = time.split(':').map((v) => parseInt(v, 10));
  const dt = new Date(base);
  dt.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(min) ? min : 0, 0, 0);
  return dt;
}

async function filterCreatableProjects(
  workspaceId: string,
  userId: string,
  projects: ProjectPayload[],
): Promise<ProjectPayload[]> {
  const inWorkspace = projects.filter((p) => p.workspaceId === workspaceId);
  const creatable: ProjectPayload[] = [];

  await Promise.all(
    inWorkspace.map(async (project) => {
      if (project.ownerIds?.includes(userId)) {
        creatable.push(project);
        return;
      }
      try {
        const [members, roles] = await Promise.all([
          api.getProjectMembers(workspaceId, project.id),
          api.getProjectRoles(workspaceId, project.id),
        ]);
        const me = members.find((m) => m.userId === userId && m.isActive !== false);
        if (!me) return;
        const role = roles.find((r) => r.id === me.roleId);
        const roleName = (role?.name ?? '').toLowerCase();
        if (CREATABLE_ROLES.has(roleName)) {
          creatable.push(project);
        }
      } catch {
        // skip project on load error
      }
    }),
  );

  return creatable.sort((a, b) => a.name.localeCompare(b.name));
}

function useCreatableMeetingProjects(workspaceId: string, enabled: boolean) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectPayload[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !workspaceId || !user?.id) {
      setProjects([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const all = await api.getMyProjects();
        const filtered = await filterCreatableProjects(workspaceId, user.id, all);
        if (!cancelled) setProjects(filtered);
      } catch {
        if (!cancelled) setProjects([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workspaceId, user?.id, enabled]);

  return { projects, loading };
}

function showMeetingCreateError(
  err: unknown,
  m: ReturnType<typeof useI18n>['t']['meetings'],
) {
  if (err instanceof ApiError && err.code === 'INSUFFICIENT_MEETING_CREATE_PERMISSIONS') {
    showToast({ kind: 'error', title: m.createFailedTitle, body: m.createPermissionDenied });
    return;
  }
  const detail = err instanceof ApiError ? err.detail : err instanceof Error ? err.message : null;
  showToast({
    kind: 'error',
    title: m.createFailedTitle,
    body: detail ?? m.createFailedDescription,
  });
}

function ProjectPicker({
  tone,
  m,
  projects,
  loading,
  value,
  onChange,
}: {
  tone: SemanticTheme;
  m: ReturnType<typeof useI18n>['t']['meetings'];
  projects: ProjectPayload[];
  loading: boolean;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = projects.find((p) => p.id === value);

  if (loading) {
    return (
      <View style={[sheetStyles.projectLoading, { borderColor: tone.border, backgroundColor: tone.surfaceSecondary }]}>
        <ActivityIndicator color={tone.accent} size="small" />
      </View>
    );
  }

  if (projects.length === 0) {
    return (
      <Text style={[sheetStyles.projectHint, { color: tone.muted }]}>{m.noProjectsHint}</Text>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={[
          sheetStyles.projectTrigger,
          { borderColor: tone.border, backgroundColor: tone.surfaceSecondary },
        ]}
      >
        <Text
          style={[
            sheetStyles.projectTriggerText,
            { color: selected ? tone.foreground : tone.muted },
          ]}
          numberOfLines={1}
        >
          {selected?.name ?? m.projectPlaceholder}
        </Text>
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={16}
          color={tone.muted}
          strokeWidth={1.9}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {open ? (
        <View style={[sheetStyles.projectList, { borderColor: tone.border, backgroundColor: tone.surface }]}>
          {projects.map((p) => {
            const active = p.id === value;
            return (
              <Pressable
                key={p.id}
                onPress={() => {
                  onChange(p.id);
                  setOpen(false);
                }}
                style={[
                  sheetStyles.projectRow,
                  active && { backgroundColor: tone.accent + '18' },
                ]}
              >
                <View style={[sheetStyles.projectDot, { backgroundColor: p.color ?? tone.accent }]} />
                <Text
                  style={[
                    sheetStyles.projectRowText,
                    { color: active ? tone.accent : tone.foreground },
                  ]}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Text style={[sheetStyles.projectHint, { color: tone.muted }]}>
        {value ? m.projectMembersInfo : m.projectRequired}
      </Text>
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  sheetBody: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 14 },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  sheetHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetFooter: { flexDirection: 'row', gap: 10, marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
  projectTrigger: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  projectTriggerText: { flex: 1, fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  projectList: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    maxHeight: 180,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  projectRowText: { flex: 1, fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  projectHint: { fontSize: SigmaTypo.captionSmall, lineHeight: 16 },
  projectLoading: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export function NewRoomSheet({
  isOpen,
  onOpenChange,
  workspaceId,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  onCreated?: () => void;
}) {
  const tone = useSemanticTheme();
  const { t } = useI18n();
  const m = t.meetings;
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useCreatableMeetingProjects(workspaceId, isOpen);

  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setName('');
    setProjectId('');
  }, []);

  const fetchParticipantIds = useCallback(
    async (pid: string) => {
      if (!workspaceId || !user?.id) return [];
      try {
        const members = await api.getProjectMembers(workspaceId, pid);
        return members
          .filter((member) => member.isActive !== false)
          .map((member) => member.userId)
          .filter((id): id is string => Boolean(id) && id !== user.id);
      } catch {
        return [];
      }
    },
    [workspaceId, user?.id],
  );

  const handleCreate = useCallback(async () => {
    const title = name.trim() || m.newRoom;
    if (!workspaceId || !projectId || submitting) return;
    setSubmitting(true);
    try {
      const participantIds = await fetchParticipantIds(projectId);
      const meeting = await api.createMeeting({
        workspaceId,
        projectId,
        title,
        meetingType: 'video_call',
        participantIds,
      });
      await api.startMeeting(meeting.id).catch(() => {});
      onOpenChange(false);
      reset();
      onCreated?.();
      router.push(`/meetings/${meeting.id}/room`);
    } catch (err) {
      showMeetingCreateError(err, m);
    } finally {
      setSubmitting(false);
    }
  }, [
    name,
    workspaceId,
    projectId,
    submitting,
    m,
    onOpenChange,
    reset,
    onCreated,
    fetchParticipantIds,
  ]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <AppBottomSheetContent
          size="medium"
          contentContainerClassName="p-0"
          enableHandlePanningGesture
          enableContentPanningGesture
        >
            <View style={sheetStyles.sheetBody}>
              <View style={sheetStyles.sheetHeader}>
                <View style={[sheetStyles.sheetHeaderIcon, { backgroundColor: tone.accent + '22' }]}>
                  <HugeiconsIcon icon={Call02Icon} size={18} color={tone.accent} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <BottomSheet.Title
                    style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}
                  >
                    {m.newRoomDialogTitle}
                  </BottomSheet.Title>
                  <BottomSheet.Description style={{ color: tone.muted, fontSize: SigmaTypo.caption }}>
                    {m.newRoomDialogDesc}
                  </BottomSheet.Description>
                </View>
                <Pressable
                  onPress={() => onOpenChange(false)}
                  style={[sheetStyles.sheetCloseBtn, { backgroundColor: tone.surfaceSecondary }]}
                  accessibilityLabel={t.common.cancel}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} color={tone.foreground} strokeWidth={1.9} />
                </Pressable>
              </View>

              <TextField>
                <Label>{m.newRoomNameLabel}</Label>
                <Input
                  variant="secondary"
                  value={name}
                  onChangeText={setName}
                  placeholder={m.newRoomNamePlaceholder}
                  placeholderTextColor={tone.muted}
                />
              </TextField>

              <View style={{ gap: 6 }}>
                <Label>{m.projectLabel}</Label>
                <ProjectPicker
                  tone={tone}
                  m={m}
                  projects={projects}
                  loading={projectsLoading}
                  value={projectId}
                  onChange={setProjectId}
                />
              </View>

              <View style={sheetStyles.sheetFooter}>
                <Button variant="secondary" size="sm" onPress={() => onOpenChange(false)} style={{ flex: 1 }}>
                  <Button.Label>{t.common.cancel}</Button.Label>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => void handleCreate()}
                  style={{ flex: 1 }}
                  isDisabled={!projectId || !workspaceId || submitting || projects.length === 0}
                >
                  <Button.Label>{m.newRoomSubmit}</Button.Label>
                </Button>
              </View>
            </View>
        </AppBottomSheetContent>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

export function ScheduleSheet({
  isOpen,
  onOpenChange,
  workspaceId,
  onScheduled,
}: {
  isOpen: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  onScheduled?: () => void;
}) {
  const tone = useSemanticTheme();
  const { t } = useI18n();
  const m = t.meetings;
  const { user } = useAuth();
  const { projects, loading: projectsLoading } = useCreatableMeetingProjects(workspaceId, isOpen);

  const dateOptions = useMemo(() => buildDateOptions(t), [t]);
  const [dateKey, setDateKey] = useState('today');
  const [time, setTime] = useState('09:00');
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedDate = dateOptions.find((d) => d.key === dateKey)?.date ?? dateOptions[0].date;

  const reset = useCallback(() => {
    setTitle('');
    setProjectId('');
    setDateKey('today');
    setTime('09:00');
  }, []);

  const fetchParticipantIds = useCallback(
    async (pid: string) => {
      if (!workspaceId || !user?.id) return [];
      try {
        const members = await api.getProjectMembers(workspaceId, pid);
        return members
          .filter((member) => member.isActive !== false)
          .map((member) => member.userId)
          .filter((id): id is string => Boolean(id) && id !== user.id);
      } catch {
        return [];
      }
    },
    [workspaceId, user?.id],
  );

  const handleSchedule = useCallback(async () => {
    if (!workspaceId || !projectId || submitting) return;
    const meetingTitle = title.trim() || m.scheduleMeeting;
    const scheduledAt = parseTimeToDate(selectedDate, time).toISOString();
    setSubmitting(true);
    try {
      const participantIds = await fetchParticipantIds(projectId);
      await api.createMeeting({
        workspaceId,
        projectId,
        title: meetingTitle,
        meetingType: 'video_call',
        scheduledAt,
        durationMinutes: 30,
        participantIds,
      });
      onOpenChange(false);
      reset();
      onScheduled?.();
      showToast({ kind: 'success', title: m.scheduleSubmit });
    } catch (err) {
      showMeetingCreateError(err, m);
    } finally {
      setSubmitting(false);
    }
  }, [
    workspaceId,
    projectId,
    submitting,
    title,
    m,
    selectedDate,
    time,
    onOpenChange,
    reset,
    onScheduled,
    fetchParticipantIds,
  ]);

  return (
    <BottomSheet
      isOpen={isOpen}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <AppBottomSheetContent
          snapPoints={[...SCHEDULE_SNAP_POINTS]}
          contentContainerClassName="p-0"
          enableHandlePanningGesture
          enableContentPanningGesture
        >
            <View style={sheetStyles.sheetBody}>
              <View style={sheetStyles.sheetHeader}>
                <View style={[sheetStyles.sheetHeaderIcon, { backgroundColor: tone.accent + '22' }]}>
                  <HugeiconsIcon icon={Calendar01Icon} size={18} color={tone.accent} strokeWidth={1.9} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <BottomSheet.Title
                    style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}
                  >
                    {m.scheduleDialogTitle}
                  </BottomSheet.Title>
                  <BottomSheet.Description style={{ color: tone.muted, fontSize: SigmaTypo.caption }}>
                    {m.scheduleDialogDesc}
                  </BottomSheet.Description>
                </View>
                <Pressable
                  onPress={() => onOpenChange(false)}
                  style={[sheetStyles.sheetCloseBtn, { backgroundColor: tone.surfaceSecondary }]}
                  accessibilityLabel={t.common.cancel}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} color={tone.foreground} strokeWidth={1.9} />
                </Pressable>
              </View>

              <TextField>
                <Label>{m.newRoomNameLabel}</Label>
                <Input
                  variant="secondary"
                  value={title}
                  onChangeText={setTitle}
                  placeholder={m.newRoomNamePlaceholder}
                  placeholderTextColor={tone.muted}
                />
              </TextField>

              <View style={{ gap: 6 }}>
                <Label>{m.projectLabel}</Label>
                <ProjectPicker
                  tone={tone}
                  m={m}
                  projects={projects}
                  loading={projectsLoading}
                  value={projectId}
                  onChange={setProjectId}
                />
              </View>

              <View style={{ gap: 8 }}>
                <Label>{m.scheduleDateLabel}</Label>
                <View style={sheetStyles.pillRow}>
                  {dateOptions.map((d) => {
                    const selected = d.key === dateKey;
                    return (
                      <Pressable
                        key={d.key}
                        onPress={() => setDateKey(d.key)}
                        style={[
                          sheetStyles.suggestChip,
                          {
                            backgroundColor: selected ? tone.accent + '22' : tone.surfaceSecondary,
                            borderColor: selected ? tone.accent : tone.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? tone.accent : tone.foreground,
                            fontSize: SigmaTypo.bodySmall,
                            fontWeight: '600',
                          }}
                        >
                          {d.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <Label>{m.scheduleTimeLabel}</Label>
                <View style={sheetStyles.pillRow}>
                  {TIME_SUGGESTIONS.map((tm) => {
                    const selected = tm === time;
                    return (
                      <Pressable
                        key={tm}
                        onPress={() => setTime(tm)}
                        style={[
                          sheetStyles.suggestChip,
                          {
                            backgroundColor: selected ? tone.accent + '22' : tone.surfaceSecondary,
                            borderColor: selected ? tone.accent : tone.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? tone.accent : tone.foreground,
                            fontSize: SigmaTypo.bodySmall,
                            fontWeight: '600',
                            fontVariant: ['tabular-nums'],
                          }}
                        >
                          {tm}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={sheetStyles.sheetFooter}>
                <Button variant="secondary" size="sm" onPress={() => onOpenChange(false)} style={{ flex: 1 }}>
                  <Button.Label>{t.common.cancel}</Button.Label>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => void handleSchedule()}
                  style={{ flex: 1 }}
                  isDisabled={!projectId || !workspaceId || submitting || projects.length === 0}
                >
                  <Button.Label>{m.scheduleSubmit}</Button.Label>
                </Button>
              </View>
            </View>
        </AppBottomSheetContent>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
