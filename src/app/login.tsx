import { useAuth } from '@/contexts/auth-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  Github01Icon,
  GoogleIcon,
  LockPasswordIcon,
  Mail01Icon,
  ViewIcon,
  ViewOffIcon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Toast, useToast } from 'heroui-native';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ────────────────────────────────────────────────────────────────────────────
// Validation — matches web schemas (julow-web/src/lib/auth/schemas.ts)
// ────────────────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

type Mode = 'login' | 'register';

interface Errors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

function validate(
  mode: Mode,
  email: string,
  password: string,
  confirmPassword: string,
  acceptTerms: boolean,
  L: (k: LocKey) => string,
): Errors {
  const errs: Errors = {};
  const e = email.trim();
  if (!e) errs.email = L('errEmailRequired');
  else if (e.length > 254) errs.email = L('errEmailLong');
  else if (!EMAIL_RE.test(e)) errs.email = L('errEmailInvalid');

  if (!password) {
    errs.password = mode === 'login' ? L('errPwdRequired') : L('errPwdMin8');
  } else if (mode === 'register') {
    if (password.length < 8) errs.password = L('errPwdMin8');
    else if (password.length > 128) errs.password = L('errPwdMax');
    else if (!/[A-Za-z]/.test(password)) errs.password = L('errPwdLetter');
    else if (!/[0-9]/.test(password)) errs.password = L('errPwdDigit');
  }

  if (mode === 'register') {
    if (!confirmPassword) errs.confirmPassword = L('errConfirmRequired');
    else if (confirmPassword !== password) errs.confirmPassword = L('errPwdMismatch');
    if (!acceptTerms) errs.acceptTerms = L('errTerms');
  }
  return errs;
}

// ────────────────────────────────────────────────────────────────────────────
// Localized strings
// ────────────────────────────────────────────────────────────────────────────

type LocKey =
  | 'loginTitle'
  | 'loginSubtitle'
  | 'registerTitle'
  | 'registerSubtitle'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'placeholderEmail'
  | 'placeholderPassword'
  | 'placeholderConfirm'
  | 'signIn'
  | 'signUp'
  | 'signingIn'
  | 'signingUp'
  | 'continueWith'
  | 'or'
  | 'noAccount'
  | 'haveAccount'
  | 'createOneFree'
  | 'signInLink'
  | 'showPassword'
  | 'hidePassword'
  | 'acceptTerms'
  | 'forgotPassword'
  | 'errEmailRequired'
  | 'errEmailInvalid'
  | 'errEmailLong'
  | 'errPwdRequired'
  | 'errPwdMin8'
  | 'errPwdMax'
  | 'errPwdLetter'
  | 'errPwdDigit'
  | 'errConfirmRequired'
  | 'errPwdMismatch'
  | 'errTerms'
  | 'toastWelcome'
  | 'toastAccountCreated'
  | 'toastOauthSoon'
  | 'authError';

