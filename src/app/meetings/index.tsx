import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme, type SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  Add01Icon,
  ArrowLeft01Icon,
  BubbleChatIcon,
  Calendar01Icon,
  Call02Icon,
  CallEnd02Icon,
  Cancel01Icon,
  ComputerScreenShareIcon,
  Mic01Icon,
  MicOff01Icon,
  MoreVerticalIcon,
  SentIcon,
  UserGroup02Icon,
  VideoReplayIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  Description,
  Input,
  Label,
  TextField,
} from 'heroui-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  interpolateColor,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const IOS_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

/* ─── Mock data ─────────────────────────────────────────────────────────── */

const PARTICIPANTS = [
  { initials: 'AK', name: 'Alexey', color: '#3b82f6' },
  { initials: 'MV', name: 'Marina', color: '#8b5cf6' },
  { initials: 'DP', name: 'Denis', color: '#f97316' },
  { initials: 'OS', name: 'Olga', color: '#06b6d4' },
  { initials: 'PN', name: 'Pavel', color: '#22c55e' },
];

type MeetingChatRow = { id: string; from: 'peer' | 'self'; text: string };

/* ─── Screen root ───────────────────────────────────────────────────────── */

export default function MeetingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { t } = useI18n();
  const m = t.meetings;
  const cc = t.chats;

  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [newRoomOpen, setNewRoomOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [shareOn, setShareOn] = useState(false);

  const scrollY = useSharedValue(0);
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

  const openChat = useCallback(() => {
    setPeopleOpen(false);
    setChatOpen(true);
  }, []);
  const openPeople = useCallback(() => {
    setChatOpen(false);
    setPeopleOpen(true);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Sticky header */}
      <View style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <BlurView
            blurMethod={Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined}
            intensity={c.scheme === 'dark' ? 60 : 70}
            tint={c.scheme === 'dark' ? 'dark' : 'prominent'}
            blurReductionFactor={Platform.OS === 'android' ? 0.5 : 1}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.headerBorder, { backgroundColor: c.border }]} />
        </Animated.View>
        <View style={styles.headerRow}>
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
            style={[styles.headerTitleSmall, { color: c.foreground }, smallTitleStyle]}
          >
            {m.title}
          </Animated.Text>
          <Pressable style={styles.iconBtn} onPress={() => setNewRoomOpen(true)} hitSlop={10}>
            <HugeiconsIcon icon={Add01Icon} size={22} color={c.foreground} strokeWidth={1.9} />
          </Pressable>
        </View>
      </View>

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 120,
          paddingHorizontal: 16,
        }}
      >
        {/* Large title */}
        <Animated.View style={[styles.largeTitleWrap, largeTitleStyle]}>
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <View style={[styles.titleIcon, { backgroundColor: c.accent + '22' }]}>
                <HugeiconsIcon icon={Call02Icon} size={20} color={c.accent} strokeWidth={1.9} />
              </View>
              <Text style={[styles.largeTitle, { color: c.foreground }]}>{m.title}</Text>
              <Chip size="sm" variant="soft" color="default" style={{ marginLeft: 6 }}>
                <Chip.Label>{m.preview}</Chip.Label>
              </Chip>
            </View>
            <Text style={[styles.largeSubtitle, { color: c.muted }]}>{m.subtitle}</Text>
          </View>
        </Animated.View>

        {/* Header actions */}
        <Fade delay={40} initialY={6} style={{ marginBottom: 14 }}>
          <View style={styles.actionRow}>
            <Button size="sm" variant="primary" style={styles.actionBtn} onPress={() => setNewRoomOpen(true)}>
              <HugeiconsIcon icon={Call02Icon} size={15} color={c.accentForeground} strokeWidth={2} />
              <Button.Label>{m.newRoom}</Button.Label>
            </Button>
            <Button size="sm" variant="secondary" style={styles.actionBtn} onPress={() => setScheduleOpen(true)}>
              <HugeiconsIcon icon={Calendar01Icon} size={15} color={c.foreground} strokeWidth={2} />
              <Button.Label>{m.scheduleMeeting}</Button.Label>
            </Button>
          </View>
        </Fade>

        {/* Stage (active room) */}
        <Fade delay={80} initialY={10}>
          <Stage
            tone={c}
            m={m}
            onChat={openChat}
            onPeople={openPeople}
            micOn={micOn}
            camOn={camOn}
            shareOn={shareOn}
            setMic={() => setMicOn((v) => !v)}
            setCam={() => setCamOn((v) => !v)}
            setShare={() => setShareOn((v) => !v)}
            onLeave={() => router.back()}
          />
        </Fade>

        {/* Capabilities */}
        <Fade delay={160} initialY={10} style={{ marginTop: 14 }}>
          <View style={styles.capsRow}>
            {[m.cap1, m.cap2, m.cap3, m.cap4].map((cap) => (
              <Chip key={cap} size="sm" variant="soft" color="default">
                <Chip.Label>{cap}</Chip.Label>
              </Chip>
            ))}
          </View>
          <Text style={[styles.noteText, { color: c.muted }]}>{m.note}</Text>
        </Fade>

        {/* Upcoming */}
        <Fade delay={220} initialY={10} style={{ marginTop: 22 }}>
          <SectionHeader label={m.upcoming} tone={c} />
          <Card
            style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }}
          >
            <Card.Body style={{ gap: 8, padding: 10 }}>
              {[
                { title: m.room1Title, time: m.room1Time },
                { title: m.room2Title, time: m.room2Time },
              ].map((row) => (
                <View
                  key={row.title}
                  style={[styles.upcomingRow, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[styles.upcomingTitle, { color: c.foreground }]}>
                      {row.title}
                    </Text>
                    <Text style={[styles.upcomingMeta, { color: c.muted }]}>{row.time}</Text>
                  </View>
                  <Button size="sm" variant="primary">
                    <Button.Label>{m.join}</Button.Label>
                  </Button>
                </View>
              ))}
            </Card.Body>
          </Card>
        </Fade>

        {/* History */}
        <Fade delay={280} initialY={10} style={{ marginTop: 18 }}>
          <SectionHeader label={m.history} tone={c} />
          <Card style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: StyleSheet.hairlineWidth }}>
            <Card.Body style={{ padding: 4 }}>
              {[
                { title: m.hist1Title, meta: m.hist1Meta },
                { title: m.hist2Title, meta: m.hist2Meta },
              ].map((row, i, arr) => (
                <Pressable
                  key={row.title}
                  android_ripple={{ color: c.surfaceSecondary }}
                  style={[
                    styles.historyRow,
                    i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.separator },
                  ]}
                >
                  <View style={[styles.historyIcon, { backgroundColor: c.accent + '1A' }]}>
                    <HugeiconsIcon icon={Call02Icon} size={14} color={c.accent} strokeWidth={1.8} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[styles.historyTitle, { color: c.foreground }]}>
                      {row.title}
                    </Text>
                    <Text style={[styles.historyMeta, { color: c.muted }]}>{row.meta}</Text>
                  </View>
                </Pressable>
              ))}
            </Card.Body>
          </Card>
        </Fade>
      </Animated.ScrollView>

      {/* Sheets */}
      <ChatSheet open={chatOpen} onOpenChange={setChatOpen} tone={c} m={m} cc={cc} cancelLabel={t.common.cancel} />
      <PeopleSheet open={peopleOpen} onOpenChange={setPeopleOpen} tone={c} m={m} cancelLabel={t.common.cancel} />
      <NewRoomSheet open={newRoomOpen} onOpenChange={setNewRoomOpen} tone={c} m={m} cancelLabel={t.common.cancel} />
      <ScheduleSheet open={scheduleOpen} onOpenChange={setScheduleOpen} tone={c} m={m} cancelLabel={t.common.cancel} />
    </View>
  );
}

