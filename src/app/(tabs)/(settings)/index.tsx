import { HeaderBlurBackground } from '@/components/header-blur-background';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'expo-router';
import { useWorkspace } from '@/contexts/workspace-context';
import { usePushNotificationsPreference } from '@/contexts/push-notifications-context';
import { useCollapsibleHeaderScroll } from '@/hooks/use-collapsible-header-scroll';
import { useCollapsibleHeaderStyles } from '@/hooks/use-collapsible-header-styles';
import { useCollapsibleRefreshControl } from '@/hooks/use-collapsible-refresh-control';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n, type Locale } from '@/i18n/context';
import {
  api,
  type ProfilePayload,
  type SessionPayload,
  type UserPayload,
  type WorkspaceMemberPayload,
  type WorkspacePayload,
} from '@/lib/api';
import { getLightRaisedCardStyle } from '@/lib/theme-surfaces';
import {
  Logout01Icon,
  BookOpen02Icon,
  Notification01Icon,
  PaintBrush01Icon,
  QrCodeScanIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Button, Switch as ThemedSwitch } from 'heroui-native';
import { BlurTargetView } from 'expo-blur';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Appearance,
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Section = 'general' | 'account' | 'members';
type SaveState = 'idle' | 'saving' | 'ok' | 'error';

const TABS: ReadonlyArray<{ id: Section; labelKey: 'generalTitle' | 'accountTitle' | 'membersTitle' }> = [
  { id: 'general', labelKey: 'generalTitle' },
  { id: 'account', labelKey: 'accountTitle' },
  { id: 'members', labelKey: 'membersTitle' },
];