const LOCALES: Record<'en' | 'ru' | 'de', Record<LocKey, string>> = {
  ru: {
    loginTitle: 'С возвращением',
    loginSubtitle: 'Войдите в свой Julow аккаунт',
    registerTitle: 'Создайте аккаунт',
    registerSubtitle: 'Начните работать с Julow за минуту',
    email: 'Email',
    password: 'Пароль',
    confirmPassword: 'Повторите пароль',
    placeholderEmail: 'you@example.com',
    placeholderPassword: '••••••••',
    placeholderConfirm: 'Повторите пароль',
    signIn: 'Войти',
    signUp: 'Зарегистрироваться',
    signingIn: 'Входим…',
    signingUp: 'Создаём…',
    continueWith: 'Продолжить с',
    or: 'или',
    noAccount: 'Нет аккаунта?',
    haveAccount: 'Уже есть аккаунт?',
    createOneFree: 'Создать бесплатно',
    signInLink: 'Войти',
    showPassword: 'Показать пароль',
    hidePassword: 'Скрыть пароль',
    acceptTerms: 'Принимаю условия использования',
    forgotPassword: 'Забыли пароль?',
    errEmailRequired: 'Введите адрес почты',
    errEmailInvalid: 'Введите корректный email',
    errEmailLong: 'Email слишком длинный',
    errPwdRequired: 'Введите пароль',
    errPwdMin8: 'Минимум 8 символов',
    errPwdMax: 'Максимум 128 символов',
    errPwdLetter: 'Должна быть хотя бы одна буква',
    errPwdDigit: 'Должна быть хотя бы одна цифра',
    errConfirmRequired: 'Подтвердите пароль',
    errPwdMismatch: 'Пароли не совпадают',
    errTerms: 'Необходимо принять условия',
    toastWelcome: 'Добро пожаловать!',
    toastAccountCreated: 'Аккаунт создан',
    toastOauthSoon: 'Скоро будет доступно',
    authError: 'Ошибка авторизации',
  },
  en: {
    loginTitle: 'Welcome back',
    loginSubtitle: 'Sign in to your Julow account',
    registerTitle: 'Create your account',
    registerSubtitle: 'Get started with Julow in a minute',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    placeholderEmail: 'you@example.com',
    placeholderPassword: '••••••••',
    placeholderConfirm: 'Repeat password',
    signIn: 'Sign in',
    signUp: 'Create account',
    signingIn: 'Signing in…',
    signingUp: 'Creating…',
    continueWith: 'Continue with',
    or: 'or',
    noAccount: 'No account?',
    haveAccount: 'Already have an account?',
    createOneFree: 'Create one free',
    signInLink: 'Sign in',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    acceptTerms: 'I accept the terms of service',
    forgotPassword: 'Forgot password?',
    errEmailRequired: 'Email is required',
    errEmailInvalid: 'Invalid email address',
    errEmailLong: 'Email is too long',
    errPwdRequired: 'Password is required',
    errPwdMin8: 'At least 8 characters',
    errPwdMax: 'Maximum 128 characters',
    errPwdLetter: 'At least one letter required',
    errPwdDigit: 'At least one digit required',
    errConfirmRequired: 'Confirm your password',
    errPwdMismatch: 'Passwords do not match',
    errTerms: 'You must accept the terms',
    toastWelcome: 'Welcome!',
    toastAccountCreated: 'Account created',
    toastOauthSoon: 'Coming soon',
    authError: 'Auth error',
  },
  de: {
    loginTitle: 'Willkommen zurück',
    loginSubtitle: 'Melden Sie sich bei Ihrem Julow-Konto an',
    registerTitle: 'Konto erstellen',
    registerSubtitle: 'Starten Sie mit Julow in einer Minute',
    email: 'E-Mail',
    password: 'Passwort',
    confirmPassword: 'Passwort bestätigen',
    placeholderEmail: 'you@example.com',
    placeholderPassword: '••••••••',
    placeholderConfirm: 'Passwort wiederholen',
    signIn: 'Anmelden',
    signUp: 'Konto erstellen',
    signingIn: 'Anmeldung…',
    signingUp: 'Erstellen…',
    continueWith: 'Weiter mit',
    or: 'oder',
    noAccount: 'Kein Konto?',
    haveAccount: 'Bereits registriert?',
    createOneFree: 'Kostenlos erstellen',
    signInLink: 'Anmelden',
    showPassword: 'Passwort zeigen',
    hidePassword: 'Passwort verbergen',
    acceptTerms: 'Ich akzeptiere die Nutzungsbedingungen',
    forgotPassword: 'Passwort vergessen?',
    errEmailRequired: 'E-Mail erforderlich',
    errEmailInvalid: 'Ungültige E-Mail',
    errEmailLong: 'E-Mail zu lang',
    errPwdRequired: 'Passwort erforderlich',
    errPwdMin8: 'Mindestens 8 Zeichen',
    errPwdMax: 'Maximal 128 Zeichen',
    errPwdLetter: 'Mindestens ein Buchstabe',
    errPwdDigit: 'Mindestens eine Ziffer',
    errConfirmRequired: 'Passwort bestätigen',
    errPwdMismatch: 'Passwörter stimmen nicht überein',
    errTerms: 'Sie müssen den Bedingungen zustimmen',
    toastWelcome: 'Willkommen!',
    toastAccountCreated: 'Konto erstellt',
    toastOauthSoon: 'Demnächst verfügbar',
    authError: 'Anmeldefehler',
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Animated gradient background ("shader" effect)
// ────────────────────────────────────────────────────────────────────────────

function AnimatedBackground({ isDark }: { isDark: boolean }) {
  // Two slowly counter-rotating gradient blobs that interpolate position/scale
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(
      withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [t]);

  const blob1Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [-60, 80]) },
      { translateY: interpolate(t.value, [0, 1], [-40, 60]) },
      { scale: interpolate(t.value, [0, 1], [1, 1.18]) },
    ],
    opacity: interpolate(t.value, [0, 0.5, 1], [0.9, 1, 0.9]),
  }));

  const blob2Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [60, -80]) },
      { translateY: interpolate(t.value, [0, 1], [30, -60]) },
      { scale: interpolate(t.value, [0, 1], [1.1, 0.95]) },
    ],
    opacity: interpolate(t.value, [0, 0.5, 1], [0.85, 1, 0.85]),
  }));

  const blob3Style = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [-30, 50]) },
      { translateY: interpolate(t.value, [0, 1], [120, 40]) },
      { scale: interpolate(t.value, [0, 1], [0.9, 1.15]) },
    ],
    opacity: interpolate(t.value, [0, 0.5, 1], [0.7, 0.95, 0.7]),
  }));

  // Light / dark palettes — bright but tasteful in light mode,
  // deep saturated in dark mode.
  const palette = isDark
    ? {
        bg: '#0a0a12',
        a: ['#6366f1', '#4f46e5'] as const,
        b: ['#ec4899', '#a855f7'] as const,
        c: ['#06b6d4', '#3b82f6'] as const,
      }
    : {
        bg: '#f5f7ff',
        a: ['#a5b4fc', '#818cf8'] as const,
        b: ['#f9a8d4', '#c4b5fd'] as const,
        c: ['#7dd3fc', '#a5b4fc'] as const,
      };

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.bg, overflow: 'hidden' }]}>
      <Animated.View style={[styles.blob, { top: -90, left: -60 }, blob1Style]}>
        <LinearGradient
          colors={palette.a}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.blob, { top: 80, right: -120 }, blob2Style]}>
        <LinearGradient
          colors={palette.b}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.blob, { top: 320, left: -40 }, blob3Style]}>
        <LinearGradient
          colors={palette.c}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Soft overlay for legibility (stronger at bottom) */}
      <LinearGradient
        colors={
          isDark
            ? ['rgba(10,10,18,0.0)', 'rgba(10,10,18,0.55)', 'rgba(10,10,18,0.92)']
            : ['rgba(245,247,255,0.0)', 'rgba(245,247,255,0.55)', 'rgba(245,247,255,0.92)']
        }
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Login screen
// ────────────────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { locale } = useI18n();
  const { login, register } = useAuth();
  const { toast } = useToast();

  const isDark = c.scheme === 'dark';
  const dict = LOCALES[locale];
  const L = (k: LocKey) => dict[k];

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const errors = useMemo(
    () => validate(mode, email, password, confirmPassword, acceptTerms, L),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, email, password, confirmPassword, acceptTerms, locale],
  );

  const showError = (k: keyof Errors) => touched[k] && errors[k];

  const showToast = (variant: 'success' | 'danger' | 'default', title: string, desc?: string) => {
    toast.show({
      component: (props) => (
        <Toast {...props} variant={variant as any}>
          <Toast.Title>{title}</Toast.Title>
          {!!desc && <Toast.Description>{desc}</Toast.Description>}
        </Toast>
      ),
      duration: 3200,
    });
  };

  const handleSubmit = async () => {
    // Mark all fields touched to surface errors
    setTouched({ email: true, password: true, confirmPassword: true, acceptTerms: true });
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const e = email.trim();
      if (mode === 'register') {
        await register(e, password);
        await login(e, password);
        showToast('success', L('toastAccountCreated'));
      } else {
        await login(e, password);
        showToast('success', L('toastWelcome'));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : L('authError');
      showToast('danger', L('authError'), msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    showToast('default', L('toastOauthSoon'), provider === 'google' ? 'Google OAuth' : 'GitHub OAuth');
  };

  const toggleMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setTouched({});
    setConfirmPassword('');
    setAcceptTerms(false);
  };

  // ──── Theme tokens ────
  const surface = isDark ? 'rgba(20,20,30,0.78)' : 'rgba(255,255,255,0.82)';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.8)';
  const inputBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.10)';
  const danger = '#ef4444';

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <AnimatedBackground isDark={isDark} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 22,
            justifyContent: 'center',
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand */}
          <Animated.View
            entering={FadeInUp.duration(500).easing(Easing.out(Easing.cubic))}
            style={{ alignItems: 'center', marginBottom: 26 }}
          >
            <View style={[styles.brandBadge, { backgroundColor: '#6366f1' }]}>
              <Text style={styles.brandLetter}>J</Text>
            </View>
            <Text style={[styles.brand, { color: isDark ? '#fff' : '#0f172a' }]}>Julow</Text>
          </Animated.View>

          {/* Card */}
          <Animated.View
            key={mode}
            entering={FadeInDown.duration(380).easing(Easing.out(Easing.cubic))}
            style={[
              styles.card,
              { backgroundColor: surface, borderColor: inputBorder },
            ]}
          >
            <Text style={[styles.title, { color: isDark ? '#fff' : '#0f172a' }]}>
              {mode === 'login' ? L('loginTitle') : L('registerTitle')}
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.6)' }]}>
              {mode === 'login' ? L('loginSubtitle') : L('registerSubtitle')}
            </Text>

            <View style={{ height: 18 }} />

            {/* Email */}
            <Field
              label={L('email')}
              icon={Mail01Icon}
              isDark={isDark}
              inputBg={inputBg}
              inputBorder={inputBorder}
              hasError={!!showError('email')}
            >
              <TextInput
                value={email}
                onChangeText={setEmail}
                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                placeholder={L('placeholderEmail')}
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.35)'}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!loading}
                style={[styles.input, { color: isDark ? '#fff' : '#0f172a' }]}
              />
            </Field>
            {showError('email') && <ErrorText msg={errors.email!} color={danger} />}

            {/* Password */}
            <View style={{ height: 12 }} />
            <Field
              label={L('password')}
              icon={LockPasswordIcon}
              isDark={isDark}
              inputBg={inputBg}
              inputBorder={inputBorder}
              hasError={!!showError('password')}
              trailing={
                <Pressable
                  onPress={() => setShowPwd((v) => !v)}
                  hitSlop={8}
                  accessibilityLabel={showPwd ? L('hidePassword') : L('showPassword')}
                  style={styles.eyeBtn}
                >
                  <HugeiconsIcon
                    icon={showPwd ? ViewOffIcon : ViewIcon}
                    size={18}
                    color={isDark ? 'rgba(255,255,255,0.65)' : 'rgba(15,23,42,0.55)'}
                    strokeWidth={1.7}
                  />
                </Pressable>
              }
            >
              <TextInput
                value={password}
                onChangeText={setPassword}
                onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                placeholder={L('placeholderPassword')}
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.35)'}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                editable={!loading}
                style={[styles.input, { color: isDark ? '#fff' : '#0f172a' }]}
                onSubmitEditing={mode === 'login' ? handleSubmit : undefined}
              />
            </Field>
            {showError('password') && <ErrorText msg={errors.password!} color={danger} />}

            {/* Confirm password (register) */}
            {mode === 'register' && (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
                <View style={{ height: 12 }} />
                <Field
                  label={L('confirmPassword')}
                  icon={LockPasswordIcon}
                  isDark={isDark}
                  inputBg={inputBg}
                  inputBorder={inputBorder}
                  hasError={!!showError('confirmPassword')}
                >
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
                    placeholder={L('placeholderConfirm')}
                    placeholderTextColor={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.35)'}
                    secureTextEntry={!showPwd}
                    autoCapitalize="none"
                    autoComplete="new-password"
                    editable={!loading}
                    style={[styles.input, { color: isDark ? '#fff' : '#0f172a' }]}
                    onSubmitEditing={handleSubmit}
                  />
                </Field>
                {showError('confirmPassword') && <ErrorText msg={errors.confirmPassword!} color={danger} />}

                {/* Terms */}
                <View style={{ height: 12 }} />
                <Pressable
                  onPress={() => {
                    setAcceptTerms((v) => !v);
                    setTouched((p) => ({ ...p, acceptTerms: true }));
                  }}
                  style={styles.termsRow}
                >
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: showError('acceptTerms') ? danger : inputBorder,
                        backgroundColor: acceptTerms ? '#6366f1' : 'transparent',
                      },
                    ]}
                  >
                    {acceptTerms && <Text style={styles.checkboxTick}>✓</Text>}
                  </View>
                  <Text style={[styles.termsText, { color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(15,23,42,0.7)' }]}>
                    {L('acceptTerms')}
                  </Text>
                </Pressable>
                {showError('acceptTerms') && <ErrorText msg={errors.acceptTerms!} color={danger} />}
              </Animated.View>
            )}

            {/* Forgot password (login only) */}
            {mode === 'login' && (
              <Pressable style={styles.forgotBtn} onPress={() => showToast('default', L('toastOauthSoon'))}>
                <Text style={[styles.forgotText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.55)' }]}>
                  {L('forgotPassword')}
                </Text>
              </Pressable>
            )}

            {/* Submit */}
            <View style={{ height: 16 }} />
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [styles.submit, pressed && { opacity: 0.85 }, loading && { opacity: 0.6 }]}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'login' ? L('signIn') : L('signUp')}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
              <Text style={[styles.dividerText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.45)' }]}>
                {L('or')}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: inputBorder }]} />
            </View>

            {/* OAuth */}
            <View style={styles.oauthRow}>
              <OAuthBtn
                label="Google"
                icon={GoogleIcon}
                isDark={isDark}
                inputBg={inputBg}
                inputBorder={inputBorder}
                onPress={() => handleOAuth('google')}
              />
              <OAuthBtn
                label="GitHub"
                icon={Github01Icon}
                isDark={isDark}
                inputBg={inputBg}
                inputBorder={inputBorder}
                onPress={() => handleOAuth('github')}
              />
            </View>

            {/* Switch mode */}
            <Pressable onPress={toggleMode} style={styles.toggle}>
              <Text style={[styles.toggleText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(15,23,42,0.55)' }]}>
                {mode === 'login' ? L('noAccount') : L('haveAccount')}{' '}
                <Text style={{ color: '#6366f1', fontWeight: '700' }}>
                  {mode === 'login' ? L('createOneFree') : L('signInLink')}
                </Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  icon,
  isDark,
  inputBg,
  inputBorder,
  hasError,
  trailing,
  children,
}: {
  label: string;
  icon: any;
  isDark: boolean;
  inputBg: string;
  inputBorder: string;
  hasError: boolean;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={[styles.label, { color: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(15,23,42,0.72)' }]}>
        {label}
      </Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: inputBg,
            borderColor: hasError ? '#ef4444' : inputBorder,
          },
        ]}
      >
        <HugeiconsIcon
          icon={icon}
          size={18}
          color={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(15,23,42,0.5)'}
          strokeWidth={1.6}
        />
        {children}
        {trailing}
      </View>
    </View>
  );
}

function ErrorText({ msg, color }: { msg: string; color: string }) {
  return (
    <Animated.Text entering={FadeIn.duration(160)} style={[styles.errorText, { color }]}>
      {msg}
    </Animated.Text>
  );
}

function OAuthBtn({
  label,
  icon,
  isDark,
  inputBg,
  inputBorder,
  onPress,
}: {
  label: string;
  icon: any;
  isDark: boolean;
  inputBg: string;
  inputBorder: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.oauthBtn,
        { backgroundColor: inputBg, borderColor: inputBorder },
        pressed && { opacity: 0.85 },
      ]}
    >
      <HugeiconsIcon
        icon={icon}
        size={18}
        color={isDark ? '#fff' : '#0f172a'}
        strokeWidth={1.6}
      />
      <Text style={[styles.oauthLabel, { color: isDark ? '#fff' : '#0f172a' }]}>{label}</Text>
    </Pressable>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    overflow: 'hidden',
    opacity: 0.9,
  },

  brandBadge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#6366f1',
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  brandLetter: { color: '#fff', fontSize: 28, fontWeight: '800' },
  brand: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },

  card: {
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { marginTop: 4, fontSize: 13, fontWeight: '500' },

  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3, marginBottom: 6, textTransform: 'uppercase' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
    includeFontPadding: false,
  },
  eyeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },

  errorText: { marginTop: 6, fontSize: 12, fontWeight: '600' },

  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxTick: { color: '#fff', fontSize: 12, fontWeight: '800' },
  termsText: { flex: 1, fontSize: 13, fontWeight: '500' },

  forgotBtn: { alignSelf: 'flex-end', paddingVertical: 6, marginTop: 4 },
  forgotText: { fontSize: 12, fontWeight: '600' },

  submit: { borderRadius: 14, overflow: 'hidden' },
  submitGradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, marginBottom: 14 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },

  oauthRow: { flexDirection: 'row', gap: 10 },
  oauthBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
  },
  oauthLabel: { fontSize: 14, fontWeight: '600' },

  toggle: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  toggleText: { fontSize: 13, fontWeight: '500' },
});