/* ─── Section header ───────────────────────────────────────────────────── */

function SectionHeader({ label, tone }: { label: string; tone: SemanticTheme }) {
  return (
    <Text style={[styles.sectionLabel, { color: tone.muted }]}>{label}</Text>
  );
}

/* ─── Stage card ───────────────────────────────────────────────────────── */

function Stage({
  tone,
  m,
  onChat,
  onPeople,
  micOn,
  camOn,
  shareOn,
  setMic,
  setCam,
  setShare,
  onLeave,
}: {
  tone: SemanticTheme;
  m: ReturnType<typeof useI18n>['t']['meetings'];
  onChat: () => void;
  onPeople: () => void;
  micOn: boolean;
  camOn: boolean;
  shareOn: boolean;
  setMic: () => void;
  setCam: () => void;
  setShare: () => void;
  onLeave: () => void;
}) {
  /* Live pulse */
  const livePulse = useSharedValue(1);
  useEffect(() => {
    livePulse.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 800, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 800, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [livePulse]);
  const livePulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: livePulse.value }],
    opacity: interpolate(livePulse.value, [1, 1.25], [0.85, 0]),
  }));

  return (
    <Card
      style={{
        backgroundColor: tone.surface,
        borderColor: tone.border,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
      }}
    >
      <Card.Header style={styles.stageHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Card.Title style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>
              {m.stageLabel}
            </Card.Title>
            <Text style={[styles.stageHint, { color: tone.muted }]}>{m.stageHint}</Text>
          </View>
        </View>
        {/* Live badge */}
        <View style={[styles.liveBadge, { borderColor: tone.accent + '55', backgroundColor: tone.accent + '14' }]}>
          <View style={{ width: 8, height: 8, justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View
              style={[
                { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: tone.accent },
                livePulseStyle,
              ]}
            />
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: tone.accent }} />
          </View>
          <Text style={[styles.liveBadgeText, { color: tone.accent }]}>
            {m.participants}: {PARTICIPANTS.length}
          </Text>
        </View>
      </Card.Header>

      {/* Stage */}
      <View
        style={[
          styles.stageBody,
          {
            backgroundColor: tone.surfaceSecondary,
            borderTopColor: tone.border,
            borderTopWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        {/* ambient gradient */}
        <LinearGradient
          colors={[tone.accent + '14', 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Tiles */}
        <View style={styles.tilesGrid}>
          {PARTICIPANTS.map((p, i) => (
            <Animated.View
              key={p.initials}
              entering={FadeInDown.delay(60 + i * 40).springify().damping(22).stiffness(260)}
              style={[styles.tile, { backgroundColor: tone.surface, borderColor: tone.border }]}
            >
              <View style={[styles.tileAvatar, { backgroundColor: p.color }]}>
                <Text style={styles.tileInitials}>{p.initials}</Text>
              </View>
              <Text numberOfLines={1} style={[styles.tileName, { color: tone.foreground }]}>
                {p.name}
              </Text>
            </Animated.View>
          ))}
        </View>

        {/* Dock */}
        <View style={styles.dockWrap} pointerEvents="box-none">
          <ControlDock
            tone={tone}
            m={m}
            micOn={micOn}
            camOn={camOn}
            shareOn={shareOn}
            setMic={setMic}
            setCam={setCam}
            setShare={setShare}
            onChat={onChat}
            onPeople={onPeople}
            onLeave={onLeave}
          />
        </View>
      </View>
    </Card>
  );
}

/* ─── Control dock ────────────────────────────────────────────────────── */

function ControlDock({
  tone,
  m,
  micOn,
  camOn,
  shareOn,
  setMic,
  setCam,
  setShare,
  onChat,
  onPeople,
  onLeave,
}: {
  tone: SemanticTheme;
  m: ReturnType<typeof useI18n>['t']['meetings'];
  micOn: boolean;
  camOn: boolean;
  shareOn: boolean;
  setMic: () => void;
  setCam: () => void;
  setShare: () => void;
  onChat: () => void;
  onPeople: () => void;
  onLeave: () => void;
}) {
  const items: { icon: typeof Mic01Icon; active: boolean; onPress: () => void; label: string }[] = [
    { icon: micOn ? Mic01Icon : MicOff01Icon, active: micOn, onPress: setMic, label: m.mute },
    { icon: VideoReplayIcon, active: camOn, onPress: setCam, label: m.video },
    { icon: ComputerScreenShareIcon, active: shareOn, onPress: setShare, label: m.share },
    { icon: BubbleChatIcon, active: false, onPress: onChat, label: m.chat },
    { icon: UserGroup02Icon, active: false, onPress: onPeople, label: m.people },
    { icon: MoreVerticalIcon, active: false, onPress: () => { }, label: m.more },
  ];

  return (
    <View style={[styles.dock, { backgroundColor: tone.scheme === 'dark' ? '#0008' : '#fffc', borderColor: tone.border }]}>
      {IOS_GLASS && (
        <GlassView
          glassEffectStyle="regular"
          colorScheme={tone.scheme}
          style={[StyleSheet.absoluteFill, { borderRadius: 22 }]}
        />
      )}
      {items.map((it, i) => (
        <DockButton
          key={i}
          tone={tone}
          icon={it.icon}
          active={it.active}
          onPress={it.onPress}
          label={it.label}
        />
      ))}
      {/* Leave — red emphasis */}
      <Pressable
        accessibilityLabel={m.leave}
        onPress={onLeave}
        style={[styles.dockLeaveBtn, { backgroundColor: tone.danger }]}
        android_ripple={{ color: '#ffffff44', borderless: true, radius: 24 }}
      >
        <HugeiconsIcon icon={CallEnd02Icon} size={18} color="#fff" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

function DockButton({
  tone,
  icon,
  active,
  onPress,
  label,
}: {
  tone: SemanticTheme;
  icon: typeof Mic01Icon;
  active: boolean;
  onPress: () => void;
  label: string;
}) {
  const progress = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, { damping: 16, stiffness: 260 });
  }, [active, progress]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [tone.surfaceSecondary + '00', tone.accent + '26']),
  }));
  const iconColor = active ? tone.accent : tone.foreground;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={styles.dockBtn}
      android_ripple={{ color: tone.surfaceSecondary, borderless: true, radius: 22 }}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 18 }, bgStyle]} />
      <HugeiconsIcon icon={icon} size={18} color={iconColor} strokeWidth={1.9} />
    </Pressable>
  );
}

