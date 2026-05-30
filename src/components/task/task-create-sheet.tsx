import { AppBottomSheetContent, BottomSheet } from '@/components/app-bottom-sheet';
import { SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  api,
  type ProjectMemberPayload,
  type WorkflowStatusPayload,
} from '@/lib/api';
import { cachedApi } from '@/lib/cache/cached-api';
import type { CreateTaskPayload } from '@/lib/cache/mutation-queue';
import {
  Add01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button, Chip, FieldError, Input, Label, TextArea, TextField } from 'heroui-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TASK_TYPES = ['TASK', 'BUG', 'FEATURE', 'IMPROVEMENT'] as const;
const PRIORITIES = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'URGENT'] as const;

type TaskType = (typeof TASK_TYPES)[number];
type Priority = (typeof PRIORITIES)[number];
type DuePreset = 'none' | 'today' | 'tomorrow' | 'nextWeek';
type StartPreset = 'none' | 'today';

type MemberOption = {
  userId: string;
  label: string;
  isCurrentUser: boolean;
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dueDateFromPreset(preset: DuePreset): string | undefined {
  if (preset === 'none') return undefined;
  const d = startOfDay(new Date());
  if (preset === 'tomorrow') d.setDate(d.getDate() + 1);
  if (preset === 'nextWeek') d.setDate(d.getDate() + 7);
  return isoDate(d);
}

function startDateFromPreset(preset: StartPreset): string | undefined {
  if (preset === 'none') return undefined;
  return isoDate(startOfDay(new Date()));
}

export function TaskCreateSheet({
  isOpen,
  onOpenChange,
  workspaceId,
  projectId,
  statuses,
  defaultStatusId,
  onCreated,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  projectId: string;
  statuses: WorkflowStatusPayload[];
  defaultStatusId?: string | null;
  onCreated?: () => void;
}) {
  const tone = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const tt = t.taskCreate;
  const { user } = useAuth();

  const sortedStatuses = useMemo(
    () => [...statuses].sort((a, b) => a.order - b.order),
    [statuses],
  );

  const resolvedDefaultStatus = defaultStatusId ?? sortedStatuses[0]?.id ?? '';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [taskType, setTaskType] = useState<TaskType>('TASK');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [statusId, setStatusId] = useState(resolvedDefaultStatus);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [duePreset, setDuePreset] = useState<DuePreset>('none');
  const [startPreset, setStartPreset] = useState<StartPreset>('none');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [members, setMembers] = useState<MemberOption[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [titleError, setTitleError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = useCallback(() => {
    setTitle('');
    setDescription('');
    setTaskType('TASK');
    setPriority('MEDIUM');
    setStatusId(resolvedDefaultStatus);
    setAssigneeIds([]);
    setDuePreset('none');
    setStartPreset('none');
    setAdvancedOpen(false);
    setTitleError(null);
    setDateError(null);
    setSubmitError(null);
    setSubmitting(false);
    setMembers([]);
    setMembersLoading(false);
  }, [resolvedDefaultStatus]);

  useEffect(() => {
    if (!isOpen) return;
    setStatusId(resolvedDefaultStatus);
    setTitleError(null);
    setDateError(null);
    setSubmitError(null);
  }, [isOpen, resolvedDefaultStatus]);

  useEffect(() => {
    if (!isOpen || !workspaceId || !projectId) return;
    let cancelled = false;
    setMembersLoading(true);

    void (async () => {
      try {
        const pm = await api.getProjectMembers(workspaceId, projectId).catch(() => [] as ProjectMemberPayload[]);
        const userEntries = await Promise.all(
          pm.map(async (m) => {
            try {
              const u = await api.getUserById(m.userId);
              return [m.userId, u] as const;
            } catch {
              return [m.userId, null] as const;
            }
          }),
        );
        if (cancelled) return;

        const userById = new Map(userEntries);
        const mapped: MemberOption[] = pm
          .filter((m) => m.isActive !== false)
          .map((m) => {
            const isCurrentUser = !!user && m.userId === user.id;
            const u = userById.get(m.userId);
            const emailPrefix = u?.email?.split('@')[0];
            const label = isCurrentUser
              ? (emailPrefix || user?.email || tt.memberFallback)
              : (emailPrefix || `${tt.memberFallback} · ${m.userId.slice(0, 8)}`);
            return { userId: m.userId, label, isCurrentUser };
          });

        setMembers(mapped);
      } catch {
        if (!cancelled) setMembers([]);
      } finally {
        if (!cancelled) setMembersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, workspaceId, projectId, user, tt.memberFallback]);

  const toggleAssignee = useCallback((userId: string) => {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }, []);

  const validate = useCallback((): boolean => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError(tt.errorRequired);
      return false;
    }
    if (trimmed.length > 500) {
      setTitleError(tt.errorMax500);
      return false;
    }
    setTitleError(null);

    const startDate = startDateFromPreset(startPreset);
    const dueDate = dueDateFromPreset(duePreset);
    if (startDate && dueDate && new Date(dueDate).getTime() < new Date(startDate).getTime()) {
      setDateError(tt.errorDueBeforeStart);
      return false;
    }
    setDateError(null);
    return true;
  }, [title, startPreset, duePreset, tt]);

  const handleCreate = useCallback(async () => {
    if (submitting) return;
    if (!validate()) return;

    const payload: CreateTaskPayload = {
      workspaceId,
      projectId,
      title: title.trim(),
      taskType,
      priority,
      description: description.trim() || undefined,
      descriptionFormat: description.trim() ? 'MARKDOWN' : undefined,
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      startDate: startDateFromPreset(startPreset),
      dueDate: dueDateFromPreset(duePreset),
      statusId: statusId || undefined,
    };

    setSubmitting(true);
    setSubmitError(null);
    try {
      await cachedApi.createTask(payload);
      onOpenChange(false);
      reset();
      onCreated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg || tt.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    validate,
    workspaceId,
    projectId,
    title,
    taskType,
    priority,
    description,
    assigneeIds,
    startPreset,
    duePreset,
    statusId,
    onOpenChange,
    reset,
    onCreated,
    tt.errorGeneric,
  ]);

  const footerInset = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8);

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
          size="tall"
          snapOnLayout
          contentContainerClassName="flex-1 p-0"
          enableHandlePanningGesture
          enableContentPanningGesture
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
        >
          <View style={styles.sheetRoot}>
            <BottomSheetScrollView
              style={styles.sheetScroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator
            >
              <View style={styles.sheetHeader}>
                <View style={[styles.sheetHeaderIcon, { backgroundColor: tone.accent + '22' }]}>
                  <HugeiconsIcon icon={Add01Icon} size={18} color={tone.accent} strokeWidth={2} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <BottomSheet.Title
                    style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}
                  >
                    {tt.title}
                  </BottomSheet.Title>
                  <BottomSheet.Description style={{ color: tone.muted, fontSize: SigmaTypo.caption, lineHeight: 18 }}>
                    {tt.description}
                  </BottomSheet.Description>
                </View>
                <Pressable
                  onPress={() => onOpenChange(false)}
                  style={[styles.sheetCloseBtn, { backgroundColor: tone.surfaceSecondary }]}
                  accessibilityLabel={t.common.cancel}
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={16} color={tone.foreground} strokeWidth={1.9} />
                </Pressable>
              </View>

              <TextField isInvalid={!!titleError}>
                <Label>{tt.fieldTitle} *</Label>
                <Input
                  variant="secondary"
                  value={title}
                  onChangeText={(v) => {
                    setTitle(v);
                    if (titleError) setTitleError(null);
                  }}
                  placeholder={tt.fieldTitlePlaceholder}
                  placeholderTextColor={tone.muted}
                />
                {titleError ? <FieldError>{titleError}</FieldError> : null}
              </TextField>

              <TextField>
                <Label>{tt.fieldDescription}</Label>
                <TextArea
                  variant="secondary"
                  value={description}
                  onChangeText={setDescription}
                  placeholder={tt.fieldDescriptionPlaceholder}
                  placeholderTextColor={tone.muted}
                  numberOfLines={4}
                />
              </TextField>

              <ChipSection label={tt.fieldType}>
                {TASK_TYPES.map((tp) => (
                  <SelectChip
                    key={tp}
                    label={tt.taskType[tp]}
                    selected={taskType === tp}
                    onPress={() => setTaskType(tp)}
                  />
                ))}
              </ChipSection>

              <ChipSection label={tt.fieldPriority}>
                {PRIORITIES.map((p) => (
                  <SelectChip
                    key={p}
                    label={tt.priority[p]}
                    selected={priority === p}
                    onPress={() => setPriority(p)}
                  />
                ))}
              </ChipSection>

              {sortedStatuses.length > 0 ? (
                <ChipSection label={tt.fieldStatus}>
                  {sortedStatuses.map((s) => (
                    <SelectChip
                      key={s.id}
                      label={s.name}
                      selected={statusId === s.id}
                      onPress={() => setStatusId(s.id)}
                    />
                  ))}
                </ChipSection>
              ) : null}

              <ChipSection label={tt.fieldDueDate} error={dateError}>
                {(
                  [
                    ['none', tt.dueNone],
                    ['today', tt.dueToday],
                    ['tomorrow', tt.dueTomorrow],
                    ['nextWeek', tt.dueNextWeek],
                  ] as const
                ).map(([key, label]) => (
                  <SelectChip
                    key={key}
                    label={label}
                    selected={duePreset === key}
                    onPress={() => {
                      setDuePreset(key);
                      if (dateError) setDateError(null);
                    }}
                  />
                ))}
              </ChipSection>

              <View style={{ gap: 8 }}>
                <Label>{tt.fieldAssignees}</Label>
                <Text style={[styles.hint, { color: tone.muted }]}>{tt.fieldAssigneesHint}</Text>
                {membersLoading ? (
                  <View style={[styles.membersLoading, { borderColor: tone.border, backgroundColor: tone.surfaceSecondary }]}>
                    <ActivityIndicator color={tone.accent} size="small" />
                  </View>
                ) : members.length === 0 ? (
                  <Text style={[styles.hint, { color: tone.muted }]}>{tt.noMembers}</Text>
                ) : (
                  <View style={styles.assigneeRow}>
                    {members.map((m) => {
                      const selected = assigneeIds.includes(m.userId);
                      return (
                        <Chip
                          key={m.userId}
                          size="sm"
                          variant={selected ? 'primary' : 'soft'}
                          color={selected ? 'accent' : 'default'}
                          onPress={() => toggleAssignee(m.userId)}
                        >
                          <Chip.Label>
                            {m.isCurrentUser ? `${m.label} · ${tt.youBadge}` : m.label}
                          </Chip.Label>
                        </Chip>
                      );
                    })}
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => setAdvancedOpen((v) => !v)}
                style={styles.advancedToggle}
              >
                <HugeiconsIcon
                  icon={ArrowDown01Icon}
                  size={14}
                  color={tone.accent}
                  strokeWidth={2}
                  style={{ transform: [{ rotate: advancedOpen ? '180deg' : '0deg' }] }}
                />
                <Text style={[styles.advancedToggleText, { color: tone.accent }]}>
                  {advancedOpen ? tt.hideAdvanced : tt.showAdvanced}
                </Text>
              </Pressable>

              {advancedOpen ? (
                <View style={[styles.advancedBox, { borderColor: tone.border, backgroundColor: tone.surfaceSecondary + '80' }]}>
                  <ChipSection label={tt.fieldStartDate}>
                    {(
                      [
                        ['none', tt.dueNone],
                        ['today', tt.dueToday],
                      ] as const
                    ).map(([key, label]) => (
                      <SelectChip
                        key={key}
                        label={label}
                        selected={startPreset === key}
                        onPress={() => {
                          setStartPreset(key);
                          if (dateError) setDateError(null);
                        }}
                      />
                    ))}
                  </ChipSection>
                </View>
              ) : null}

              {submitError ? (
                <View style={[styles.errorBanner, { borderColor: '#ef444460', backgroundColor: '#ef444414' }]}>
                  <Text style={styles.errorBannerText}>{submitError}</Text>
                </View>
              ) : null}
            </BottomSheetScrollView>

            <View
              style={[
                styles.sheetFooterDock,
                {
                  borderTopColor: tone.border,
                  backgroundColor: tone.background,
                  paddingBottom: footerInset,
                },
              ]}
            >
              <View style={styles.sheetFooter}>
                <Button variant="secondary" size="sm" onPress={() => onOpenChange(false)} style={{ flex: 1 }}>
                  <Button.Label>{t.common.cancel}</Button.Label>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => void handleCreate()}
                  style={{ flex: 1 }}
                  isDisabled={submitting || !title.trim()}
                >
                  <Button.Label>{submitting ? tt.submitting : t.common.create}</Button.Label>
                </Button>
              </View>
            </View>
          </View>
        </AppBottomSheetContent>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

function ChipSection({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      <View style={styles.pillRow}>{children}</View>
      {error ? <FieldError>{error}</FieldError> : null}
    </View>
  );
}

function SelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Chip
      size="sm"
      variant={selected ? 'primary' : 'soft'}
      color={selected ? 'accent' : 'default'}
      onPress={onPress}
    >
      <Chip.Label>{label}</Chip.Label>
    </Chip>
  );
}

const styles = StyleSheet.create({
  sheetRoot: {
    flex: 1,
    minHeight: 0,
  },
  sheetScroll: {
    flex: 1,
    minHeight: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
    gap: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 2,
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
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  assigneeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hint: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '500',
    lineHeight: 16,
  },
  membersLoading: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 2,
  },
  advancedToggleText: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '700',
  },
  advancedBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '600',
    lineHeight: 18,
  },
  sheetFooterDock: {
    flexShrink: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
  },
});
