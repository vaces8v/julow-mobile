import {
  AUTH_LOCALES,
  type AuthLocKey,
  type AuthMode,
} from '@/components/auth/auth-locales';
import { AuthBrandHeader } from '@/components/auth/auth-brand-header';
import { AUTH_SHEET, AuthFormSheet, type AuthFormSheetHandle } from '@/components/auth/auth-form-sheet';
import { AuthHeadline } from '@/components/auth/auth-headline';
import { AuthOAuthSection, type OAuthProvider } from '@/components/auth/auth-oauth-section';
import { useAuth } from '@/contexts/auth-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { getLoginErrorMessage } from '@/lib/api-client';
import { OAuthFlowError } from '@/lib/oauth';

import { ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Button,
  Checkbox,
  ControlField,
  FieldError,
  Input,
  Label,
  TextField,
  Toast,
  useToast,
} from 'heroui-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

interface AuthErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  acceptTerms?: string;
}

function validateAuthForm(
  mode: AuthMode,
  email: string,
  password: string,
  confirmPassword: string,
  acceptTerms: boolean,
  L: (k: AuthLocKey) => string,
): AuthErrors {
  const errs: AuthErrors = {};
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const theme = useSemanticTheme();
  const { locale } = useI18n();
  const { login, register, loginWithOAuth } = useAuth();
  const { toast } = useToast();
  const sheetRef = useRef<AuthFormSheetHandle>(null);

  const dict = AUTH_LOCALES[locale];
  const L = useCallback((k: AuthLocKey) => dict[k], [dict]);

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [headlineTransitioning, setHeadlineTransitioning] = useState(false);

  const errors = useMemo(
    () => validateAuthForm(mode, email, password, confirmPassword, acceptTerms, L),
    [mode, email, password, confirmPassword, acceptTerms, L],
  );

  const showError = useCallback((k: keyof AuthErrors) => touched[k] && errors[k], [touched, errors]);

  const showToast = useCallback(
    (variant: 'success' | 'danger' | 'default', title: string, desc?: string) => {
      toast.show({
        component: (props) => (
          <Toast {...props} variant={variant as 'success' | 'danger' | 'default'}>
            <Toast.Title>{title}</Toast.Title>
            {!!desc && <Toast.Description>{desc}</Toast.Description>}
          </Toast>
        ),
        duration: 3200,
      });
    },
    [toast],
  );

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();
    setTouched({ email: true, password: true, confirmPassword: true, acceptTerms: true });
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    try {
      const e = email.trim();
      if (mode === 'register') {
        await register(e, password);
        await login(e, password, true);
      } else {
        await login(e, password, true);
      }

      showToast('success', mode === 'register' ? L('toastAccountCreated') : L('toastWelcome'));
    } catch (err: unknown) {
      const msg = getLoginErrorMessage(err, {
        fallback: L('authError'),
        invalidCredentials: L('invalidCredentials'),
      });
      showToast('danger', L('authError'), msg);
    } finally {
      setLoading(false);
    }
  }, [errors, email, password, mode, register, login, showToast, L]);

  const applyMode = useCallback((next: AuthMode) => {
    setMode(next);
    setTouched({});
    setConfirmPassword('');
    setAcceptTerms(false);
    setHeadlineTransitioning(false);
  }, []);

  const onSheetSwitchStart = useCallback(() => {
    setHeadlineTransitioning(true);
  }, []);

  const requestModeSwitch = useCallback(
    (next: AuthMode) => {
      if (next === mode) return;
      sheetRef.current?.animateSwitch(next);
    },
    [mode],
  );

  const toggleMode = useCallback(() => {
    requestModeSwitch(mode === 'login' ? 'register' : 'login');
  }, [mode, requestModeSwitch]);

  const handleOAuth = useCallback(
    async (provider: OAuthProvider) => {
      if (loading) return;
      setLoading(true);
      try {
        await loginWithOAuth(provider);
        showToast('success', L('toastWelcome'));
      } catch (err: unknown) {
        if (err instanceof OAuthFlowError && err.code === 'cancelled') {
          return;
        }
        const msg =
          err instanceof OAuthFlowError
            ? err.message
            : getLoginErrorMessage(err, {
                fallback: L('authError'),
                invalidCredentials: L('invalidCredentials'),
              });
        showToast('danger', L('authError'), msg);
      } finally {
        setLoading(false);
      }
    },
    [loading, loginWithOAuth, showToast, L],
  );

  const sheetSurface = theme.surfaceSecondary;
  const sheetDefaultRatio =
    mode === 'login' ? AUTH_SHEET.loginDefaultRatio : AUTH_SHEET.registerDefaultRatio;

  const formBody = (
    <View key={mode} style={styles.formInner}>
      <TextField isInvalid={!!showError('email')} className="gap-1.5">
        <Label>{L('email')}</Label>
        <Input
          variant="secondary"
          value={email}
          onChangeText={setEmail}
          onBlur={() => setTouched((p) => ({ ...p, email: true }))}
          placeholder={L('placeholderEmail')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          editable={!loading}
          returnKeyType="next"
          placeholderTextColor={theme.muted}
        />
        {showError('email') && <FieldError>{errors.email}</FieldError>}
      </TextField>

      <TextField isInvalid={!!showError('password')} className="gap-1.5 mt-3">
        <Label>{L('password')}</Label>
        <View style={styles.pwdRow}>
          <Input
            variant="secondary"
            value={password}
            onChangeText={setPassword}
            onBlur={() => setTouched((p) => ({ ...p, password: true }))}
            placeholder={L('placeholderPassword')}
            secureTextEntry={!showPwd}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            editable={!loading}
            returnKeyType={mode === 'register' ? 'next' : 'done'}
            onSubmitEditing={mode === 'register' ? undefined : handleSubmit}
            placeholderTextColor={theme.muted}
            style={styles.pwdInput}
          />
          <Pressable
            onPress={() => setShowPwd((v) => !v)}
            hitSlop={10}
            accessibilityLabel={showPwd ? L('hidePassword') : L('showPassword')}
            style={styles.eyeBtn}
          >
            <HugeiconsIcon
              icon={showPwd ? ViewOffIcon : ViewIcon}
              size={18}
              color={theme.muted}
              strokeWidth={1.7}
            />
          </Pressable>
        </View>
        {showError('password') && <FieldError>{errors.password}</FieldError>}
        {mode === 'login' && (
          <Pressable onPress={() => showToast('default', L('toastOauthSoon'))} style={styles.forgotBtn}>
            <Text style={[styles.forgotText, { color: theme.accent }]}>{L('forgotPassword')}</Text>
          </Pressable>
        )}
      </TextField>

      {mode === 'register' && (
        <>
          <TextField isInvalid={!!showError('confirmPassword')} className="gap-1.5 mt-3">
            <Label>{L('confirmPassword')}</Label>
            <Input
              variant="secondary"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
              placeholder={L('placeholderConfirm')}
              secureTextEntry={!showPwd}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              placeholderTextColor={theme.muted}
            />
            {showError('confirmPassword') && <FieldError>{errors.confirmPassword}</FieldError>}
          </TextField>

          <ControlField
            isSelected={acceptTerms}
            onSelectedChange={(selected) => {
              setAcceptTerms(selected);
              setTouched((p) => ({ ...p, acceptTerms: true }));
            }}
            isInvalid={!!showError('acceptTerms')}
            className="flex-row items-center gap-3 mt-3"
          >
            <ControlField.Indicator variant="checkbox">
              <Checkbox />
            </ControlField.Indicator>
            <Text style={[styles.termsText, { color: theme.foreground }]}>{L('acceptTerms')}</Text>
          </ControlField>
          {showError('acceptTerms') && <FieldError className="mt-1">{errors.acceptTerms}</FieldError>}
        </>
      )}

      <View style={styles.submitWrap}>
        <Button variant="primary" onPress={handleSubmit} isDisabled={loading} style={styles.submitBtn}>
          {loading ? (
            <ActivityIndicator color={theme.accentForeground} />
          ) : (
            <Button.Label>{mode === 'login' ? L('signIn') : L('signUp')}</Button.Label>
          )}
        </Button>
      </View>

      <AuthOAuthSection
        dividerLabel={L('or')}
        googleLabel={L('oauthGoogle')}
        yandexLabel={L('oauthYandex')}
        githubLabel={L('oauthGithub')}
        onOAuth={handleOAuth}
        foreground={theme.foreground}
        muted={theme.muted}
        border={theme.border}
        surface={theme.surface}
      />

      <Pressable onPress={toggleMode} style={styles.toggle}>
        <Text style={[styles.toggleText, { color: theme.muted }]}>
          {mode === 'login' ? L('noAccount') : L('haveAccount')}{' '}
          <Text style={[styles.toggleLink, { color: theme.accent }]}>
            {mode === 'login' ? L('registerAction') : L('signInAction')}
          </Text>
        </Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.surface }]}
      edges={['left', 'right']}
    >
      <StatusBar
        barStyle={theme.scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.surface}
      />

      <AuthBrandHeader topInset={insets.top} titleColor={theme.foreground} />

      <View style={styles.sheetHost}>
        <AuthFormSheet
          ref={sheetRef}
          expanded={false}
          defaultHeightRatio={sheetDefaultRatio}
          sheetBackground={sheetSurface}
          borderColor={theme.border}
          onSwitchStart={onSheetSwitchStart}
          onSwitchComplete={applyMode}
        >
          <KeyboardAwareScrollView
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bottomOffset={24}
            contentContainerStyle={styles.scrollContent}
          >
            <AuthHeadline
              mode={mode}
              transitioning={headlineTransitioning}
              loginTitle={L('loginTitle')}
              loginSubtitle={L('loginSubtitle')}
              registerTitle={L('registerTitle')}
              registerSubtitle={L('registerSubtitle')}
              titleColor={theme.foreground}
              subtitleColor={theme.muted}
            />
            {formBody}
          </KeyboardAwareScrollView>
        </AuthFormSheet>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  sheetHost: {
    flex: 1,
    justifyContent: 'flex-end',
    zIndex: 8,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 24,
  },
  formInner: {
    gap: 0,
  },
  pwdRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  pwdInput: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forgotBtn: { alignSelf: 'flex-end', paddingTop: 6 },
  forgotText: { fontSize: 12, fontWeight: '600' },
  termsText: { fontSize: 13, fontWeight: '500', flex: 1, lineHeight: 19 },
  submitWrap: { marginTop: 18 },
  submitBtn: { width: '100%' },
  toggle: { alignItems: 'center', paddingTop: 16, paddingBottom: 4 },
  toggleText: { fontSize: 14, fontWeight: '500' },
  toggleLink: { fontWeight: '800' },
});
