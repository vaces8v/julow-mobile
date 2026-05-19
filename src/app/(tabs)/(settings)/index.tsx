import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useAuth } from '@/contexts/auth-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  Key01Icon,
  Logout01Icon,
  PaintBrush01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Switch as ThemedSwitch } from 'heroui-native';
import { BlurTargetView, BlurView } from 'expo-blur';
import React, { useEffect, useRef, useState } from 'react';
import {
  Appearance,
  DeviceEventEmitter,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { t, locale, setLocale } = useI18n();
  const s = t.settings;
  const scheme = useColorScheme();
  const { user, logout } = useAuth();
  // Local blur target: must be a SIBLING of the BlurView, not an ancestor,
  // to avoid an Android dimezisBlurViewSdk31Plus native crash.
  const blurTargetRef = useRef<View>(null);

  const [darkMode, setDarkMode] = useState(scheme === 'dark');

  const scrollRef = useRef<Animated.ScrollView>(null);
  const scrollY = useSharedValue(0);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tabPress', (tab) => {
      if (tab === '(settings)') scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
    return () => sub.remove();
  }, []);

  const handleDarkModeChange = (val: boolean) => {
    setDarkMode(val);
    Appearance.setColorScheme(val ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await logout();
  };

  const scrollHandler = useAnimatedScrollHandler({ onScroll: e => { scrollY.value = e.contentOffset.y; } });
  const HEADER_H = insets.top + 54;

  const headerBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [10, 50], [0, 1], Extrapolation.CLAMP),
  }));
  const headerTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [30, 60], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollY.value, [30, 60], [12, 0], Extrapolation.CLAMP) }],
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
      {/* Sticky header */}
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
          <Animated.Text style={[styles.headerTitleSmall, { color: c.foreground }, headerTitleStyle]}>
            {s.title}
          </Animated.Text>
        </View>
      </View>

      <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 100, paddingHorizontal: 20 }}
      >
        {/* Large title */}
        <Animated.View style={[styles.largeTitleWrap, largeTitleStyle]}>
          <Text style={[styles.largeTitle, { color: c.foreground }]}>{s.title}</Text>
          <Text style={[styles.largeSubtitle, { color: c.muted }]}>{s.subtitle}</Text>
        </Animated.View>

        {/* User profile card */}
        <Fade delay={0} initialY={8} style={{ marginBottom: 20 }}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={styles.profileRow}>
              <View style={[styles.avatarLarge, { backgroundColor: c.accent }]}>
                <Text style={styles.avatarLetter}>
                  {(user?.email?.[0] ?? 'U').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.userName, { color: c.foreground }]}>{user?.email?.split('@')[0] ?? 'Пользователь'}</Text>
                <Text style={[styles.userEmail, { color: c.muted }]}>{user?.email ?? 'user@julow.app'}</Text>
              </View>
            </View>
          </View>
        </Fade>

        {/* Appearance — dark theme toggle */}
        <Fade delay={60} initialY={6}>
          <SectionGroup title={s.appearance} icon={PaintBrush01Icon} accent={c.accent}>
            <SwitchRow
              title={locale === 'en' ? 'Dark mode' : locale === 'de' ? 'Dunkelmodus' : 'Тёмная тема'}
              desc={locale === 'en' ? 'Dark interface' : locale === 'de' ? 'Dunkles Interface' : 'Тёмное оформление'}
              value={darkMode}
              onChange={handleDarkModeChange}
            />
          </SectionGroup>
        </Fade>

        {/* Language */}
        <Fade delay={100} initialY={6} style={{ marginTop: 16 }}>
          <SectionGroup title={s.language} icon={Key01Icon} accent='#06b6d4'>
            {(['en', 'ru', 'de'] as const).map((l, i, arr) => (
              <React.Fragment key={l}>
                <Pressable
                  onPress={() => setLocale(l)}
                  style={styles.langRow}
                >
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
          </SectionGroup>
        </Fade>

        {/* Logout */}
        <Fade delay={140} initialY={6} style={{ marginTop: 24, marginBottom: 8 }}>
          <Pressable
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: '#ef444415', borderColor: '#ef444430' }]}
          >
            <HugeiconsIcon icon={Logout01Icon} size={18} color='#ef4444' strokeWidth={1.8} />
            <Text style={styles.logoutText}>
              {locale === 'en' ? 'Sign out' : locale === 'de' ? 'Abmelden' : 'Выйти из аккаунта'}
            </Text>
          </Pressable>
        </Fade>
      </Animated.ScrollView>
      </BlurTargetView>
    </View>
  );
}

// ─── Section Group ────────────────────────────────────────────────────────────

function SectionGroup({ title, icon, accent, children }: {
  title: string; icon: any; accent: string; children: React.ReactNode;
}) {
  const c = useSemanticTheme();
  return (
    <View style={[styles.sectionWrap]}>
      <View style={styles.sectionLabel}>
        <View style={[styles.sectionIconWrap, { backgroundColor: accent + '18' }]}>
          <HugeiconsIcon icon={icon} size={13} color={accent} strokeWidth={1.8} />
        </View>
        <Text style={[styles.sectionTitle, { color: c.muted }]}>{title.toUpperCase()}</Text>
      </View>
      <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border, gap: 0, paddingHorizontal: 16, paddingVertical: 4 }]}>
        {children}
      </View>
    </View>
  );
}

// ─── Switch Row ───────────────────────────────────────────────────────────────

function SwitchRow({ title, desc, value, onChange }: {
  title: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  const c = useSemanticTheme();
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.foreground }]}>{title}</Text>
        {!!desc && <Text style={[styles.rowDesc, { color: c.muted }]}>{desc}</Text>}
      </View>
      <ThemedSwitch isSelected={value} onSelectedChange={onChange} />
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

  largeTitleWrap: { marginBottom: 20 },
  largeTitle: { fontSize: SigmaTypo.largeTitle, fontWeight: '800', letterSpacing: -0.5 },
  largeSubtitle: { marginTop: 4, fontSize: SigmaTypo.bodySmall, fontWeight: '500' },

  card: {
    borderRadius: SigmaRadius.lg, borderWidth: 1, padding: 16, overflow: 'hidden',
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#fff', fontSize: 22, fontWeight: '800' },
  userName: { fontSize: SigmaTypo.bodySmall, fontWeight: '700' },
  userEmail: { fontSize: SigmaTypo.caption, fontWeight: '500', marginTop: 2 },

  sectionWrap: { gap: 6 },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  sectionIconWrap: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: SigmaTypo.captionSmall, fontWeight: '700', letterSpacing: 0.5 },

  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rowTitle: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  rowDesc: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 2 },

  langRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  langLabel: { fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
  langCheck: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  langCheckText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  divider: { height: StyleSheet.hairlineWidth },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: SigmaRadius.lg, borderWidth: 1,
  },
  logoutText: { color: '#ef4444', fontSize: SigmaTypo.bodySmall, fontWeight: '600' },
});
