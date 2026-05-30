import { HeaderBlurBackground } from '@/components/header-blur-background';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useWorkspace } from '@/contexts/workspace-context';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, type MeetingPayload } from '@/lib/api';
import {
  Add01Icon,
  ArrowLeft01Icon,
  Calendar01Icon,
  Call02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView } from 'expo-blur';
import { router, useFocusEffect } from 'expo-router';
import { NewRoomSheet, ScheduleSheet } from '@/components/meetings/meeting-sheets';
import { Button, Card } from 'heroui-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatMeetingTime(iso: string | undefined, locale: 'en' | 'ru' | 'de') {
  if (!iso) return '—';
  const tag = locale === 'ru' ? 'ru-RU' : locale === 'de' ? 'de-DE' : 'en-US';
  return new Date(iso).toLocaleString(tag, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Align large title, section labels, and action buttons with sticky header controls. */
const PAGE_GUTTER = 10;

function formatMeetingStatus(
  status: string | undefined,
  m: ReturnType<typeof useI18n>['t']['meetings'],
) {
  const s = (status ?? '').toLowerCase();
  if (s === 'draft') return m.statusDraft;
  if (s === 'scheduled') return m.statusScheduled;
  if (s === 'in_progress') return m.statusInProgress;
  if (s === 'completed') return m.statusCompleted;
  if (s === 'cancelled') return m.statusCancelled;
  return status ?? '—';
}

/* â”€â”€â”€ Screen root â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

export default function MeetingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { t, locale } = useI18n();
  const m = t.meetings;
  const { activeWorkspaceId } = useWorkspace();

  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [meetings, setMeetings] = useState<MeetingPayload[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMeetings = useCallback(() => {
    setLoading(true);
    api
      .listMyMeetings()
      .then(setMeetings)
      .catch(() => setMeetings([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMeetings();
    }, [loadMeetings]),
  );

  const activeMeetings = useMemo(
    () =>
      meetings
        .filter((mt) => (mt.status ?? '').toLowerCase() === 'in_progress')
        .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '')),
    [meetings],
  );

  const upcomingMeetings = useMemo(
    () =>
      meetings
        .filter((mt) => {
          const status = (mt.status ?? '').toLowerCase();
          return status === 'scheduled' || status === 'draft';
        })
        .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? '')),
    [meetings],
  );

  const historyMeetings = useMemo(
    () =>
      meetings
        .filter((mt) => {
          const status = (mt.status ?? '').toLowerCase();
          return status === 'completed' || status === 'cancelled';
        })
        .sort((a, b) => (b.scheduledAt ?? '').localeCompare(a.scheduledAt ?? '')),
    [meetings],
  );

  const handleJoin = useCallback((meetingId: string) => {
    router.push(`/meetings/${meetingId}/room`);
  }, []);

  const scrollY = useSharedValue(0);
  const blurTargetRef = useRef<View>(null);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const HEADER_H = insets.top + 54;

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 50], [0, 1], Extrapolation.CLAMP),
  }));
  const smallTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [30, 60], [10, 0], Extrapolation.CLAMP) }],
  }));
  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 40], [1, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [-50, 0, 40], [1.04, 1, 0.94], Extrapolation.CLAMP) },
      { translateY: interpolate(scrollY.value, [0, 40], [0, -10], Extrapolation.CLAMP) },
    ],
  }));

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Sticky header */}
      <View style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <HeaderBlurBackground blurTargetRef={blurTargetRef} />
          <View style={[styles.headerBorder, { backgroundColor: c.border }]} />
        </Animated.View>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Pressable
              onPress={() => router.back()}
              style={styles.iconBtn}
              hitSlop={10}
              android_ripple={{ color: c.surfaceSecondary, borderless: true, radius: 22 }}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={c.foreground} strokeWidth={1.8} />
            </Pressable>
            <Animated.Text
              numberOfLines={1}
              style={[styles.headerTitleSmall, { color: c.foreground, flex: 1 }, smallTitleStyle]}
            >
              {m.title}
            </Animated.Text>
          </View>
          <Pressable style={styles.iconBtn} onPress={() => setNewRoomOpen(true)} hitSlop={10}>
            <HugeiconsIcon icon={Add01Icon} size={22} color={c.foreground} strokeWidth={1.9} />
          </Pressable>
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }} collapsable={false}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: HEADER_H + 8,
          paddingBottom: insets.bottom + 120,
        }}
      >
        <Animated.View style={[styles.largeTitleWrap, largeTitleStyle]}>
          <Text style={[styles.largeTitle, { color: c.foreground }]}>{m.title}</Text>
          <Text style={[styles.largeSubtitle, { color: c.muted }]}>{m.subtitle}</Text>
        </Animated.View>

        <View style={styles.scrollBody}>
        {/* Header actions */}
        <Fade delay={40} initialY={6} style={{ marginBottom: 14 }}>
          <View style={styles.actionRow}>
            <Button size="sm" variant="primary" style={styles.actionBtn} onPress={() => setNewRoomOpen(true)}>
              <HugeiconsIcon icon={Call02Icon} size={15} color={c.accentForeground} strokeWidth={2} />
              <Button.Label>{m.newRoom}</Button.Label>
            </Button>
            <Button size="sm" variant="secondary" style={styles.actionBtn} onPress={() => setScheduleOpen(true)}>
              <HugeiconsIcon icon={Calendar01Icon} size={15} color={c.accent} strokeWidth={2} />
              <Button.Label style={{ color: c.accent }}>{m.scheduleMeeting}</Button.Label>
            </Button>
          </View>
        </Fade>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={c.accent} />
          </View>
        ) : null}

        {activeMeetings.length > 0 ? (
          <Fade delay={80} initialY={10} style={{ marginTop: 8 }}>
            <SectionHeader label={m.active} tone={c} />
            <Card
              style={{ backgroundColor: c.surface, borderColor: c.accent + '44', borderWidth: StyleSheet.hairlineWidth }}
            >
              <Card.Body style={{ gap: 8, padding: 10 }}>
                {activeMeetings.map((row) => (
                  <MeetingRow
                    key={row.id}
                    title={row.title}
                    meta={formatMeetingTime(row.scheduledAt, locale)}
                    tone={c}
                    joinLabel={m.join}
                    onJoin={() => handleJoin(row.id)}
                    live
                  />
                ))}
              </Card.Body>
            </Card>
          </Fade>
        ) : null}

        <Fade delay={activeMeetings.length > 0 ? 140 : 80} initialY={10} style={{ marginTop: 22 }}>
          <SectionHeader label={m.upcoming} tone={c} />
          <Card
            style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }}
          >
            <Card.Body style={{ gap: 8, padding: 10 }}>
              {upcomingMeetings.length === 0 && !loading ? (
                <Text style={[styles.emptyLine, { color: c.muted }]}>—</Text>
              ) : (
                upcomingMeetings.map((row) => (
                  <MeetingRow
                    key={row.id}
                    title={row.title}
                    meta={formatMeetingTime(row.scheduledAt, locale)}
                    tone={c}
                    joinLabel={m.join}
                    onJoin={() => handleJoin(row.id)}
                  />
                ))
              )}
            </Card.Body>
          </Card>
        </Fade>

        <Fade delay={200} initialY={10} style={{ marginTop: 18 }}>
          <SectionHeader label={m.history} tone={c} />
          <Card style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }}>
            <Card.Body style={{ padding: 4 }}>
              {historyMeetings.length === 0 && !loading ? (
                <Text style={[styles.emptyLine, { color: c.muted, paddingHorizontal: 12 }]}>—</Text>
              ) : (
                historyMeetings.map((row, i, arr) => (
                  <Pressable
                    key={row.id}
                    android_ripple={{ color: c.surfaceSecondary }}
                    style={[
                      styles.historyRow,
                      i < arr.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: c.separator,
                      },
                    ]}
                  >
                    <View style={[styles.historyIcon, { backgroundColor: c.accent + '1A' }]}>
                      <HugeiconsIcon icon={Call02Icon} size={14} color={c.accent} strokeWidth={1.8} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[styles.historyTitle, { color: c.foreground }]}>
                        {row.title}
                      </Text>
                      <Text style={[styles.historyMeta, { color: c.muted }]}>
                        {formatMeetingTime(row.scheduledAt, locale)} · {formatMeetingStatus(row.status, m)}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </Card.Body>
          </Card>
        </Fade>
        </View>
      </Animated.ScrollView>
      </BlurTargetView>

      {newRoomOpen ? (
        <NewRoomSheet
          isOpen
          onOpenChange={setNewRoomOpen}
          workspaceId={activeWorkspaceId}
          onCreated={loadMeetings}
        />
      ) : null}
      {scheduleOpen ? (
        <ScheduleSheet
          isOpen
          onOpenChange={setScheduleOpen}
          workspaceId={activeWorkspaceId}
          onScheduled={loadMeetings}
        />
      ) : null}
    </View>
  );
}