/* ─── Chat Sheet ─────────────────────────────────────────────────────── */

function ChatSheet({
  open,
  onOpenChange,
  tone,
  m,
  cc,
  cancelLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tone: SemanticTheme;
  m: ReturnType<typeof useI18n>['t']['meetings'];
  cc: ReturnType<typeof useI18n>['t']['chats'];
  cancelLabel: string;
}) {
  const [rows, setRows] = useState<MeetingChatRow[]>(() => [
    { id: 'seed-a', from: 'peer', text: m.chatMock1 },
    { id: 'seed-b', from: 'self', text: m.chatMock2 },
  ]);
  const [draft, setDraft] = useState('');

  const hasDraft = draft.trim().length > 0;
  const sendProgress = useSharedValue(0);
  useEffect(() => {
    sendProgress.value = withSpring(hasDraft ? 1 : 0, { damping: 16, stiffness: 280 });
  }, [hasDraft, sendProgress]);
  const sendBgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      sendProgress.value,
      [0, 1],
      [tone.surfaceTertiary, tone.accent],
    ),
  }));

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setRows((prev) => [...prev, { id: `local-${Date.now()}`, from: 'self', text }]);
    setDraft('');
  };

  return (
    <BottomSheet isOpen={open} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={['60%', '90%']} backgroundClassName="rounded-t-[28px]">
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetHeaderIcon, { backgroundColor: tone.accent + '22' }]}>
              <HugeiconsIcon icon={BubbleChatIcon} size={18} color={tone.accent} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <BottomSheet.Title style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>
                {m.chatTitle}
              </BottomSheet.Title>
              <BottomSheet.Description style={{ color: tone.muted, fontSize: SigmaTypo.caption }}>
                {m.room1Title}
              </BottomSheet.Description>
            </View>
            <Pressable
              onPress={() => onOpenChange(false)}
              style={[styles.sheetCloseBtn, { backgroundColor: tone.surfaceSecondary }]}
              accessibilityLabel={cancelLabel}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} color={tone.foreground} strokeWidth={1.9} />
            </Pressable>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 10 }}
            showsVerticalScrollIndicator={false}
          >
            {rows.map((row) => {
              const isSelf = row.from === 'self';
              return (
                <Animated.View
                  key={row.id}
                  entering={
                    row.id.startsWith('local-')
                      ? FadeInDown.springify().damping(20).stiffness(260)
                      : FadeIn.duration(180)
                  }
                  layout={LinearTransition.springify().damping(22)}
                  exiting={FadeOut.duration(100)}
                  style={[
                    styles.chatRow,
                    isSelf ? { justifyContent: 'flex-end' } : undefined,
                  ]}
                >
                  {!isSelf && (
                    <View style={[styles.chatAvatar, { backgroundColor: '#8b5cf6' }]}>
                      <Text style={styles.chatAvatarInitials}>M</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.chatBubble,
                      isSelf
                        ? { backgroundColor: tone.accent, borderTopRightRadius: 6 }
                        : { backgroundColor: tone.surfaceSecondary, borderTopLeftRadius: 6 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chatBubbleText,
                        { color: isSelf ? tone.accentForeground : tone.foreground },
                      ]}
                    >
                      {row.text}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </ScrollView>

          <View style={[styles.sheetInputRow, { borderTopColor: tone.border }]}>
            <Input
              variant="secondary"
              style={{ flex: 1 }}
              value={draft}
              onChangeText={setDraft}
              placeholder={cc.typeMessage}
              placeholderTextColor={tone.muted}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <Pressable
              accessibilityLabel={cc.send}
              onPress={send}
              disabled={!hasDraft}
              style={styles.sheetSendWrap}
            >
              <Animated.View style={[styles.sheetSendBtn, sendBgStyle]}>
                <HugeiconsIcon
                  icon={SentIcon}
                  size={17}
                  color={hasDraft ? '#fff' : tone.muted}
                  strokeWidth={2.2}
                />
              </Animated.View>
            </Pressable>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

/* ─── People Sheet ───────────────────────────────────────────────────── */

function PeopleSheet({
  open,
  onOpenChange,
  tone,
  m,
  cancelLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tone: SemanticTheme;
  m: ReturnType<typeof useI18n>['t']['meetings'];
  cancelLabel: string;
}) {
  return (
    <BottomSheet isOpen={open} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={['55%', '90%']} backgroundClassName="rounded-t-[28px]">
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetHeaderIcon, { backgroundColor: tone.accent + '22' }]}>
              <HugeiconsIcon icon={UserGroup02Icon} size={18} color={tone.accent} strokeWidth={1.9} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <BottomSheet.Title style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>
                {m.peopleSheetTitle}
              </BottomSheet.Title>
              <BottomSheet.Description style={{ color: tone.muted, fontSize: SigmaTypo.caption }}>
                {m.peopleSheetSubtitle}
              </BottomSheet.Description>
            </View>
            <Pressable
              onPress={() => onOpenChange(false)}
              style={[styles.sheetCloseBtn, { backgroundColor: tone.surfaceSecondary }]}
              accessibilityLabel={cancelLabel}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={16} color={tone.foreground} strokeWidth={1.9} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 8, paddingBottom: 20 }}>
            {PARTICIPANTS.map((p, i) => (
              <Animated.View
                key={p.initials}
                entering={FadeInDown.delay(40 + i * 40).springify()}
                style={[styles.peopleRow, { backgroundColor: tone.surfaceSecondary, borderColor: tone.border }]}
              >
                <View style={[styles.peopleAvatar, { backgroundColor: p.color }]}>
                  <Text style={styles.peopleInitials}>{p.initials}</Text>
                </View>
                <Text style={[styles.peopleName, { color: tone.foreground }]}>{p.name}</Text>
              </Animated.View>
            ))}
          </ScrollView>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

/* ─── New Room Sheet ─────────────────────────────────────────────────── */

function NewRoomSheet({
  open,
  onOpenChange,
  tone,
  m,
  cancelLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tone: SemanticTheme;
  m: ReturnType<typeof useI18n>['t']['meetings'];
  cancelLabel: string;
}) {
  const [name, setName] = useState('');

  return (
    <BottomSheet
      isOpen={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setName('');
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={['45%']} backgroundClassName="rounded-t-[28px]">
          <View style={{ paddingTop: 4, paddingBottom: 16, gap: 14 }}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetHeaderIcon, { backgroundColor: tone.accent + '22' }]}>
                <HugeiconsIcon icon={Call02Icon} size={18} color={tone.accent} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <BottomSheet.Title style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>
                  {m.newRoomDialogTitle}
                </BottomSheet.Title>
                <BottomSheet.Description style={{ color: tone.muted, fontSize: SigmaTypo.caption }}>
                  {m.newRoomDialogDesc}
                </BottomSheet.Description>
              </View>
              <Pressable
                onPress={() => onOpenChange(false)}
                style={[styles.sheetCloseBtn, { backgroundColor: tone.surfaceSecondary }]}
                accessibilityLabel={cancelLabel}
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
              <Description>{m.newRoomDialogDesc}</Description>
            </TextField>

            <View style={styles.sheetFooter}>
              <Button variant="secondary" size="sm" onPress={() => onOpenChange(false)} style={{ flex: 1 }}>
                <Button.Label>{cancelLabel}</Button.Label>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onPress={() => onOpenChange(false)}
                style={{ flex: 1 }}
                isDisabled={!name.trim()}
              >
                <Button.Label>{m.newRoomSubmit}</Button.Label>
              </Button>
            </View>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

/* ─── Schedule Sheet ─────────────────────────────────────────────────── */

const TIME_SUGGESTIONS = ['09:00', '11:00', '13:30', '15:00', '16:30', '18:00'];
const DATE_SUGGESTIONS = (t: ReturnType<typeof useI18n>['t']) => [
  { key: 'today', label: t.common.today },
  { key: 'tomorrow', label: t.common.today + ' +1' },
];

function ScheduleSheet({
  open,
  onOpenChange,
  tone,
  m,
  cancelLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tone: SemanticTheme;
  m: ReturnType<typeof useI18n>['t']['meetings'];
  cancelLabel: string;
}) {
  const { t } = useI18n();
  const [date, setDate] = useState<string>(t.common.today);
  const [time, setTime] = useState<string>('09:00');
  const [title, setTitle] = useState('');

  return (
    <BottomSheet
      isOpen={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setTitle('');
        }
      }}
    >
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content snapPoints={['70%']} backgroundClassName="rounded-t-[28px]">
          <View style={{ paddingTop: 4, paddingBottom: 20, gap: 14 }}>
            <View style={styles.sheetHeader}>
              <View style={[styles.sheetHeaderIcon, { backgroundColor: tone.accent + '22' }]}>
                <HugeiconsIcon icon={Calendar01Icon} size={18} color={tone.accent} strokeWidth={1.9} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <BottomSheet.Title style={{ color: tone.foreground, fontSize: SigmaTypo.headline, fontWeight: '700' }}>
                  {m.scheduleDialogTitle}
                </BottomSheet.Title>
                <BottomSheet.Description style={{ color: tone.muted, fontSize: SigmaTypo.caption }}>
                  {m.scheduleDialogDesc}
                </BottomSheet.Description>
              </View>
              <Pressable
                onPress={() => onOpenChange(false)}
                style={[styles.sheetCloseBtn, { backgroundColor: tone.surfaceSecondary }]}
                accessibilityLabel={cancelLabel}
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

            <View style={{ gap: 8 }}>
              <Label>{m.scheduleDateLabel}</Label>
              <View style={styles.pillRow}>
                {DATE_SUGGESTIONS(t).map((d) => {
                  const selected = d.label === date;
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => setDate(d.label)}
                      style={[
                        styles.suggestChip,
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
              <View style={styles.pillRow}>
                {TIME_SUGGESTIONS.map((tm) => {
                  const selected = tm === time;
                  return (
                    <Pressable
                      key={tm}
                      onPress={() => setTime(tm)}
                      style={[
                        styles.suggestChip,
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

            <View style={styles.sheetFooter}>
              <Button variant="secondary" size="sm" onPress={() => onOpenChange(false)} style={{ flex: 1 }}>
                <Button.Label>{cancelLabel}</Button.Label>
              </Button>
              <Button variant="primary" size="sm" onPress={() => onOpenChange(false)} style={{ flex: 1 }}>
                <Button.Label>{m.scheduleSubmit}</Button.Label>
              </Button>
            </View>
          </View>
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}

/* ─── styles ─────────────────────────────────────────────────────────── */

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
    marginLeft: 4,
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

/* Keep trivial refs so unused-import warnings don't spam the build. */
const _sentinels = { withDelay };
void _sentinels;
