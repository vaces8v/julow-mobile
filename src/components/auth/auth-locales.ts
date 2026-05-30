export type AuthMode = 'login' | 'register';

export type AuthLocKey =
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
  | 'or'
  | 'oauthGoogle'
  | 'oauthYandex'
  | 'oauthGithub'
  | 'noAccount'
  | 'registerAction'
  | 'haveAccount'
  | 'signInAction'
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
  | 'authError'
  | 'invalidCredentials'
  | 'heroTagline1'
  | 'heroTagline2'
  | 'heroTagline3'
  | 'heroTagline4';

export const AUTH_LOCALES: Record<'en' | 'ru' | 'de', Record<AuthLocKey, string>> = {
  ru: {
    loginTitle: 'С возвращением',
    loginSubtitle: 'Войдите в рабочее пространство Julow',
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
    or: 'или',
    oauthGoogle: 'Google',
    oauthYandex: 'Яндекс',
    oauthGithub: 'GitHub',
    noAccount: 'Нет аккаунта?',
    registerAction: 'Регистрация',
    haveAccount: 'Уже есть аккаунт?',
    signInAction: 'Войти',
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
    toastOauthSoon: 'Скоро',
    authError: 'Ошибка авторизации',
    invalidCredentials: 'Неверный email или пароль',
    heroTagline1: 'Управляй проектами',
    heroTagline2: 'Команда в одном месте',
    heroTagline3: 'Задачи без хаоса',
    heroTagline4: 'Работа в едином ритме',
  },
  en: {
    loginTitle: 'Welcome back',
    loginSubtitle: 'Sign in to your Julow workspace',
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
    or: 'or',
    oauthGoogle: 'Google',
    oauthYandex: 'Yandex',
    oauthGithub: 'GitHub',
    noAccount: 'No account?',
    registerAction: 'Register',
    haveAccount: 'Already have an account?',
    signInAction: 'Sign in',
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
    invalidCredentials: 'Incorrect email or password',
    heroTagline1: 'Manage projects with clarity',
    heroTagline2: 'Your team in one place',
    heroTagline3: 'Tasks without chaos',
    heroTagline4: 'Work in sync',
  },
  de: {
    loginTitle: 'Willkommen zurück',
    loginSubtitle: 'Melden Sie sich bei Ihrem Julow-Workspace an',
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
    or: 'oder',
    oauthGoogle: 'Google',
    oauthYandex: 'Yandex',
    oauthGithub: 'GitHub',
    noAccount: 'Kein Konto?',
    registerAction: 'Registrieren',
    haveAccount: 'Bereits registriert?',
    signInAction: 'Anmelden',
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
    invalidCredentials: 'E-Mail oder Passwort ist falsch',
    heroTagline1: 'Projekte im Griff behalten',
    heroTagline2: 'Team an einem Ort',
    heroTagline3: 'Aufgaben ohne Chaos',
    heroTagline4: 'Im Einklang arbeiten',
  },
};