/* â”€â”€â”€ Section header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function SectionHeader({ label, tone }: { label: string; tone: SemanticTheme }) {
  return (
    <Text style={[styles.sectionLabel, { color: tone.muted }]}>{label}</Text>
  );
}

function MeetingRow({
  title,
  meta,
  tone,
  joinLabel,
  onJoin,
  live,
}: {
  title: string;
  meta: string;
  tone: SemanticTheme;
  joinLabel: string;
  onJoin: () => void;
  live?: boolean;
}) {
  return (
    <View
      style={[
        styles.upcomingRow,
        {
          backgroundColor: live ? tone.accent + '0D' : tone.surfaceSecondary,
          borderColor: live ? tone.accent + '44' : tone.border,
        },
      ]}
    >
      {live ? (
        <View style={[styles.liveDot, { backgroundColor: tone.accent }]} />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[styles.upcomingTitle, { color: tone.foreground }]}>
          {title}
        </Text>
        <Text style={[styles.upcomingMeta, { color: tone.muted }]}>{meta}</Text>
      </View>
      <Button size="sm" variant="primary" onPress={onJoin}>
        <Button.Label>{joinLabel}</Button.Label>
      </Button>
    </View>
  );
}
/* â”€â”€â”€ styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const styles = StyleSheet.create({
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  headerBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  headerTitleSmall: {
    flex: 1,
    fontSize: SigmaTypo.headline,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  largeTitleWrap: {
    marginBottom: 10,
    paddingHorizontal: PAGE_GUTTER,
  },
  scrollBody: {
    paddingHorizontal: PAGE_GUTTER,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  titleIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largeTitle: {
    fontSize: SigmaTypo.largeTitle,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  largeSubtitle: {
    marginTop: 8,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
    lineHeight: 19,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexGrow: 1,
    flexBasis: 150,
  },

  stageHeader: {
    gap: 10,
  },
  stageHint: {
    marginTop: 2,
    fontSize: SigmaTypo.caption,
    fontWeight: '500',
  },
  liveBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  liveBadgeText: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  stageBody: {
    minHeight: 280,
    paddingTop: 12,
    paddingHorizontal: 10,
    paddingBottom: 74,
    overflow: 'hidden',
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tile: {
    width: '31.2%',
    aspectRatio: 1,
    borderRadius: SigmaRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  tileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  tileName: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '600',
  },

  dockWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: 'center',
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 22,
    paddingHorizontal: 6,
    paddingVertical: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowOffset: { width: 0, height: 10 },
        shadowRadius: 24,
      },
      android: { elevation: 6 },
    }),
  },
  dockBtn: {
    width: 38,
    height: 38,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dockLeaveBtn: {
    width: 38,
    height: 38,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  capsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 2,
  },
  noteText: {
    marginTop: 8,
    fontSize: SigmaTypo.caption,
    textAlign: 'center',
    fontWeight: '500',
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
  },
  emptyLine: {
    fontSize: SigmaTypo.caption,
    paddingVertical: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SigmaRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  upcomingTitle: {
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '700',
  },
  upcomingMeta: {
    marginTop: 2,
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '500',
  },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '600',
  },
  historyMeta: {
    marginTop: 2,
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '500',
  },

  /* Sheets */
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
  },
  sheetHeaderIcon: {
    width: 38,
    height: 38,
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
  sheetFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },

  /* Chat sheet */
  chatRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  chatAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAvatarInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  chatBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  chatBubbleText: {
    fontSize: SigmaTypo.bodySmall,
    lineHeight: 20,
    fontWeight: '500',
  },
  sheetInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sheetSendWrap: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* People sheet */
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: SigmaRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  peopleAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  peopleName: {
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '600',
  },

  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
