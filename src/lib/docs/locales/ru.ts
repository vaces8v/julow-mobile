import type { DocsContent } from "../types";

export const ru: DocsContent = {
  pageTitle: "Документация",
  pageSubtitle:
    "Полное руководство пользователя Julow — веб и мобильное приложение на julow.ru для PM, тимлидов и ежедневной работы.",
  navGroups: [
    {
      label: "Старт",
      sections: ["getting-started", "auth", "navigation", "workspace", "invites", "docs-guide"],
    },
    {
      label: "Работа",
      sections: [
        "dashboard",
        "projects",
        "board-views",
        "tasks",
        "chats",
        "meetings",
        "documents",
        "search",
      ],
    },
    {
      label: "Аккаунт",
      sections: ["notifications", "profile", "settings", "analytics"],
    },
    {
      label: "Платформы",
      sections: ["web-vs-mobile", "mobile-app"],
    },
    {
      label: "Справка",
      sections: ["faq", "keyboard-shortcuts", "troubleshooting"],
    },
  ],
  sections: {
    "getting-started": {
      id: "getting-started",
      title: "Начало работы",
      description:
        "Что такое Julow, как workspace организует команду и что вы видите сразу после входа на julow.ru.",
      blocks: [
        {
          type: "p",
          text: "Julow — рабочее пространство команды: проекты, задачи, чаты, файлы и видеовстречи. Всё организовано вокруг workspace — общего контейнера команды с участниками, проектами и правами доступа.",
        },
        { type: "h2", text: "Основные понятия" },
        {
          type: "ul",
          items: [
            "Workspace — пространство команды; можно состоять в нескольких, в том числе как гость.",
            "Проект — доска с колонками workflow и задачами; часто связан с чатом проекта.",
            "Задача — элемент работы с исполнителями, приоритетом, сроком и статусом workflow.",
            "Чат — переписка в реальном времени, обычно привязана к проекту.",
            "Встреча — запланированный или мгновенный видеозвонок (LiveKit).",
            "Документ — файлы в библиотеке workspace: загрузки или вложения из чатов и задач.",
          ],
        },
        { type: "h2", text: "Production URLs (julow.ru)" },
        {
          type: "code",
          text: "Web app: https://julow.ru\nSign in: https://julow.ru/login\nDashboard: https://julow.ru/workspace\nDocumentation: https://julow.ru/docs",
        },
        { type: "h2", text: "После входа" },
        {
          type: "steps",
          items: [
            {
              title: "Веб (десктоп)",
              body: "Вы попадаете на Dashboard по адресу /workspace — метрики задач, просрочки, Quick Add и график активности за неделю из реальных данных.",
            },
            {
              title: "Мобильное приложение",
              body: "Вкладка «Главная» — сводка, быстрый доступ к встречам, колокол уведомлений и компактная аналитика при доступном API.",
            },
            {
              title: "Выбор языка",
              body: "Настройки → General → English, Русский или Deutsch. Язык сохраняется в аккаунте и применяется на вебе и в мобильном приложении.",
            },
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Веб для десктопа",
          text: "Веб рассчитан на экраны от 768px. В мобильном браузере показывается предложение установить нативное приложение вместо полного десктопного интерфейса.",
        },
        {
          type: "card",
          variant: "tip",
          title: "Чеклист первых 30 минут",
          body: "Переключитесь на нужный workspace, просмотрите Dashboard, создайте или откройте проект, добавьте задачу через Quick Add, напишите в чат проекта, закрепите проект во вкладках шапки и откройте Settings — проверьте язык и сессии.",
        },
        { type: "h2", text: "Для кого это руководство" },
        {
          type: "p",
          text: "PM могут делиться прямыми ссылками вроде /docs/invites или /docs/mobile-app при онбординге. Участники получают пошаговые пути в интерфейсе. Админам стоит сочетать документацию по сессиям с политикой устройств в компании.",
        },
      ],
    },
    auth: {
      id: "auth",
      title: "Вход и аккаунт",
      description: "Email, OAuth, QR-привязка, регистрация и управление сессиями на вебе и в мобильном приложении.",
      blocks: [
        { type: "h2", text: "Вход на вебе (/login)" },
        {
          type: "ul",
          items: [
            "Email и пароль с опцией «Запомнить меня».",
            "OAuth — Google, GitHub, Yandex и Apple, если они включены в вашем развёртывании.",
            "QR-вход — откройте /login/qr на десктопе; подтвердите из мобильного приложения.",
            "Регистрация на /register — создаёт аккаунт на personal-плане.",
          ],
        },
        { type: "h2", text: "Сценарий QR-входа" },
        {
          type: "steps",
          items: [
            { title: "На десктопе", body: "Откройте /login/qr. Появится QR-код и id сессии; они обновляются до сканирования или истечения срока." },
            { title: "На мобильном", body: "Войдите, откройте Settings, нажмите Scan QR to sign in on web и подтвердите сессию браузера." },
            { title: "Результат", body: "Вкладка веба завершит вход без ввода пароля на общей клавиатуре." },
          ],
        },
        { type: "h2", text: "Вход в мобильном приложении" },
        {
          type: "ul",
          items: [
            "Те же email/пароль и OAuth-провайдеры, что и на вебе.",
            "В Settings есть Scan QR для подтверждения ожидающей веб-сессии.",
            "Биометрия зависит от ОС — Julow сохраняет токен сессии после первого входа.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "OAuth vs пароль",
          text: "Если email зарегистрирован через OAuth, вход по паролю заблокирован — и наоборот. Julow показывает диалог с подсказкой, какой метод использовать.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Общие компьютеры",
          text: "На недоверенных десктопах предпочитайте QR-вход. После работы на публичном ПК отзовите старые сессии в Settings → Account.",
        },
        { type: "h2", text: "Сессии" },
        {
          type: "p",
          text: "Settings → Account показывает активные сессии с меткой устройства, IP и временем активности. Можно завершить любую, кроме текущей. Веб использует httpOnly cookies; мобильное приложение хранит токены для API-запросов.",
        },
      ],
    },
    navigation: {
      id: "navigation",
      title: "Навигация",
      description: "Боковая панель, вкладки в шапке, поиск и нижняя навигация на мобильном — как перемещаться без путаницы.",
      blocks: [
        { type: "h2", text: "Боковая панель веба — Main" },
        {
          type: "ul",
          items: [
            "Dashboard — /workspace",
            "Insights — /analytics",
            "Projects — /projects",
            "Chats — /chats",
            "Documents — /documents",
            "Settings — /settings",
          ],
        },
        { type: "h2", text: "Боковая панель веба — Tools" },
        {
          type: "ul",
          items: [
            "Meet — /meetings для планирования и участия в видеозвонках.",
            "Documentation — /docs (это руководство, также в разделе Tools).",
          ],
        },
        { type: "h2", text: "Шапка веба" },
        {
          type: "ul",
          items: [
            "Вкладки проектов — закреплённые проекты в стиле браузера; меню вкладки: переименовать, цвет, открепить, закрыть остальные.",
            "Search — глобальный поиск задач и проектов в активном workspace.",
            "Notifications — колокол с числом непрочитанных; «Отметить все прочитанными» в выпадающем списке.",
            "Profile — быстрые действия аккаунта, тема, язык, выход.",
          ],
        },
        { type: "h2", text: "Нижние вкладки на мобильном" },
        {
          type: "ul",
          items: [
            "Home — dashboard, вход в встречи, колокол уведомлений.",
            "Projects — список и создание проектов.",
            "Chats — список чатов workspace.",
            "Settings — профиль, workspace, push, QR-вход.",
            "Search — отдельная вкладка для проектов и задач.",
          ],
        },
        {
          type: "p",
          text: "Stack-экраны (доска проекта, чат, встречи, уведомления) открываются поверх tab bar. Вернитесь к вкладкам кнопкой «Назад» или жестом ОС.",
        },
        {
          type: "card",
          variant: "tip",
          title: "Закрепляйте проекты на вебе",
          body: "Закрепите часто используемые проекты во вкладках шапки — так можно переключать доски, оставаясь в чатах или документах.",
        },
      ],
    },
    workspace: {
      id: "workspace",
      title: "Workspace и переключение",
      description:
        "Как workspace организует команды, как переключаться между ними и как гостевые проекты из приглашений отображаются рядом с вашими.",
      blocks: [
        {
          type: "p",
          text: "Workspace — верхний контейнер команды в Julow. Аккаунт может состоять в одном или нескольких workspace. Большинство экранов — Dashboard, Insights, Documents, переименование в Settings — используют активный workspace. Проекты, куда вас пригласили, могут быть в других workspace и всё равно видны на /projects без переключения.",
        },
        { type: "h2", text: "Активный workspace" },
        {
          type: "p",
          text: "Активный workspace определяет, какие задачи попадают в Dashboard и Insights, какие файлы показываются первыми в Documents и какое имя редактируется в Settings → General. Переключение перезагружает данные workspace, сохраняя сессию.",
        },
        { type: "h2", text: "Переключение на вебе" },
        {
          type: "steps",
          items: [
            {
              title: "Откройте переключатель workspace",
              body: "В левой боковой панели используйте селектор workspace под логотипом Julow. В списке все workspace, где вы состоите, с отображаемым именем.",
            },
            {
              title: "Выберите workspace",
              body: "Нажмите другой workspace. Приложение обновит проекты, метрики dashboard и контекст настроек для этой команды.",
            },
            {
              title: "Проверьте на Dashboard",
              body: "Откройте /workspace и убедитесь, что счётчики задач и Quick Add относятся к нужной команде.",
            },
          ],
        },
        { type: "h2", text: "Переключение на мобильном" },
        {
          type: "p",
          text: "На вкладке Home нажмите имя workspace в шапке, чтобы открыть выбор. После переключения потяните вниз для обновления на Home или Settings — синхронизируются проекты и кэш задач.",
        },
        { type: "h2", text: "Гостевые и меж-workspace проекты" },
        {
          type: "ul",
          items: [
            "При приглашении в проект вы получаете доступ, не покидая домашний workspace.",
            "Страница Projects (/projects) показывает все доступные проекты, сгруппированные по имени workspace.",
            "Активный workspace отображается первым; гостевые секции — другие workspace с приглашёнными проектами.",
            "Прогресс-бары на карточках — только ваши назначенные задачи, не весь бэклог команды.",
            "Новый проект всегда создаётся в текущем активном workspace.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Почему гостевые проекты остаются видимыми",
          text: "Julow загружает все проекты через GET /projects/mine из всех workspace. Приглашённая работа появляется сразу после принятия — не нужно угадывать, в какой workspace переключиться.",
        },
        { type: "h2", text: "Переименование workspace" },
        {
          type: "p",
          text: "Settings → General позволяет владельцам переименовать активный workspace (минимум 3 символа). Изменение сохраняется на backend и обновляет подпись в боковой панели.",
        },
      ],
    },
    invites: {
      id: "invites",
      title: "Приглашения и гостевой доступ",
      description:
        "Присоединение к проектам по ссылкам или кодам, принятие из уведомлений и видимость гостевых проектов на странице Projects.",
      blocks: [
        {
          type: "p",
          text: "Julow поддерживает приглашения в проект, workspace и организацию. Чаще всего встречаются project invites — коллега делится ссылкой, и вы получаете доступ к одной доске и её чату.",
        },
        { type: "h2", text: "Точки входа для приглашений" },
        {
          type: "ul",
          items: [
            "Публичная страница — https://julow.ru/invite — вставьте полную ссылку или токен.",
            "Прямая ссылка — /invite/{token} открывает превью с именем проекта и кнопками Accept / Decline.",
            "Auth gate — /invite/auth, если нужно войти перед принятием.",
            "Dashboard Quick Join — на /workspace поле invite-code (веб и Home на мобильном).",
            "Notifications — события приглашений с Accept и Decline в панели колокола.",
          ],
        },
        { type: "h2", text: "Принятие приглашения" },
        {
          type: "steps",
          items: [
            {
              title: "Откройте ссылку или вставьте код",
              body: "Из email или чата откройте https://julow.ru/invite/… или вставьте на /invite или в поле join на Dashboard.",
            },
            {
              title: "Войдите, если потребуется",
              body: "Новые пользователи регистрируются на /register; существующие входят на /login. OAuth работает как при обычном входе.",
            },
            {
              title: "Подтвердите принятие",
              body: "На экране превью нажмите Accept. Julow добавит вас в проект и обновит список проектов.",
            },
            {
              title: "Переход к проекту",
              body: "После принятия редирект на /projects/{id}. Проект также появится в секции workspace на /projects.",
            },
          ],
        },
        { type: "h2", text: "Отклонение или игнорирование" },
        {
          type: "p",
          text: "В деталях уведомления выберите Decline — приглашение отклонено, кнопки действий исчезают. Игнорирование оставляет приглашение pending до истечения срока по политике backend.",
        },
        { type: "h2", text: "Опыт гостя" },
        {
          type: "ul",
          items: [
            "На карточках гостевых проектов показывается имя workspace-хоста.",
            "Можно чатиться, выполнять задачи, участвовать во встречах и загружать файлы согласно правам проекта.",
            "Переименование workspace и список участников в Settings относятся к активному workspace — не ко всем, где вы гость.",
            "Search и вкладки шапки включают гостевые проекты так же, как свои.",
          ],
        },
        {
          type: "callout",
          variant: "warning",
          title: "Делитесь ссылками осторожно",
          text: "Токены приглашений дают доступ к данным проекта. Отправляйте их по доверенным каналам и отзывайте доступ, удаляя участника в настройках проекта, когда человек покидает команду.",
        },
      ],
    },
    dashboard: {
      id: "dashboard",
      title: "Dashboard (главная)",
      description:
        "Домашний экран /workspace — живые метрики, Quick Add, лента активности, графики и присоединение по invite-code.",
      blocks: [
        {
          type: "p",
          text: "Dashboard — landing page после входа на /workspace (sidebar: Dashboard). Сводка по задачам активного workspace из реальных данных backend — не заглушки.",
        },
        { type: "h2", text: "Карточки сводки" },
        {
          type: "ul",
          items: [
            "Всего задач, назначенных вам в активном workspace.",
            "Overdue — задачи с просроченным сроком, не в колонке done workflow.",
            "In progress — задачи в категориях active или review workflow.",
            "Completion rate — доля ваших назначенных задач в статусе done.",
          ],
        },
        { type: "h2", text: "Quick Add" },
        {
          type: "steps",
          items: [
            {
              title: "Введите название задачи",
              body: "Используйте поле Quick Add в верхней части Dashboard.",
            },
            {
              title: "Выберите проект",
              body: "Выберите из проектов активного workspace. Задача создаётся со статусом workflow по умолчанию.",
            },
            {
              title: "Отправьте",
              body: "Enter или Add. Счётчики и графики обновятся при следующей загрузке данных.",
            },
          ],
        },
        { type: "h2", text: "График активности за неделю" },
        {
          type: "p",
          text: "Area chart показывает созданные и завершённые задачи за последние 7 дней по timestamp в workspace. Подсказки при наведении — точные числа по дням.",
        },
        { type: "h2", text: "Недавняя активность" },
        {
          type: "p",
          text: "Прокручиваемый список событий задач (создание, завершение) с относительным временем. Клик по строке открывает задачу на доске через /projects/{projectId}?task={taskId}.",
        },
        { type: "h2", text: "Присоединение по invite-code" },
        {
          type: "p",
          text: "На Dashboard компактное поле invite-code. Вставьте токен или полный URL — Julow разберёт токен и выполнит тот же flow, что /invite/{token}. На Home мобильного — тот же паттерн.",
        },
        { type: "h2", text: "Вкладка Home на мобильном" },
        {
          type: "ul",
          items: [
            "Похожие stat chips и графики при доступных данных analytics API.",
            "Карточки встреч — быстрый доступ к запланированным и мгновенным звонкам.",
            "Колокол уведомлений открывает /notifications.",
            "Переключатель workspace в шапке.",
            "Pull to refresh перезагружает кэш проектов и задач.",
          ],
        },
        {
          type: "card",
          variant: "tip",
          title: "Ежедневный ритуал PM",
          body: "Утром начинайте с Dashboard: проверьте overdue, просмотрите недельный график на просадки throughput, добавьте capture-задачи через Quick Add, откройте закреплённые вкладки проектов для standup.",
        },
      ],
    },
    projects: {
      id: "projects",
      title: "Проекты",
      description: "Создание проектов, статус и прогресс, kanban-доски и переключатели видов на мобильном.",
      blocks: [
        {
          type: "p",
          text: "Проекты принадлежат workspace. Вы видите все проекты — свои и приглашённые, включая гостевой доступ в других workspace.",
        },
        { type: "h2", text: "Список проектов (/projects)" },
        {
          type: "ul",
          items: [
            "Карточки по workspace со статусами: Active, Paused, Archived, Completed.",
            "Progress bar — доля ваших задач в колонках done workflow.",
            "Create project — диалог с именем и описанием в активном workspace.",
          ],
        },
        { type: "h2", text: "Доска проекта (/projects/{id})" },
        {
          type: "steps",
          items: [
            { title: "Kanban-колонки", body: "Колонки из workflow проекта (To do, In progress, Review, Done и т.д.). Перетаскивайте карточки между колонками." },
            { title: "Карточка задачи", body: "Клик по карточке — название, описание, исполнители, приоритет, срок и статус." },
            { title: "Вкладки шапки", body: "Закрепите проект для быстрого переключения из чатов или документов без потери контекста." },
          ],
        },
        { type: "h2", text: "Проекты на мобильном" },
        {
          type: "p",
          text: "Вкладка Projects показывает те же данные. Нажмите карточку — доска с переключателем Board, List или Gantt сверху.",
        },
        { type: "h2", text: "Создание проекта" },
        {
          type: "steps",
          items: [
            {
              title: "Откройте /projects",
              body: "Create project на вебе или кнопка добавления на вкладке Projects на мобильном.",
            },
            {
              title: "Введите имя и описание",
              body: "Имя обязательно. Описание опционально, но помогает команде понять scope.",
            },
            {
              title: "Подтвердите",
              body: "Проект создаётся в активном workspace и появляется в первой секции списка.",
            },
          ],
        },
        { type: "h2", text: "Бейджи статуса" },
        {
          type: "ul",
          items: [
            "Active — рабочее состояние по умолчанию.",
            "Paused — временно на паузе; задачи остаются, команда сигнализирует о снижении velocity.",
            "Archived — в основном для чтения, скрыт из типовых flow.",
            "Completed — delivery завершён; полезно для portfolio-отчётности.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Видимость между workspace",
          text: "Не нужно переключать workspace, чтобы видеть приглашённые проекты. Они отображаются под именем host workspace на той же странице /projects.",
        },
      ],
    },
    "board-views": {
      id: "board-views",
      title: "Доска, список и Gantt",
      description:
        "Переключение между kanban, табличным списком и timeline Gantt на вебе и в мобильном приложении.",
      blocks: [
        {
          type: "p",
          text: "Каждая доска проекта поддерживает несколько представлений одних и тех же задач. Смена вида не меняет данные — только layout и паттерны взаимодействия.",
        },
        { type: "h2", text: "Переключатель видов" },
        {
          type: "ul",
          items: [
            "Board — колонки соответствуют статусам workflow; перетаскивание карточек на вебе.",
            "List — табличные секции по статусам с колонками приоритета и срока на вебе.",
            "Gantt — полосы timeline по start/due с zoom на вебе и мобильном.",
          ],
        },
        { type: "h2", text: "Веб — /projects/{id}" },
        {
          type: "steps",
          items: [
            {
              title: "Откройте проект",
              body: "С /projects или закреплённой вкладки шапки перейдите на доску проекта.",
            },
            {
              title: "Выберите режим",
              body: "Иконки Board / List / Gantt в панели инструментов проекта под шапкой.",
            },
            {
              title: "Drag-and-drop на доске",
              body: "Перетащите карточку в другую колонку. Julow PATCHит workflow status_id, привязанный к колонке.",
            },
            {
              title: "Zoom Gantt",
              body: "Плюс/минус меняют масштаб timeline (50%–200%). Горизонтальная прокрутка для длинных диапазонов.",
            },
          ],
        },
        { type: "h2", text: "Мобильный — экран проекта" },
        {
          type: "p",
          text: "Нажмите проект на вкладке Projects. Иконки сверху переключают Board, List и Gantt. Детали задачи — в bottom sheet; комментарии на task/[id]/comments. Pull to refresh синхронизирует доску.",
        },
        { type: "h2", text: "Действия панели проекта" },
        {
          type: "ul",
          items: [
            "Add task — диалог создания (веб) или bottom sheet (мобильный).",
            "Search within project — фильтр видимых карточек по названию.",
            "Settings — имя, описание, цвет, архив проекта (диалог на вебе).",
            "Members — просмотр и управление участниками (диалог на вебе).",
            "Pin to header — добавляет проект во вкладки шапки веб-оболочки.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Колонки workflow vs вид",
          text: "Имена колонок из конфигурации workflow проекта (To do, In progress, Review, Done и т.д.). List и Gantt группируют задачи по тем же категориям статусов, что и доска.",
        },
      ],
    },
    tasks: {
      id: "tasks",
      title: "Задачи",
      description: "Колонки workflow, quick add, детали задачи, комментарии, приоритеты и deep links.",
      blocks: [
        {
          type: "p",
          text: "Задачи — атомарная единица работы в Julow. Каждая задача принадлежит одному проекту и движется по колонкам workflow, заданным для проекта.",
        },
        { type: "h2", text: "Статусы workflow" },
        {
          type: "p",
          text: "Каждый проект задаёт колонки workflow с категориями: todo, in_progress, review, done, blocked, cancelled. Done означает категорию колонки done — не отдельное legacy-поле. Backend хранит status_id (UUID) на строку workflow status.",
        },
        { type: "h3", text: "Значения категорий" },
        {
          type: "ul",
          items: [
            "todo — не начата; по умолчанию для новых задач.",
            "in_progress — в активной работе.",
            "review — ожидает QA, code review или approval.",
            "done — завершена; учитывается в velocity и completion rate.",
            "blocked — нельзя продолжить; часто с комментарием о причине.",
            "cancelled — не будет выполнена; исключена из активного планирования.",
          ],
        },
        { type: "h2", text: "Приоритеты" },
        {
          type: "ul",
          items: [
            "critical — наивысшая срочность; красный индикатор на карточках.",
            "high — оранжевый индикатор.",
            "medium — янтарный индикатор по умолчанию.",
            "low — приглушённый индикатор.",
            "none — без точки приоритета, если не задан.",
          ],
        },
        { type: "h2", text: "Quick Add на Dashboard" },
        {
          type: "p",
          text: "На /workspace введите название в Quick Add и выберите проект. Dashboard показывает totals, overdue, completion rate и недельный график из реальных задач.",
        },
        { type: "h2", text: "Создание задач на доске" },
        {
          type: "steps",
          items: [
            {
              title: "Откройте проект",
              body: "Перейдите на /projects/{id} или закреплённую вкладку шапки.",
            },
            {
              title: "Add task",
              body: "Add в колонке (веб) или плюс (мобильный). Опционально выберите статус колонки заранее.",
            },
            {
              title: "Заполните детали",
              body: "Название обязательно. В панели деталей задайте исполнителей, приоритет, срок, описание и labels.",
            },
          ],
        },
        { type: "h2", text: "Детали задачи" },
        {
          type: "ul",
          items: [
            "Поля: title, description, assignees, priority, due date, start date (Gantt), workflow status, labels.",
            "Тред комментариев с текстом и файловыми вложениями.",
            "Deep link: /projects/{projectId}?task={taskId} — используется уведомлениями и поиском.",
            "Мобильный: с доски или списка; комментарии на экране task/[id]/comments.",
          ],
        },
        { type: "h2", text: "Комментарии и вложения" },
        {
          type: "p",
          text: "Комментарии поддерживают текст и загрузку файлов. Вложения показывают иконки типа и ссылки для скачивания. Уведомления о комментариях ведут к задаче при клике из панели колокола.",
        },
        { type: "h2", text: "Поиск" },
        {
          type: "p",
          text: "Search в шапке веба и вкладка Search на мобильном ищут задачи и проекты по названию (и labels на вебе) в доступных workspace.",
        },
      ],
    },
    chats: {
      id: "chats",
      title: "Чаты",
      description: "Командная переписка в реальном времени, вложения и split-layout на десктопе.",
      blocks: [
        {
          type: "p",
          text: "Чаты используют WebSocket. Пока чат открыт и помечен активным, дубликаты уведомлений для этого треда подавляются.",
        },
        { type: "h2", text: "Список чатов (/chats)" },
        {
          type: "ul",
          items: [
            "Чаты проектов показывают цвет и имя проекта.",
            "Бейджи непрочитанных обновляются при новых сообщениях.",
            "Search фильтрует список по названию чата.",
          ],
        },
        { type: "h2", text: "Переписка" },
        {
          type: "ul",
          items: [
            "Отправка текста; вставленные URL становятся кликабельными ссылками.",
            "Вложения; изображения и видео inline с лёгким video player.",
            "Десктоп: resizable split — список слева, тред справа.",
          ],
        },
        { type: "h2", text: "Чаты на мобильном" },
        {
          type: "p",
          text: "Откройте Chats, нажмите строку для /chat/{id}. Pull to refresh; счётчики непрочитанных синхронизируются с backend.",
        },
      ],
    },
    meetings: {
      id: "meetings",
      title: "Встречи",
      description: "Планирование звонков, мгновенные комнаты и управление в звонке (LiveKit).",
      blocks: [
        {
          type: "p",
          text: "На вебе: Tools → Meet (/meetings). На мобильном — ярлыки на Home или stack-экран meetings.",
        },
        { type: "h2", text: "Список встреч" },
        {
          type: "ul",
          items: [
            "Статусы: Draft, Scheduled, In progress, Completed, Cancelled.",
            "Фильтр по проекту; планирование с title, date, time и опциональной привязкой к проекту.",
            "New room — мгновенный ad-hoc звонок, к которому можно подключиться сразу.",
          ],
        },
        { type: "h2", text: "Внутри звонка" },
        {
          type: "ul",
          items: [
            "Комната веба: /meetings/{id}/room — микрофон, камера, screen share, выход.",
            "Комната мобильного: meetings/[id]/room с теми же базовыми элементами управления.",
            "Picture-in-picture на вебе — Julow остаётся доступен, пока звонок в плавающем окне.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "LiveKit",
          text: "Качество звонка зависит от развёртывания LiveKit и сети. Для screen share используйте проводной интернет или стабильный Wi‑Fi.",
        },
      ],
    },
    documents: {
      id: "documents",
      title: "Документы",
      description: "Файловая библиотека workspace на вебе; preview-состояние на мобильном.",
      blocks: [
        { type: "h2", text: "Веб — /documents" },
        {
          type: "ul",
          items: [
            "Дерево папок: All files, папки по проектам, uploads.",
            "Grid или list; сортировка по имени, дате, размеру или автору.",
            "Фильтры по типу файла и источнику (project, chat, task, storage).",
            "Upload, download, rename, move, delete при наличии прав.",
            "Состояние вида сохраняется per workspace в local storage.",
          ],
        },
        { type: "h2", text: "Мобильный — /documents" },
        {
          type: "callout",
          variant: "info",
          title: "Preview-данные",
          text: "Экран Documents на мобильном сейчас показывает sample-файлы для UI preview. Для реального управления файлами используйте веб на julow.ru/documents, пока мобильное не подключится к тем же backend API.",
        },
      ],
    },
    search: {
      id: "search",
      title: "Поиск",
      description:
        "Быстрый поиск проектов и задач — глобальный search в шапке на вебе и отдельная вкладка Search на мобильном.",
      blocks: [
        {
          type: "p",
          text: "Поиск Julow помогает перейти к работе без просмотра списков. Оба клиента запрашивают задачи и проекты, доступные вам across workspaces.",
        },
        { type: "h2", text: "Search в шапке веба" },
        {
          type: "steps",
          items: [
            {
              title: "Фокус на поле",
              body: "Нажмите поле search в шапке или Cmd+F (macOS) / Ctrl+F (Windows/Linux).",
            },
            {
              title: "Введите хотя бы один символ",
              body: "Результаты debounce через 250ms. Проекты фильтруются локально по имени; задачи — GET /tasks/mine?search=.",
            },
            {
              title: "Навигация по результатам",
              body: "Стрелки вверх/вниз для выделения, Enter — открыть, Esc — закрыть dropdown.",
            },
            {
              title: "Открыть результат",
              body: "Проекты → /projects/{id}. Задачи → /projects/{projectId}?task={taskId}.",
            },
          ],
        },
        { type: "h2", text: "Вкладка Search на мобильном" },
        {
          type: "ul",
          items: [
            "Нижняя вкладка Search открывает полноэкранный поиск.",
            "Отдельные секции для совпадающих проектов и задач.",
            "Нажмите проект — доска; задачу — детали проекта.",
            "Offline использует кэш; online — обновление данных.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Область поиска",
          text: "Search охватывает проекты и названия задач (и labels на вебе). Нет full-text по сообщениям чатов и телам документов — для этого откройте Chats или Documents.",
        },
      ],
    },
    notifications: {
      id: "notifications",
      title: "Уведомления",
      description: "In-app алерты, WebSocket, browser push и переключатели push на мобильном.",
      blocks: [
        { type: "h2", text: "Веб" },
        {
          type: "ul",
          items: [
            "Колокол в шапке — dropdown по времени с подсветкой непрочитанных.",
            "Mark one read или Mark all read.",
            "WebSocket для live-событий; Firebase Cloud Messaging для browser push при включении.",
          ],
        },
        { type: "h2", text: "Мобильное" },
        {
          type: "ul",
          items: [
            "Колокол на Home или экран /notifications.",
            "Секции: Today, Yesterday, Earlier — pull to refresh.",
            "Settings → General → Push notifications — запрос разрешения ОС при включении.",
            "In-app toast banners, пока приложение на переднем плане.",
          ],
        },
        {
          type: "p",
          text: "Тексты и группировка следуют типам событий backend (tasks, chats, meetings, invites и т.д.). Формулировки могут слегка отличаться по payload.",
        },
        { type: "h2", text: "Категории уведомлений" },
        {
          type: "ul",
          items: [
            "Task — назначения, смена статуса, дедлайны.",
            "Comment — новые комментарии к отслеживаемым задачам.",
            "Mention — @mentions в чатах (если поддерживается payload).",
            "Deadline — просрочка и напоминания о скором сроке.",
            "Invite — приглашения в project, workspace или org с Accept/Decline.",
            "Chat — новые сообщения, когда вы не смотрите этот тред.",
            "System — события workspace и аккаунта.",
          ],
        },
        { type: "h2", text: "Deep links из уведомлений" },
        {
          type: "p",
          text: "Клик открывает связанную сущность: задачи через /projects/{id}?task=…, чаты через /chats?chat=…, invites с inline Accept/Decline. Mark as read автоматически при открытии деталей.",
        },
      ],
    },
    profile: {
      id: "profile",
      title: "Профиль и быстрые действия",
      description:
        "Меню профиля в шапке веба — быстрые действия аккаунта, тема, язык, статистика и выход.",
      blocks: [
        {
          type: "p",
          text: "На десктопе нажмите аватар в правом верхнем углу шапки — откроется profile sheet, slide-in панель справа.",
        },
        { type: "h2", text: "Что отображается" },
        {
          type: "ul",
          items: [
            "Display name из local-part email, пока не задано имя в Settings.",
            "Email из authenticated identity (только чтение здесь).",
            "Stat chips: число проектов в активном workspace, открытые вкладки шапки, непрочитанные уведомления.",
          ],
        },
        { type: "h2", text: "Действия меню" },
        {
          type: "ul",
          items: [
            "My account — /settings?tab=account для bio и сессий.",
            "Settings — /settings на вкладке General (имя workspace, язык, click ripple).",
            "Notifications — та же панель колокола, что у иконки в шапке.",
            "Sign out — завершение текущей веб-сессии.",
          ],
        },
        { type: "h2", text: "Ярлыки шапки (вне sheet)" },
        {
          type: "p",
          text: "Переключатель темы (sun/moon) и языка рядом с колоколом — не нужно открывать profile sheet. Тема в local storage; при первом визите учитывается системная.",
        },
        { type: "h2", text: "Аналог на мобильном" },
        {
          type: "p",
          text: "На мобильном профиль в Settings → Account — display name, bio, email, сессии, sign out. Тема и язык в Settings → General рядом с push toggle.",
        },
      ],
    },
    settings: {
      id: "settings",
      title: "Настройки",
      description: "Общие предпочтения, профиль аккаунта, сессии и участники workspace.",
      blocks: [
        {
          type: "p",
          text: "Веб: /settings с вкладками. Мобильный: вкладка Settings с теми же тремя секциями.",
        },
        { type: "h2", text: "General" },
        {
          type: "ul",
          items: [
            "Workspace name — переименование активного workspace (минимум 3 символа).",
            "Language — English, Русский, Deutsch.",
            "Appearance — светлая/тёмная тема; на вебе опциональный click ripple.",
            "Push notifications (мобильный) — master toggle для device push.",
          ],
        },
        { type: "h2", text: "Account" },
        {
          type: "ul",
          items: [
            "Display name и bio сохраняются в профиле.",
            "Email только для чтения из auth identity.",
            "Active sessions — отзыв других устройств.",
          ],
        },
        { type: "h2", text: "Members" },
        {
          type: "ul",
          items: [
            "Read-only список участников с search.",
            "Display name, user id, статус active/inactive.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          text: "Меню профиля на вебе ведёт в Settings → Account через ?tab=account для bio и сессий.",
        },
      ],
    },
    analytics: {
      id: "analytics",
      title: "Insights и аналитика",
      description: "Полные метрики на вебе; sample-графики в mobile Insights; live-виджеты на Home.",
      blocks: [
        { type: "h2", text: "Веб — /analytics" },
        {
          type: "p",
          text: "Производительность команды из реальных задач: velocity-style метрики, cycle time, throughput, breakdown по категориям, burndown-style views, team table и flow funnel. Данные обновляются для активного workspace.",
        },
        { type: "h2", text: "Мобильный — /analytics" },
        {
          type: "callout",
          variant: "info",
          text: "Mobile Insights использует sample chart data для preview layout. Для production-цифр — web Insights или Home widgets с live analytics API.",
        },
        { type: "h2", text: "Виджеты Home" },
        {
          type: "p",
          text: "Home на мобильном показывает компактные productivity и task breakdown charts при ответе analytics API.",
        },
      ],
    },
    "web-vs-mobile": {
      id: "web-vs-mobile",
      title: "Веб и мобильное",
      description: "Когда использовать десктопный веб, когда нативное приложение и что происходит в мобильном браузере.",
      blocks: [
        {
          type: "p",
          text: "Julow — два клиента на одном backend. Parity — цель, но часть поверхностей остаётся desktop-first, пока mobile API не догонят.",
        },
        { type: "h2", text: "Предпочитайте веб (десктоп)" },
        {
          type: "ul",
          items: [
            "Широкий kanban с drag-and-drop.",
            "Полная библиотека документов с upload и папками.",
            "Полный набор Insights из live-задач.",
            "Чаты с resizable panels и rich attachments.",
            "Multi-project вкладки в шапке.",
          ],
        },
        { type: "h2", text: "Предпочитайте мобильное" },
        {
          type: "ul",
          items: [
            "Ежедневная работа с телефона — Home, Projects, Chats, Search.",
            "QR login на веб без ввода паролей.",
            "Push-уведомления и встречи в дороге.",
            "Gantt на досках проектов.",
          ],
        },
        { type: "h2", text: "Веб в мобильном браузере" },
        {
          type: "p",
          text: "Protected routes показывают страницу загрузки со ссылкой на Android APK вместо десктопной оболочки. Установите нативное приложение для intended experience.",
        },
        {
          type: "code",
          text: "Веб: https://julow.ru\nМобильное: APK или dev-сборка от вашей команды",
        },
      ],
    },
    "mobile-app": {
      id: "mobile-app",
      title: "Мобильное приложение подробно",
      description:
        "Нативный Android — вкладки, offline cache, push, QR login, stack встреч и platform-specific UI.",
      blocks: [
        {
          type: "p",
          text: "Мобильное приложение Julow — intended experience на телефонах. Общий backend julow.ru с вебом, но навигация оптимизирована для одной руки, push и offline resilience.",
        },
        { type: "h2", text: "Нижние вкладки" },
        {
          type: "ul",
          items: [
            "Home — сводка dashboard, вход во встречи, уведомления, переключатель workspace, invite join.",
            "Projects — все доступные проекты с pull-to-refresh.",
            "Chats — список чатов workspace с unread badges.",
            "Settings — General, Account, Members; ссылка на документацию; QR scan; sign out.",
            "Search — глобальный поиск проектов и задач.",
          ],
        },
        { type: "h2", text: "Stack-экраны (поверх вкладок)" },
        {
          type: "ul",
          items: [
            "project/[id] — board, list или gantt с task sheets.",
            "chat/[id] — тред переписки.",
            "task/[id]/comments — тред комментариев задачи.",
            "meetings/index, meetings/[id]/room — расписание и UI в звонке.",
            "notifications — полная история уведомлений.",
            "docs — эта документация с горизонтальными chips разделов.",
            "qr-scan — сканер камеры для pairing веб-входа.",
          ],
        },
        { type: "h2", text: "Offline и кэш" },
        {
          type: "p",
          text: "Мобильное кэширует проекты, задачи, чаты и сообщения локально. При обрыве сети можно просматривать недавно синхронизированные данные. Мutations (новые задачи, сообщения, смена статуса) в local mutation queue и отправляются при восстановлении связи.",
        },
        { type: "h3", text: "Что работает offline" },
        {
          type: "ul",
          items: [
            "Чтение ранее загруженных досок и списков задач.",
            "История чата, синхронизированная до отключения.",
            "Составление сообщений и обновлений задач — отправка при online.",
            "Search в кэшированных проектах и задачах.",
          ],
        },
        { type: "h2", text: "Push-уведомления" },
        {
          type: "steps",
          items: [
            {
              title: "Включите в Settings",
              body: "Settings → General → Push notifications — toggle on.",
            },
            {
              title: "Разрешение ОС",
              body: "Android показывает системный диалог при первом включении.",
            },
            {
              title: "Получение алертов",
              body: "Background push для tasks, chats, meetings; in-app toast на переднем плане.",
            },
          ],
        },
        { type: "h2", text: "QR login на веб" },
        {
          type: "p",
          text: "В Settings есть Scan QR to sign in on web. После сканирования кода на julow.ru/login/qr подтвердите сессию браузера — удобно на общих десктопах.",
        },
        { type: "h2", text: "Preview vs live data" },
        {
          type: "callout",
          variant: "info",
          title: "Documents и Insights",
          text: "Mobile Documents и отдельная вкладка Analytics могут показывать sample layout data. Home widgets и web Insights используют live task analytics. Для полного file management предпочитайте web /documents, пока mobile не подключится к тем же file API.",
        },
        {
          type: "card",
          variant: "tip",
          title: "Источник установки",
          body: "Production APK распространяет ваша команда. Mobile gate на julow.ru ведёт на текущую Android-сборку для мобильных браузеров.",
        },
      ],
    },
    faq: {
      id: "faq",
      title: "Частые вопросы",
      description: "Ответы на типичные вопросы об интерфейсе и рабочих процессах Julow.",
      blocks: [
        { type: "h2", text: "Аккаунт и доступ" },
        { type: "h3", text: "Почему не получается войти по паролю после Google?" },
        {
          type: "p",
          text: "Julow привязывает один основной способ входа к email. Если регистрация была через OAuth, вход по паролю заблокирован — и наоборот. На экране входа показывается подсказка, какой метод использовать.",
        },
        { type: "h3", text: "Как войти на чужом компьютере без пароля?" },
        {
          type: "p",
          text: "Откройте julow.ru/login/qr на десктопе, на телефоне зайдите в Настройки и нажмите «Сканировать QR» для подтверждения сессии.",
        },
        { type: "h3", text: "Где отозвать старые сессии?" },
        {
          type: "p",
          text: "Настройки → Account — список активных сессий с устройством, IP и временем активности. Можно завершить любую, кроме текущей.",
        },
        { type: "h2", text: "Проекты и задачи" },
        { type: "h3", text: "Почему я не вижу проект коллеги?" },
        {
          type: "p",
          text: "Нужно приглашение. Попросите ссылку или проверьте уведомления. После принятия проект появится в своей секции workspace на /projects.",
        },
        { type: "h3", text: "Что означает прогресс-бар на карточке проекта?" },
        {
          type: "p",
          text: "Это доля ваших назначенных задач в статусе done — не весь бэклог команды. Done определяется категорией колонки workflow.",
        },
        { type: "h3", text: "Есть ли Gantt на вебе?" },
        {
          type: "p",
          text: "Да. Откройте проект и переключитесь на Gantt в панели инструментов. Кнопки плюс/минус меняют масштаб timeline.",
        },
        { type: "h2", text: "Чаты и встречи" },
        { type: "h3", text: "Почему нет уведомлений из чата, пока он открыт?" },
        {
          type: "p",
          text: "Julow подавляет дубликаты для активного чата — так меньше шума во время переписки.",
        },
        { type: "h3", text: "Зачем выбирать проект при создании встречи?" },
        {
          type: "p",
          text: "Встречи привязаны к проекту, чтобы все участники проекта автоматически получили приглашение и уведомление.",
        },
        { type: "h2", text: "Мобильное и веб" },
        { type: "h3", text: "Почему julow.ru на телефоне показывает страницу загрузки?" },
        {
          type: "p",
          text: "Десктопный веб требует ширину от 768px. Мобильный браузер перенаправляет на установку нативного приложения.",
        },
        { type: "h3", text: "Язык на вебе влияет на мобильное?" },
        {
          type: "p",
          text: "Да — язык хранится в профиле аккаунта и применяется на всех клиентах после синхронизации.",
        },
        { type: "h3", text: "Где документация в приложении?" },
        {
          type: "p",
          text: "Настройки → ссылка на документацию, либо экран docs с горизонтальными чипами разделов — тот же текст, что на julow.ru/docs.",
        },
      ],
    },
    "keyboard-shortcuts": {
      id: "keyboard-shortcuts",
      title: "Горячие клавиши (веб)",
      description: "Горячие клавиши браузера на десктопе для быстрой навигации на julow.ru.",
      blocks: [
        {
          type: "p",
          text: "Веб Julow поддерживает ограниченный набор keyboard interactions. Глобального cheat sheet overlay пока нет — здесь перечислено, что работает сегодня.",
        },
        { type: "h2", text: "Глобальные" },
        {
          type: "ul",
          items: [
            "Cmd+F / Ctrl+F — фокус на search в шапке.",
            "Esc — закрыть dropdown search, notification sheet или profile sheet.",
            "Arrow Up / Arrow Down + Enter — навигация по результатам search.",
          ],
        },
        { type: "h2", text: "Вкладки проектов в шапке" },
        {
          type: "ul",
          items: [
            "Double-click вкладки — переименовать label.",
            "Enter при переименовании — сохранить.",
            "Escape при переименовании — отмена.",
            "Right-click вкладки — контекстное меню (цвет, duplicate, close, unpin).",
          ],
        },
        { type: "h2", text: "Доска проекта" },
        {
          type: "ul",
          items: [
            "Drag-and-drop — перемещение задач между колонками (board и list).",
            "Click карточки задачи — панель деталей с комментариями и вложениями.",
          ],
        },
        { type: "h2", text: "Split view чата" },
        {
          type: "p",
          text: "На /chats resizable divider между списком и тредом реагирует на drag мышью. Отдельных keyboard shortcuts для resize нет.",
        },
        {
          type: "callout",
          variant: "info",
          title: "Мобильное",
          text: "Нативное приложение использует touch gestures — pull to refresh, back swipe, drag handles bottom sheet. Hardware keyboard shortcuts на мобильном не привязаны.",
        },
      ],
    },
    troubleshooting: {
      id: "troubleshooting",
      title: "Решение проблем",
      description: "Типичные проблемы со входом, синхронизацией, уведомлениями и звонками.",
      blocks: [
        { type: "h2", text: "Проблемы со входом" },
        {
          type: "ul",
          items: [
            "Wrong method dialog — используйте показанного провайдера (Google, GitHub, Yandex, Apple или email password).",
            "OAuth callback errors — завершайте flow в той же вкладке; проверьте блокировку pop-up.",
            "QR expired — обновите julow.ru/login/qr и отсканируйте снова в срок.",
          ],
        },
        { type: "h2", text: "Данные не обновляются" },
        {
          type: "ul",
          items: [
            "Веб — hard refresh или переключение workspace для reload контекста.",
            "Мобильный — pull to refresh на Home, Projects или Chats.",
            "После accept invite — дождитесь router refresh или переоткройте /projects.",
            "Offline mobile — queued changes синхронизируются при восстановлении связи.",
          ],
        },
        { type: "h2", text: "Уведомления" },
        {
          type: "ul",
          items: [
            "Web push — разрешите browser notifications; проверьте permissions сайта.",
            "Mobile push — Settings → General → Push и разрешение Android notifications.",
            "Нет chat alerts в активном чате — ожидаемое suppression для активного треда.",
          ],
        },
        { type: "h2", text: "Встречи и LiveKit" },
        {
          type: "ul",
          items: [
            "Разрешите микрофон и камеру в браузере или permissions ОС приложения.",
            "Screen share требует стабильный uplink — Ethernet или надёжный Wi‑Fi.",
            "Застряли в комнате после выхода — откройте /meetings и проверьте active session redirect.",
          ],
        },
        { type: "h2", text: "Documents" },
        {
          type: "p",
          text: "Ошибки upload обычно означают limits или permissions backend. Повторите с /documents и поддерживаемым типом файла. Mobile document management — preview-only до API parity.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Всё ещё не работает?",
          text: "Запишите имя workspace, версию браузера или приложения и точный URL при обращении к admin команды. Подозрительные сессии немедленно отзовите в Settings → Account.",
        },
      ],
    },
    "docs-guide": {
      id: "docs-guide",
      title: "Как пользоваться документацией",
      description: "Как устроено руководство на вебе и в мобильном приложении.",
      blocks: [
        {
          type: "p",
          text: "Документация описывает только функции Julow, существующие сегодня — не roadmap. Контент на English, Russian и German в соответствии с языком приложения.",
        },
        { type: "h2", text: "На вебе (/docs)" },
        {
          type: "ul",
          items: [
            "Левая sidebar — сгруппированные темы с иконками; видна на десктопе.",
            "Центральная колонка — ширина статьи ~800px с callouts, steps и tip cards.",
            "Узкие экраны — кнопка меню открывает slide-in sidebar drawer.",
            "Deep links — /docs/{section} (например /docs/auth) для sharing с коллегами.",
          ],
        },
        { type: "h2", text: "В мобильном приложении" },
        {
          type: "ul",
          items: [
            "Из Settings или пункта документации в вашей сборке.",
            "Horizontal section chips прокручиваются сверху; tap — смена статьи.",
            "Vertical scroll для полного тела раздела — тот же текст, что на вебе.",
          ],
        },
        {
          type: "card",
          variant: "tip",
          title: "Для PM и онбординга",
          body: "Делитесь deep links на Getting started и Web vs mobile в welcome emails. Сочетайте QR login docs с security guidelines для распределённых команд.",
        },
      ],
    },
  },
};