function initialsFrom(value: string) {
  const parts = value.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { t, locale, setLocale } = useI18n();
  const s = t.settings;
  const scheme = useColorScheme();
  const { user, logout } = useAuth();
  const { activeWorkspaceId, workspaces, refreshAll } = useWorkspace();
  const blurTargetRef = useRef<View>(null);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Section>('general');
  const [darkMode, setDarkMode] = useState(scheme === 'dark');
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true;
    if (showLoading) setProfileLoading(true);
    try {
      const payload = await api.getMyProfile();
      setProfile(payload);
    } catch {
      setProfile(null);
    } finally {
      if (showLoading) setProfileLoading(false);
    }
  }, []);

  const { scrollRef, headerProgress, scrollHandler, resetScroll } = useCollapsibleHeaderScroll('settings');

  const activeWorkspace: WorkspacePayload | undefined = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId],
  );

  const shownName =
    profile?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    '—';

  useEffect(() => {
    setDarkMode(scheme === 'dark');
  }, [scheme]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tabPress', (tab) => {
      if (tab === '(settings)') resetScroll();
    });
    return () => sub.remove();
  }, [resetScroll]);

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    api.getMyProfile()
      .then((payload) => { if (!cancelled) setProfile(payload); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshAll(), loadProfile({ showLoading: false })]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAll, loadProfile]);

  const refreshControl = useCollapsibleRefreshControl({ refreshing, onRefresh, c });

  const handleDarkModeChange = (val: boolean) => {
    setDarkMode(val);
    Appearance.setColorScheme(val ? 'dark' : 'light');
  };

  const HEADER_H = insets.top + 54;
  const { headerBgStyle, smallTitleStyle: headerTitleStyle, largeTitleStyle } =
    useCollapsibleHeaderStyles(headerProgress);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.fixedHeader, { height: HEADER_H, paddingTop: insets.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, headerBgStyle]} pointerEvents="none">
          <HeaderBlurBackground blurTargetRef={blurTargetRef} />
          <View style={[styles.headerBorder, { backgroundColor: c.border }]} />
        </Animated.View>
        <View style={styles.headerContent} pointerEvents="box-none">
          <Animated.Text style={[styles.headerTitleSmall, { color: c.foreground }, headerTitleStyle]}>
            {s.title}
          </Animated.Text>
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }} collapsable={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.ScrollView
            ref={scrollRef}
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{
              paddingTop: insets.top + 10,
              paddingBottom: insets.bottom + 100,
              paddingHorizontal: 20,
            }}
            refreshControl={refreshControl}
          >
            <Animated.View style={[styles.largeTitleWrap, largeTitleStyle]}>
              <Text style={[styles.largeTitle, { color: c.foreground }]}>{s.title}</Text>
              <Text style={[styles.largeSubtitle, { color: c.muted }]}>{s.subtitle}</Text>
            </Animated.View>

            <Fade delay={0} initialY={8} style={{ marginBottom: 16 }}>
              <View
                style={[
                  styles.card,
                  c.scheme === 'light'
                    ? getLightRaisedCardStyle(c)
                    : { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                <View style={styles.profileRow}>
                  <View style={[styles.avatarLarge, { backgroundColor: c.accent + '22' }]}>
                    <Text style={[styles.avatarLetter, { color: c.accent }]}>
                      {profileLoading ? '…' : initialsFrom(shownName)}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.userName, { color: c.foreground }]} numberOfLines={1}>
                      {profileLoading ? '…' : shownName}
                    </Text>
                    <Text style={[styles.userEmail, { color: c.muted }]} numberOfLines={1}>
                      {user?.email ?? 'user@julow.app'}
                    </Text>
                  </View>
                </View>
              </View>
            </Fade>

            <Fade delay={20} initialY={6} style={styles.qrScanWrap}>
              <Button variant="primary" onPress={() => router.push('/qr-scan')}>
                <HugeiconsIcon icon={QrCodeScanIcon} size={18} color={c.accentForeground} strokeWidth={2} />
                <Button.Label>{s.scanQrLogin}</Button.Label>
              </Button>
            </Fade>

            <Fade delay={25} initialY={6} style={{ marginBottom: 16 }}>
              <Pressable
                onPress={() => router.push('/docs')}
                style={[
                  styles.docsRow,
                  c.scheme === 'light'
                    ? getLightRaisedCardStyle(c)
                    : { backgroundColor: c.surface, borderColor: c.border },
                ]}>
                <View style={[styles.sectionIconWrap, { backgroundColor: c.accent + '18' }]}>
                  <HugeiconsIcon icon={BookOpen02Icon} size={16} color={c.accent} strokeWidth={1.8} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.docsTitle, { color: c.foreground }]}>{t.docs.title}</Text>
                  <Text style={[styles.docsDesc, { color: c.muted }]}>{t.docs.subtitle}</Text>
                </View>
                <Text style={[styles.docsChevron, { color: c.muted }]}>›</Text>
              </Pressable>
            </Fade>

            <Fade delay={30} initialY={6} style={{ marginBottom: 16 }}>
              <View style={[styles.tabBar, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                {TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <Pressable
                      key={tab.id}
                      onPress={() => setActiveTab(tab.id)}
                      style={[
                        styles.tabItem,
                        isActive && { backgroundColor: c.surface, borderColor: c.border },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tabLabel,
                          { color: isActive ? c.foreground : c.muted },
                          isActive && { fontWeight: '700' },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {s[tab.labelKey]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Fade>

            <Fade delay={50} initialY={6} key={activeTab}>
              <View
                style={[
                  styles.panel,
                  c.scheme === 'light'
                    ? { ...getLightRaisedCardStyle(c), borderWidth: 1 }
                    : { backgroundColor: c.surface, borderColor: c.border },
                ]}
              >
                {activeTab === 'general' && (
                  <GeneralSection
                    workspaceName={activeWorkspace?.name ?? ''}
                    workspaceId={activeWorkspaceId}
                    locale={locale}
                    setLocale={setLocale}
                    darkMode={darkMode}
                    onDarkModeChange={handleDarkModeChange}
                    onRefreshWorkspaces={refreshAll}
                  />
                )}
                {activeTab === 'account' && (
                  <AccountSection
                    authEmail={user?.email}
                    initialProfile={profile}
                    onProfileUpdated={setProfile}
                  />
                )}
                {activeTab === 'members' && (
                  <MembersSection workspaceId={activeWorkspaceId} />
                )}
              </View>
            </Fade>

            <Fade delay={90} initialY={6} style={{ marginTop: 24, marginBottom: 8 }}>
              <Pressable
                onPress={() => logout()}
                style={[styles.logoutBtn, { backgroundColor: c.danger + '12', borderColor: c.danger + '30' }]}
              >
                <HugeiconsIcon icon={Logout01Icon} size={18} color={c.danger} strokeWidth={1.8} />
                <Text style={[styles.logoutText, { color: c.danger }]}>{s.signOut}</Text>
              </Pressable>
            </Fade>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </BlurTargetView>
    </View>
  );
}

function GeneralSection({
  workspaceName,
  workspaceId,
  locale,
  setLocale,
  darkMode,
  onDarkModeChange,
  onRefreshWorkspaces,
}: {
  workspaceName: string;
  workspaceId: string;
  locale: Locale;
  setLocale: (l: Locale) => void;
  darkMode: boolean;
  onDarkModeChange: (v: boolean) => void;
  onRefreshWorkspaces: () => Promise<void>;
}) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const s = t.settings;

  const [name, setName] = useState(workspaceName);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    setName(workspaceName);
    setSaveState('idle');
  }, [workspaceId, workspaceName]);

  const dirty =
    Boolean(workspaceId) &&
    name.trim() !== workspaceName &&
    name.trim().length >= 3;

  const handleSave = async () => {
    if (!workspaceId || !dirty) return;
    setSaveState('saving');
    try {
      await api.updateWorkspaceInfo(workspaceId, { name: name.trim() });
      await onRefreshWorkspaces();
      setSaveState('ok');
    } catch {
      setSaveState('error');
    }
  };

  return (
    <View style={styles.sectionBody}>
      <SectionIntro title={s.generalTitle} desc={s.generalDesc} />

      <Field label={s.workspaceName}>
        <StyledInput
          value={name}
          onChangeText={setName}
          editable={Boolean(workspaceId)}
          maxLength={100}
          autoCapitalize="words"
        />
      </Field>

      <Field label={s.language}>
        <View style={[styles.langPicker, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
          {(['en', 'ru', 'de'] as const).map((l, i, arr) => (
            <React.Fragment key={l}>
              <Pressable onPress={() => setLocale(l)} style={styles.langRow}>
                <Text style={[styles.langLabel, { color: c.foreground }]}>
                  {l === 'en' ? s.langEn : l === 'ru' ? s.langRu : s.langDe}
                </Text>
                {locale === l && (
                  <View style={[styles.langCheck, { backgroundColor: c.accent }]}>
                    <Text style={styles.langCheckText}>✓</Text>
                  </View>
                )}
              </Pressable>
              {i < arr.length - 1 && <Divider color={c.border} />}
            </React.Fragment>
          ))}
        </View>
      </Field>

      <View style={[styles.sectionDivider, { backgroundColor: c.separator }]} />

      <View style={styles.sectionLabel}>
        <View style={[styles.sectionIconWrap, { backgroundColor: c.accent + '18' }]}>
          <HugeiconsIcon icon={Notification01Icon} size={13} color={c.accent} strokeWidth={1.8} />
        </View>
        <Text style={[styles.sectionTitle, { color: c.muted }]}>{s.notifTitle.toUpperCase()}</Text>
      </View>

      <PushNotificationsSwitchRow />

      <View style={[styles.sectionDivider, { backgroundColor: c.separator }]} />

      <View style={styles.sectionLabel}>
        <View style={[styles.sectionIconWrap, { backgroundColor: c.accent + '18' }]}>
          <HugeiconsIcon icon={PaintBrush01Icon} size={13} color={c.accent} strokeWidth={1.8} />
        </View>
        <Text style={[styles.sectionTitle, { color: c.muted }]}>{s.appearance.toUpperCase()}</Text>
      </View>

      <SwitchRow
        title={s.darkMode}
        desc={s.darkModeDesc}
        value={darkMode}
        onChange={onDarkModeChange}
      />

      <SaveRow
        label={saveState === 'saving' ? s.saving : s.saveChanges}
        disabled={!dirty || saveState === 'saving'}
        onPress={handleSave}
        state={saveState}
        okText={s.saved}
        errText={s.saveFailed}
      />
    </View>
  );
}

function AccountSection({
  authEmail,
  initialProfile,
  onProfileUpdated,
}: {
  authEmail?: string;
  initialProfile: ProfilePayload | null;
  onProfileUpdated: (p: ProfilePayload) => void;
}) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const s = t.settings;

  const [user, setUser] = useState<UserPayload | null>(null);
  const [profile, setProfile] = useState<ProfilePayload | null>(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile?.displayName ?? '');
  const [bio, setBio] = useState(initialProfile?.bio ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [sessions, setSessions] = useState<SessionPayload[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    setProfile(initialProfile);
    setDisplayName(initialProfile?.displayName ?? '');
    setBio(initialProfile?.bio ?? '');
  }, [initialProfile]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getMe().catch(() => null), api.getMyProfile().catch(() => null)])
      .then(([userPayload, profilePayload]) => {
        if (cancelled) return;
        if (userPayload) setUser(userPayload);
        if (profilePayload) {
          setProfile(profilePayload);
          setDisplayName(profilePayload.displayName ?? '');
          setBio(profilePayload.bio ?? '');
          onProfileUpdated(profilePayload);
        }
      });
    return () => { cancelled = true; };
  }, [onProfileUpdated]);

  useEffect(() => {
    let cancelled = false;
    setSessionsLoading(true);
    api.getActiveSessions()
      .then((list) => { if (!cancelled) setSessions(list); })
      .catch(() => { if (!cancelled) setSessions([]); })
      .finally(() => { if (!cancelled) setSessionsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const email = user?.email ?? authEmail ?? '';
  const dirty =
    displayName !== (profile?.displayName ?? '') ||
    bio !== (profile?.bio ?? '');

  const handleSave = async () => {
    if (!dirty) return;
    setSaveState('saving');
    try {
      await api.updatePersonalInfo({
        displayName: displayName !== (profile?.displayName ?? '') ? displayName : undefined,
        bio: bio !== (profile?.bio ?? '') ? bio : undefined,
      });
      const fresh = await api.getMyProfile().catch(() => profile);
      if (fresh) {
        setProfile(fresh);
        onProfileUpdated(fresh);
      }
      setSaveState('ok');
    } catch {
      setSaveState('error');
    }
  };

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await api.terminateSession(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
    } finally {
      setRevokingId(null);
    }
  };

  const previewName = displayName.trim() || email.split('@')[0] || '—';

  return (
    <View style={styles.sectionBody}>
      <SectionIntro title={s.accountTitle} desc={s.accountDesc} />

      <View style={styles.profilePreview}>
        <View style={[styles.avatarMedium, { backgroundColor: c.accent + '18' }]}>
          <Text style={[styles.avatarLetterMedium, { color: c.accent }]}>
            {initialsFrom(previewName)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.previewName, { color: c.foreground }]} numberOfLines={1}>
            {previewName}
          </Text>
          <Text style={[styles.previewEmail, { color: c.muted }]} numberOfLines={1}>
            {email || '—'}
          </Text>
        </View>
      </View>

      <View style={[styles.sectionDivider, { backgroundColor: c.separator }]} />

      <Field label={s.profileDisplayName} hint={s.profileDisplayNameHint}>
        <StyledInput
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={255}
          placeholder={email.split('@')[0] ?? ''}
          autoCapitalize="words"
        />
      </Field>

      <Field label={s.profileEmail}>
        <StyledInput value={email} editable={false} />
      </Field>

      <Field label={s.profileBio} hint={s.profileBioHint}>
        <StyledInput
          value={bio}
          onChangeText={setBio}
          maxLength={500}
          placeholder={s.profileBioHint}
          multiline
          numberOfLines={4}
          style={{ minHeight: 96, textAlignVertical: 'top', paddingTop: 12 }}
        />
      </Field>

      <SaveRow
        label={saveState === 'saving' ? s.saving : s.saveChanges}
        disabled={!dirty || saveState === 'saving'}
        onPress={handleSave}
        state={saveState}
        okText={s.saved}
        errText={s.saveFailed}
      />

      <View style={[styles.sectionDivider, { backgroundColor: c.separator }]} />

      <Text style={[styles.sectionTitle, { color: c.muted, paddingHorizontal: 0 }]}>
        {s.sessionsTitle.toUpperCase()}
      </Text>

      {sessionsLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={c.accent} />
          <Text style={[styles.loadingText, { color: c.muted }]}>{t.common.loading}</Text>
        </View>
      )}

      {!sessionsLoading && sessions.length === 0 && (
        <Text style={[styles.emptyText, { color: c.muted }]}>{s.sessionsEmpty}</Text>
      )}

      {!sessionsLoading && sessions.map((session) => {
        const device = session.deviceInfo?.trim() || s.sessionDeviceUnknown;
        const created = new Date(session.createdAt);
        const dateLabel = Number.isNaN(created.getTime()) ? '' : created.toLocaleString();
        return (
          <View
            key={session.id}
            style={[styles.sessionRow, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.sessionDevice, { color: c.foreground }]} numberOfLines={1}>
                {device}
              </Text>
              <Text style={[styles.sessionMeta, { color: c.muted }]} numberOfLines={1}>
                {session.ipAddress}{dateLabel ? ` · ${dateLabel}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => handleRevoke(session.id)}
              disabled={revokingId === session.id}
              style={[styles.revokeBtn, { borderColor: c.border, backgroundColor: c.surface }]}
            >
              <Text style={[styles.revokeText, { color: c.foreground }]}>
                {revokingId === session.id ? s.sessionRevoking : s.sessionRevoke}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

function MembersSection({ workspaceId }: { workspaceId: string }) {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const s = t.settings;

  const [members, setMembers] = useState<WorkspaceMemberPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.getWorkspaceMembers(workspaceId)
      .then((payload) => { if (!cancelled) setMembers(payload); })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId]);

  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const name = m.displayName ?? m.userId;
      return name.toLowerCase().includes(q) || m.userId.toLowerCase().includes(q);
    });
  }, [members, query]);

  return (
    <View style={styles.sectionBody}>
      <SectionIntro title={s.membersTitle} desc={s.membersDesc} />

      <StyledInput
        value={query}
        onChangeText={setQuery}
        placeholder={s.membersSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={c.accent} />
          <Text style={[styles.loadingText, { color: c.muted }]}>{t.common.loading}</Text>
        </View>
      )}

      {!loading && filteredMembers.length === 0 && (
        <Text style={[styles.emptyText, { color: c.muted }]}>{s.membersEmpty}</Text>
      )}

      {!loading && filteredMembers.map((member) => {
        const name = member.displayName ?? member.userId;
        return (
          <View
            key={member.id}
            style={[styles.memberRow, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}
          >
            <View style={[styles.avatarSmall, { backgroundColor: c.accent + '14' }]}>
              <Text style={[styles.avatarLetterSmall, { color: c.accent }]}>
                {initialsFrom(name)}
              </Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.memberName, { color: c.foreground }]} numberOfLines={1}>
                {name}
              </Text>
              <Text style={[styles.memberMeta, { color: c.muted }]} numberOfLines={1}>
                {member.userId}
              </Text>
            </View>
            <Text style={[styles.memberStatus, { color: c.muted }]}>
              {member.isActive ? s.memberActive : s.memberInactive}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function SectionIntro({ title, desc }: { title: string; desc: string }) {
  const c = useSemanticTheme();
  return (
    <View style={styles.sectionIntro}>
      <Text style={[styles.panelTitle, { color: c.foreground }]}>{title}</Text>
      <Text style={[styles.panelDesc, { color: c.muted }]}>{desc}</Text>
    </View>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const c = useSemanticTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.foreground }]}>{label}</Text>
      {children}
      {!!hint && <Text style={[styles.fieldHint, { color: c.muted }]}>{hint}</Text>}
    </View>
  );
}

function StyledInput({
  style,
  editable = true,
  ...props
}: React.ComponentProps<typeof TextInput> & { editable?: boolean }) {
  const c = useSemanticTheme();
  return (
    <TextInput
      {...props}
      editable={editable}
      placeholderTextColor={c.muted}
      keyboardAppearance={c.scheme === 'dark' ? 'dark' : 'light'}
      style={[
        styles.input,
        {
          color: c.foreground,
          borderColor: c.border,
          backgroundColor: editable ? c.surfaceSecondary : c.surfaceTertiary,
          opacity: editable ? 1 : 0.85,
        },
        style,
      ]}
    />
  );
}

function SaveRow({
  label,
  disabled,
  onPress,
  state,
  okText,
  errText,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  state: SaveState;
  okText: string;
  errText: string;
}) {
  const c = useSemanticTheme();
  return (
    <View style={styles.saveRow}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.saveBtn,
          { backgroundColor: disabled ? c.default : c.accent },
        ]}
      >
        <Text style={[styles.saveBtnText, { color: disabled ? c.muted : c.accentForeground }]}>
          {label}
        </Text>
      </Pressable>
      {state === 'ok' && <Text style={[styles.statusOk, { color: c.success }]}>{okText}</Text>}
      {state === 'error' && <Text style={[styles.statusErr, { color: c.danger }]}>{errText}</Text>}
    </View>
  );
}

function PushNotificationsSwitchRow() {
  const { t } = useI18n();
  const s = t.settings;
  const p = s.push;
  const { isPushEnabled, permissionState, isBusy, setPushEnabled } = usePushNotificationsPreference();

  const desc =
    permissionState === 'denied'
      ? p.deniedDesc
      : permissionState === 'undetermined'
        ? p.undeterminedDesc
        : p.desc;

  return (
    <SwitchRow
      title={p.title}
      desc={desc}
      value={isPushEnabled}
      disabled={isBusy}
      onChange={(next) => void setPushEnabled(next)}
    />
  );
}

function SwitchRow({
  title,
  desc,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  desc?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const c = useSemanticTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.foreground }]}>{title}</Text>
        {!!desc && <Text style={[styles.rowDesc, { color: c.muted }]}>{desc}</Text>}
      </View>
      <ThemedSwitch isSelected={value} onSelectedChange={onChange} isDisabled={disabled} />
    </View>
  );
}

function Divider({ color }: { color: string }) {
  return <View style={[styles.divider, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  headerBorder: { position: 'absolute', bottom: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  headerContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  headerTitleSmall: { fontSize: SigmaTypo.headline, fontWeight: '700' },

  largeTitleWrap: { marginBottom: 16 },
  largeTitle: { fontSize: SigmaTypo.largeTitle, fontWeight: '800', letterSpacing: -0.5 },
  largeSubtitle: { marginTop: 4, fontSize: SigmaTypo.bodySmall, fontWeight: '500', lineHeight: 20 },

  card: {
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '800' },
  userName: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  userEmail: { fontSize: SigmaTypo.caption, fontWeight: '500', marginTop: 2 },

  tabBar: {
    flexDirection: 'row',
    gap: 3,
    padding: 3,
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  tabItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: SigmaRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabLabel: {
    width: '100%',
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '600',
    textAlign: 'center',
  },

  panel: {
    borderRadius: SigmaRadius.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionBody: { padding: 16, gap: 16 },
  sectionIntro: { gap: 4 },
  panelTitle: { fontSize: SigmaTypo.headline, fontWeight: '700' },
  panelDesc: { fontSize: SigmaTypo.bodySmall, fontWeight: '500', lineHeight: 20 },

  field: { gap: 8 },
  fieldLabel: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  fieldHint: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', lineHeight: 16 },

  input: {
    borderWidth: 1,
    borderRadius: SigmaRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: SigmaTypo.bodySmall,
    fontWeight: '500',
  },

  langPicker: { borderWidth: 1, borderRadius: SigmaRadius.md, overflow: 'hidden' },
  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14 },
  langLabel: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  langCheck: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  langCheckText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  sectionDivider: { height: StyleSheet.hairlineWidth },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionIconWrap: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: SigmaTypo.captionSmall, fontWeight: '700', letterSpacing: 0.5 },

  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 12 },
  rowTitle: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  rowDesc: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 2, lineHeight: 16 },

  saveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingTop: 4 },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: SigmaRadius.md },
  saveBtnText: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  statusOk: { fontSize: SigmaTypo.captionSmall, fontWeight: '600' },
  statusErr: { fontSize: SigmaTypo.captionSmall, fontWeight: '600' },

  profilePreview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarMedium: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarLetterMedium: { fontSize: 16, fontWeight: '800' },
  previewName: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  previewEmail: { fontSize: SigmaTypo.caption, fontWeight: '500', marginTop: 2 },

  qrScanWrap: { alignItems: 'center', marginBottom: 16 },

  docsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
  },
  docsTitle: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  docsDesc: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 2, lineHeight: 16 },
  docsChevron: { fontSize: 22, fontWeight: '300' },

  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: SigmaRadius.md,
    borderWidth: 1,
  },
  sessionDevice: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  sessionMeta: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 2 },
  revokeBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: SigmaRadius.sm, borderWidth: 1 },
  revokeText: { fontSize: SigmaTypo.captionSmall, fontWeight: '700' },

  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: SigmaRadius.md,
    borderWidth: 1,
  },
  avatarSmall: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarLetterSmall: { fontSize: 12, fontWeight: '800' },
  memberName: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  memberMeta: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 2 },
  memberStatus: { fontSize: SigmaTypo.captionSmall, fontWeight: '600' },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  loadingText: { fontSize: SigmaTypo.bodySmall, fontWeight: '500' },
  emptyText: { fontSize: SigmaTypo.bodySmall, fontWeight: '500', paddingVertical: 8 },

  divider: { height: StyleSheet.hairlineWidth },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: SigmaRadius.lg,
    borderWidth: 1,
  },
  logoutText: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
});
