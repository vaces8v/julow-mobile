import type { DocsContent } from "../types";

export const en: DocsContent = {
  pageTitle: "Documentation",
  pageSubtitle:
    "Complete user guide for Julow — web and mobile at julow.ru, written for product managers, team leads, and everyday users.",
  navGroups: [
    {
      label: "Start",
      sections: ["getting-started", "auth", "navigation", "workspace", "invites", "docs-guide"],
    },
    {
      label: "Work",
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
      label: "Account",
      sections: ["notifications", "profile", "settings", "analytics"],
    },
    {
      label: "Platforms",
      sections: ["web-vs-mobile", "mobile-app"],
    },
    {
      label: "Help",
      sections: ["faq", "keyboard-shortcuts", "troubleshooting"],
    },
  ],
  sections: {
    "getting-started": {
      id: "getting-started",
      title: "Getting started",
      description:
        "Understand what Julow is, how workspaces organize your team, and what you see right after sign-in.",
      blocks: [
        {
          type: "p",
          text: "Julow is a team workspace for projects, tasks, chats, files, and video meetings. Every feature lives inside a workspace — your team's shared container for members, projects, and permissions.",
        },
        { type: "h2", text: "Core concepts" },
        {
          type: "ul",
          items: [
            "Workspace — one team space; you can belong to several (including as a guest).",
            "Project — a board with workflow columns and tasks; may link to a project chat.",
            "Task — a work item with assignees, priority, due date, and workflow status.",
            "Chat — real-time messaging, often tied to a project.",
            "Meeting — scheduled or instant video calls powered by LiveKit.",
            "Document — files in the workspace library, from uploads or chat/task attachments.",
          ],
        },
        { type: "h2", text: "Production URLs (julow.ru)" },
        {
          type: "code",
          text: "Web app: https://julow.ru\nSign in: https://julow.ru/login\nDashboard: https://julow.ru/workspace\nDocumentation: https://julow.ru/docs",
        },
        { type: "h2", text: "After you sign in" },
        {
          type: "steps",
          items: [
            {
              title: "Web (desktop browser)",
              body: "You land on the Dashboard at /workspace — task totals, overdue items, quick add, and a weekly activity chart from live data.",
            },
            {
              title: "Mobile (native app)",
              body: "The Home tab opens with a similar summary, meeting shortcuts, notification entry, and compact analytics widgets when the API is available.",
            },
            {
              title: "Pick your language",
              body: "Open Settings, then General, and choose English, Русский, or Deutsch. The choice applies across web and mobile for your account.",
            },
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Desktop-first web",
          text: "The web app targets screens 768px and wider. On a phone browser you will see an install prompt for the native app instead of the full desktop UI.",
        },
        {
          type: "card",
          variant: "tip",
          title: "First 30 minutes checklist",
          body: "Switch to the correct workspace, skim the Dashboard, create or open a project, Quick Add a task, message in a project chat, pin the project to header tabs, and open Settings to confirm language and sessions.",
        },
        { type: "h2", text: "Who this guide is for" },
        {
          type: "p",
          text: "Product managers can share deep links like /docs/invites or /docs/mobile-app during onboarding. Contributors get step-by-step UI paths. Admins should pair session docs with your device policy.",
        },
      ],
    },
    auth: {
      id: "auth",
      title: "Sign in & account",
      description: "Email, OAuth, QR pairing, registration, and session management on web and mobile.",
      blocks: [
        { type: "h2", text: "Web sign-in (/login)" },
        {
          type: "ul",
          items: [
            "Email and password with optional Remember me.",
            "OAuth — Google, GitHub, Yandex, and Apple when your deployment enables them.",
            "QR sign-in — open /login/qr on desktop; approve from the mobile app.",
            "Registration at /register — creates an account on the personal plan.",
          ],
        },
        { type: "h2", text: "QR login flow" },
        {
          type: "steps",
          items: [
            { title: "On desktop", body: "Open /login/qr. A QR code and session id appear and refresh until scanned or expired." },
            { title: "On mobile", body: "Sign in, open Settings, tap Scan QR to sign in on web, and confirm the browser session." },
            { title: "Result", body: "The web tab completes login without typing your password on a shared keyboard." },
          ],
        },
        { type: "h2", text: "Mobile sign-in" },
        {
          type: "ul",
          items: [
            "Same email/password and OAuth providers as web.",
            "Settings includes Scan QR for approving a pending web session.",
            "Biometric unlock depends on your OS — Julow stores the session token after first login.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "OAuth vs password",
          text: "If your email was registered with OAuth, password sign-in is blocked — and vice versa. Julow shows a dialog that tells you which method to use.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Shared computers",
          text: "Prefer QR login on untrusted desktops. Revoke old sessions under Settings, Account after using a public machine.",
        },
        { type: "h2", text: "Sessions" },
        {
          type: "p",
          text: "Settings, Account lists active sessions with device label, IP, and last activity. Revoke any session except the current one. Web uses httpOnly cookies; mobile stores tokens securely for API calls.",
        },
      ],
    },
    navigation: {
      id: "navigation",
      title: "Navigation",
      description: "Sidebar, header tabs, search, and mobile bottom navigation — how to move without getting lost.",
      blocks: [
        { type: "h2", text: "Web sidebar — Main" },
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
        { type: "h2", text: "Web sidebar — Tools" },
        {
          type: "ul",
          items: [
            "Meet — /meetings for scheduling and joining video calls.",
            "Documentation — /docs (this guide, also in the Tools section).",
          ],
        },
        { type: "h2", text: "Web header" },
        {
          type: "ul",
          items: [
            "Project tabs — browser-style pinned projects; tab menu: rename, recolor, unpin, close others.",
            "Search — global lookup for tasks and projects in the active workspace.",
            "Notifications — bell with unread count; mark all read from the dropdown.",
            "Profile — account shortcuts, theme toggle, language, sign out.",
          ],
        },
        { type: "h2", text: "Mobile bottom tabs" },
        {
          type: "ul",
          items: [
            "Home — dashboard, meetings entry, notifications bell.",
            "Projects — list and create projects.",
            "Chats — workspace chat list.",
            "Settings — profile, workspace, push, QR login.",
            "Search — dedicated tab for projects and tasks.",
          ],
        },
        {
          type: "p",
          text: "Stack screens (project board, chat thread, meetings, notifications) open above the tab bar. Use the back control or OS back gesture to return to tabs.",
        },
        {
          type: "card",
          variant: "tip",
          title: "Pin projects on web",
          body: "Pin frequently used projects to header tabs so you can switch boards while staying on chats or documents.",
        },
      ],
    },
    workspace: {
      id: "workspace",
      title: "Workspaces & switching",
      description:
        "How workspaces organize teams, how to switch between them, and how guest projects from invitations appear alongside your own.",
      blocks: [
        {
          type: "p",
          text: "A workspace is Julow's top-level team container. Your account can belong to one or many workspaces. Most day-to-day screens — Dashboard, Insights, Documents, Settings rename — use the active workspace. Projects you were invited to may live in other workspaces and still appear on /projects without switching.",
        },
        { type: "h2", text: "Active workspace" },
        {
          type: "p",
          text: "The active workspace determines which tasks feed the Dashboard and Insights charts, which files appear first in Documents, and which name you edit under Settings, General. Switching workspace reloads workspace-scoped data while keeping your session.",
        },
        { type: "h2", text: "Switching on web" },
        {
          type: "steps",
          items: [
            {
              title: "Open the workspace switcher",
              body: "In the left sidebar, use the workspace selector below the Julow logo. It lists every workspace you belong to with its display name.",
            },
            {
              title: "Pick a workspace",
              body: "Click another workspace. The app refreshes projects, dashboard metrics, and settings context for that team.",
            },
            {
              title: "Confirm on Dashboard",
              body: "Open /workspace and verify task totals and Quick Add target the intended team.",
            },
          ],
        },
        { type: "h2", text: "Switching on mobile" },
        {
          type: "p",
          text: "On the Home tab, tap the workspace name in the header area to open the workspace picker. Pull to refresh on Home or Settings after switching to sync projects and cached tasks.",
        },
        { type: "h2", text: "Guest and cross-workspace projects" },
        {
          type: "ul",
          items: [
            "When someone invites you to a project, you gain access without leaving your home workspace.",
            "The Projects page (/projects) lists all projects you can open, grouped by workspace name.",
            "Your active workspace is shown first; guest sections list other workspaces where you have invited projects.",
            "Progress bars on project cards reflect your assigned tasks only — not the entire team backlog.",
            "Creating a new project always happens in the currently active workspace.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Why guest projects stay visible",
          text: "Julow loads all projects from GET /projects/mine across workspaces. That way invited work appears immediately after you accept an invite — you do not need to guess which workspace to switch to first.",
        },
        { type: "h2", text: "Rename your workspace" },
        {
          type: "p",
          text: "Settings, General lets owners rename the active workspace (minimum 3 characters). The change persists on the backend and updates the sidebar label after save.",
        },
      ],
    },
    invites: {
      id: "invites",
      title: "Invitations & guest access",
      description:
        "Join projects via invite links or codes, accept from notifications, and understand guest visibility on the Projects page.",
      blocks: [
        {
          type: "p",
          text: "Julow supports project, workspace, and organization invitations. Most users encounter project invites — a teammate shares a link and you gain access to one board and its chat.",
        },
        { type: "h2", text: "Invite entry points" },
        {
          type: "ul",
          items: [
            "Public redeem page — https://julow.ru/invite — paste a full link or token.",
            "Direct link — /invite/{token} opens a preview with project name and Accept / Decline.",
            "Auth gate — /invite/auth if you must sign in before accepting.",
            "Dashboard Quick Join — /workspace has an invite-code field (web and mobile Home).",
            "Notifications — invite events show Accept and Decline actions in the bell panel.",
          ],
        },
        { type: "h2", text: "Accept an invitation" },
        {
          type: "steps",
          items: [
            {
              title: "Open the link or paste the code",
              body: "From email or chat, open https://julow.ru/invite/… or paste into /invite or the Dashboard join field.",
            },
            {
              title: "Sign in if prompted",
              body: "New users register at /register; returning users sign in at /login. OAuth works the same as normal sign-in.",
            },
            {
              title: "Confirm acceptance",
              body: "On the preview screen tap Accept. Julow adds you to the project and refreshes your project list.",
            },
            {
              title: "Land on the project",
              body: "After acceptance you are redirected to /projects/{id}. The project also appears under its workspace section on /projects.",
            },
          ],
        },
        { type: "h2", text: "Decline or ignore" },
        {
          type: "p",
          text: "From the notification detail sheet choose Decline — the invitation is rejected and action buttons disappear. Ignoring an invite leaves it pending until it expires per backend policy.",
        },
        { type: "h2", text: "Guest experience" },
        {
          type: "ul",
          items: [
            "Guest projects show the host workspace name on project cards.",
            "You can chat, complete tasks, join meetings, and upload files according to project permissions.",
            "Workspace rename and member list in Settings reflect the active workspace — not every workspace you guest in.",
            "Search and header tabs include guest projects the same as owned projects.",
          ],
        },
        {
          type: "callout",
          variant: "warning",
          title: "Share links carefully",
          text: "Invite tokens grant access to project data. Send them over trusted channels and revoke access by removing the member in project settings when someone leaves the team.",
        },
      ],
    },
    dashboard: {
      id: "dashboard",
      title: "Dashboard",
      description:
        "The /workspace home screen — live metrics, Quick Add, activity feed, charts, and invite-code join.",
      blocks: [
        {
          type: "p",
          text: "The Dashboard is your signed-in landing page at /workspace (sidebar: Dashboard). It summarizes task health for the active workspace using real backend data — not placeholder numbers.",
        },
        { type: "h2", text: "Summary cards" },
        {
          type: "ul",
          items: [
            "Total tasks assigned to you in the active workspace.",
            "Overdue — tasks past due date that are not in a done workflow column.",
            "In progress — tasks in active or review workflow categories.",
            "Completion rate — share of your assigned tasks marked done.",
          ],
        },
        { type: "h2", text: "Quick Add" },
        {
          type: "steps",
          items: [
            {
              title: "Type a task title",
              body: "Use the Quick Add input at the top of the Dashboard.",
            },
            {
              title: "Choose a project",
              body: "Pick from projects in the active workspace. The task is created with default workflow status.",
            },
            {
              title: "Submit",
              body: "Press Enter or tap Add. Counts and charts refresh on the next data load.",
            },
          ],
        },
        { type: "h2", text: "Weekly activity chart" },
        {
          type: "p",
          text: "An area chart shows tasks created vs completed over the last seven days, built from task timestamps in your workspace. Hover tooltips show exact counts per day.",
        },
        { type: "h2", text: "Recent activity" },
        {
          type: "p",
          text: "A scrollable list of recent task events (created, completed) with relative timestamps. Click a row to open the task on its project board via /projects/{projectId}?task={taskId}.",
        },
        { type: "h2", text: "Join by invite code" },
        {
          type: "p",
          text: "The Dashboard includes a compact invite-code field. Paste a token or full invite URL — Julow parses the token and runs the same acceptance flow as /invite/{token}. Mobile Home exposes the same join pattern.",
        },
        { type: "h2", text: "Mobile Home tab" },
        {
          type: "ul",
          items: [
            "Similar stat chips and charts when analytics API data is available.",
            "Meeting card shortcuts to scheduled and instant calls.",
            "Notification bell opens /notifications.",
            "Workspace switcher in the header.",
            "Pull to refresh reloads cached projects and tasks.",
          ],
        },
        {
          type: "card",
          variant: "tip",
          title: "PM daily ritual",
          body: "Start on the Dashboard each morning: check overdue, scan the weekly chart for throughput drops, Quick Add any capture items, then open pinned project tabs for standup.",
        },
      ],
    },
    projects: {
      id: "projects",
      title: "Projects",
      description: "Create projects, read status and progress, open kanban boards, and use mobile view switchers.",
      blocks: [
        {
          type: "p",
          text: "Projects belong to a workspace. You see every project you own or were invited to, including guest access in other workspaces.",
        },
        { type: "h2", text: "Projects list (/projects)" },
        {
          type: "ul",
          items: [
            "Cards grouped by workspace with status: Active, Paused, Archived, Completed.",
            "Progress bar — share of your assigned tasks in done workflow columns.",
            "Create project — dialog with name and optional description in the active workspace.",
          ],
        },
        { type: "h2", text: "Project board (/projects/{id})" },
        {
          type: "steps",
          items: [
            { title: "Kanban columns", body: "Columns come from the project workflow (To do, In progress, Review, Done, etc.). Drag cards between columns." },
            { title: "Task card", body: "Click a card for title, description, assignees, priority, due date, and status." },
            { title: "Header tabs", body: "Pin the project to switch quickly from chats or documents without losing context." },
          ],
        },
        { type: "h2", text: "Mobile projects" },
        {
          type: "p",
          text: "Projects tab lists the same data. Tap a card to open the board with Board, List, or Gantt switcher at the top.",
        },
        { type: "h2", text: "Create a project" },
        {
          type: "steps",
          items: [
            {
              title: "Open /projects",
              body: "Click Create project (web) or the add control on mobile Projects tab.",
            },
            {
              title: "Enter name and description",
              body: "Name is required. Description is optional but helps teammates understand scope.",
            },
            {
              title: "Confirm",
              body: "The project is created in your active workspace and appears in the first section of the list.",
            },
          ],
        },
        { type: "h2", text: "Status badges" },
        {
          type: "ul",
          items: [
            "Active — default working state.",
            "Paused — temporarily on hold; tasks remain but team signals reduced velocity.",
            "Archived — read-heavy, hidden from default flows.",
            "Completed — delivery finished; useful for portfolio reporting.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Cross-workspace visibility",
          text: "You do not need to switch workspace to see invited projects. They appear under their host workspace name on the same /projects page.",
        },
      ],
    },
    "board-views": {
      id: "board-views",
      title: "Board, list & Gantt views",
      description:
        "Switch between kanban, table list, and timeline Gantt on web and mobile project screens.",
      blocks: [
        {
          type: "p",
          text: "Every project board supports multiple visualizations of the same underlying tasks. Switching view does not change data — only layout and interaction patterns.",
        },
        { type: "h2", text: "View switcher" },
        {
          type: "ul",
          items: [
            "Board — columns match workflow statuses; drag cards between columns on web.",
            "List — table-style sections per status with priority and due date columns on web.",
            "Gantt — timeline bars by start/due dates with zoom controls on web and mobile.",
          ],
        },
        { type: "h2", text: "Web — /projects/{id}" },
        {
          type: "steps",
          items: [
            {
              title: "Open a project",
              body: "From /projects or a pinned header tab, navigate to the project board.",
            },
            {
              title: "Choose view mode",
              body: "Use the Board / List / Gantt icons in the project toolbar below the header.",
            },
            {
              title: "Board drag-and-drop",
              body: "Drag a task card to another column. Julow PATCHes the workflow status_id mapped to that column.",
            },
            {
              title: "Gantt zoom",
              body: "Use plus/minus controls to change timeline scale (50%–200%). Scroll horizontally for long ranges.",
            },
          ],
        },
        { type: "h2", text: "Mobile — project screen" },
        {
          type: "p",
          text: "Tap a project on the Projects tab. Icons at the top switch Board, List, and Gantt. Task details open in a bottom sheet; comments live on task/[id]/comments. Pull to refresh syncs board data.",
        },
        { type: "h2", text: "Project toolbar actions" },
        {
          type: "ul",
          items: [
            "Add task — opens create dialog (web) or bottom sheet (mobile).",
            "Search within project — filters visible cards by title.",
            "Settings — project name, description, color, archive (web dialog).",
            "Members — view and manage project membership (web dialog).",
            "Pin to header — adds project to browser-style tabs in the web shell.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Workflow columns vs view",
          text: "Column names come from the project's workflow configuration (To do, In progress, Review, Done, etc.). List and Gantt group tasks by the same status categories the board uses.",
        },
      ],
    },
    tasks: {
      id: "tasks",
      title: "Tasks",
      description: "Workflow columns, quick add, task details, comments, priorities, and deep links.",
      blocks: [
        {
          type: "p",
          text: "Tasks are the atomic unit of work in Julow. Each task belongs to exactly one project and moves through workflow columns defined for that project.",
        },
        { type: "h2", text: "Workflow statuses" },
        {
          type: "p",
          text: "Each project defines workflow columns with categories: todo, in_progress, review, done, blocked, cancelled. Done means the column category is done — not a separate legacy status field. The backend stores status_id (UUID) pointing to a workflow status row.",
        },
        { type: "h3", text: "Category meanings" },
        {
          type: "ul",
          items: [
            "todo — not started; default for new tasks.",
            "in_progress — actively being worked.",
            "review — awaiting QA, code review, or approval.",
            "done — completed; counts toward velocity and completion rate.",
            "blocked — cannot proceed; often paired with a comment explaining why.",
            "cancelled — will not be done; excluded from active planning.",
          ],
        },
        { type: "h2", text: "Priorities" },
        {
          type: "ul",
          items: [
            "critical — highest urgency; red indicator on cards.",
            "high — orange indicator.",
            "medium — default amber indicator.",
            "low — muted indicator.",
            "none — no priority dot when unset.",
          ],
        },
        { type: "h2", text: "Dashboard quick add" },
        {
          type: "p",
          text: "On /workspace type a title in Quick Add and pick a project. The dashboard shows totals, overdue count, completion rate, and a weekly activity chart from real tasks.",
        },
        { type: "h2", text: "Creating tasks on the board" },
        {
          type: "steps",
          items: [
            {
              title: "Open the project",
              body: "Navigate to /projects/{id} or a pinned header tab.",
            },
            {
              title: "Add task",
              body: "Click Add in a column (web) or the plus control (mobile). Optionally pre-select the column status.",
            },
            {
              title: "Fill details",
              body: "Title is required. Set assignees, priority, due date, description, and labels in the detail panel.",
            },
          ],
        },
        { type: "h2", text: "Task details" },
        {
          type: "ul",
          items: [
            "Fields: title, description, assignees, priority, due date, start date (Gantt), workflow status, labels.",
            "Comments thread with text and file attachments.",
            "Deep link pattern: /projects/{projectId}?task={taskId} — used by notifications and search.",
            "Mobile: open from board or list; comments on task/[id]/comments screen.",
          ],
        },
        { type: "h2", text: "Comments and attachments" },
        {
          type: "p",
          text: "Task comments support text and file uploads. Attachments show file type icons and downloadable links. Comment notifications deep-link back to the task when clicked from the bell panel.",
        },
        { type: "h2", text: "Search" },
        {
          type: "p",
          text: "Web header search and the mobile Search tab query tasks and projects by title (and labels on web) within your accessible workspaces.",
        },
      ],
    },
    chats: {
      id: "chats",
      title: "Chats",
      description: "Real-time team messaging, attachments, and desktop split layout.",
      blocks: [
        {
          type: "p",
          text: "Chats use WebSocket delivery. While a chat is open and marked active, duplicate notifications for that thread are suppressed.",
        },
        { type: "h2", text: "Chat list (/chats)" },
        {
          type: "ul",
          items: [
            "Project chats show project color and name.",
            "Unread badges update live on new messages.",
            "Search filters the list by chat title.",
          ],
        },
        { type: "h2", text: "Conversation" },
        {
          type: "ul",
          items: [
            "Send text; pasted URLs become clickable links.",
            "Attach files; images and videos render inline with a lightweight video player.",
            "Desktop: resizable split — list on the left, thread on the right.",
          ],
        },
        { type: "h2", text: "Mobile chats" },
        {
          type: "p",
          text: "Open Chats, tap a row for /chat/{id}. Pull to refresh; unread counts sync with the backend.",
        },
      ],
    },
    meetings: {
      id: "meetings",
      title: "Meetings",
      description: "Schedule calls, start instant rooms, and use in-call controls (LiveKit).",
      blocks: [
        {
          type: "p",
          text: "On web open Tools, then Meet (/meetings). On mobile use Home shortcuts or the meetings stack screen.",
        },
        { type: "h2", text: "Meeting list" },
        {
          type: "ul",
          items: [
            "Statuses: Draft, Scheduled, In progress, Completed, Cancelled.",
            "Filter by project; schedule with title, date, time, optional project link.",
            "New room — instant ad-hoc call you can join immediately.",
          ],
        },
        { type: "h2", text: "Inside a call" },
        {
          type: "ul",
          items: [
            "Web room: /meetings/{id}/room — microphone, camera, screen share, leave.",
            "Mobile room: meetings/[id]/room with the same core controls.",
            "Web picture-in-picture lets you browse Julow while the call floats.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "LiveKit",
          text: "Call quality depends on your LiveKit deployment and network. Use wired or strong Wi‑Fi for screen sharing.",
        },
      ],
    },
    documents: {
      id: "documents",
      title: "Documents",
      description: "Workspace file library on web; mobile preview state.",
      blocks: [
        { type: "h2", text: "Web — /documents" },
        {
          type: "ul",
          items: [
            "Folder tree: All files, per-project folders, uploads.",
            "Grid or list view; sort by name, date, size, or author.",
            "Filters by file kind and source (project, chat, task, storage).",
            "Upload, download, rename, move, delete when permissions allow.",
            "View state persists per workspace in local storage.",
          ],
        },
        { type: "h2", text: "Mobile — /documents" },
        {
          type: "callout",
          variant: "info",
          title: "Preview data",
          text: "The mobile Documents screen currently shows sample files for UI preview. Use the web app at julow.ru/documents for real file management until mobile connects to the same backend APIs.",
        },
      ],
    },
    search: {
      id: "search",
      title: "Search",
      description:
        "Find projects and tasks quickly — global header search on web and the dedicated Search tab on mobile.",
      blocks: [
        {
          type: "p",
          text: "Julow search helps you jump to work without browsing lists. Both clients query tasks and projects you can access across workspaces.",
        },
        { type: "h2", text: "Web header search" },
        {
          type: "steps",
          items: [
            {
              title: "Focus the field",
              body: "Click the search box in the top header, or press Cmd+F (macOS) / Ctrl+F (Windows/Linux).",
            },
            {
              title: "Type at least one character",
              body: "Results debounce after 250ms. Projects filter locally by name; tasks fetch from GET /tasks/mine?search=.",
            },
            {
              title: "Navigate results",
              body: "Use arrow keys to highlight rows, Enter to open, Esc to close the dropdown.",
            },
            {
              title: "Open a hit",
              body: "Projects go to /projects/{id}. Tasks go to /projects/{projectId}?task={taskId}.",
            },
          ],
        },
        { type: "h2", text: "Mobile Search tab" },
        {
          type: "ul",
          items: [
            "Bottom tab Search opens a full-screen lookup.",
            "Separate sections for matching projects and tasks.",
            "Tap a project to open its board; tap a task to open project detail.",
            "Uses cached project/task data when offline, then refreshes when online.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Search scope",
          text: "Search covers projects and task titles (and labels on web). It does not full-text search chat messages or document bodies — open Chats or Documents for that content.",
        },
      ],
    },
    notifications: {
      id: "notifications",
      title: "Notifications",
      description: "In-app alerts, WebSocket delivery, browser push, and mobile push toggles.",
      blocks: [
        { type: "h2", text: "Web" },
        {
          type: "ul",
          items: [
            "Header bell — dropdown grouped by time with unread highlight.",
            "Mark one read or Mark all read.",
            "WebSocket for live events; Firebase Cloud Messaging for browser push when enabled.",
          ],
        },
        { type: "h2", text: "Mobile" },
        {
          type: "ul",
          items: [
            "Bell on Home or screen /notifications.",
            "Sections: Today, Yesterday, Earlier — pull to refresh.",
            "Settings, General, Push notifications — requests OS permission when turned on.",
            "In-app toast banners while the app is foregrounded.",
          ],
        },
        {
          type: "p",
          text: "Copy and grouping follow backend event types (tasks, chats, meetings, invites, etc.). Wording may vary slightly per payload.",
        },
        { type: "h2", text: "Notification categories" },
        {
          type: "ul",
          items: [
            "Task — assignments, status changes, deadlines.",
            "Comment — new comments on tasks you follow.",
            "Mention — @mentions in chats (when supported by payload).",
            "Deadline — overdue and due-soon reminders.",
            "Invite — project, workspace, or org invitations with Accept/Decline.",
            "Chat — new messages when you are not viewing that thread.",
            "System — workspace and account events.",
          ],
        },
        { type: "h2", text: "Deep links from notifications" },
        {
          type: "p",
          text: "Clicking a notification opens the related entity: tasks via /projects/{id}?task=…, chats via /chats?chat=…, invites with inline Accept/Decline. Mark as read happens automatically when you open the detail view.",
        },
      ],
    },
    profile: {
      id: "profile",
      title: "Profile sheet & quick actions",
      description:
        "The web header profile menu — account shortcuts, theme, language, stats, and sign out.",
      blocks: [
        {
          type: "p",
          text: "On desktop web, click the avatar circle in the top-right header to open the profile sheet — a slide-in panel from the right edge.",
        },
        { type: "h2", text: "What you see" },
        {
          type: "ul",
          items: [
            "Display name derived from your email local-part until you set a display name in Settings.",
            "Email address from your authenticated identity (read-only here).",
            "Stat chips: project count in active workspace, open header tabs, unread notifications.",
          ],
        },
        { type: "h2", text: "Menu actions" },
        {
          type: "ul",
          items: [
            "My account — opens /settings?tab=account for bio and sessions.",
            "Settings — opens /settings on the General tab (workspace name, language, click ripple).",
            "Notifications — opens the same bell sheet as the header notification icon.",
            "Sign out — ends the current web session.",
          ],
        },
        { type: "h2", text: "Header shortcuts (outside the sheet)" },
        {
          type: "p",
          text: "Theme toggle (sun/moon) and language switcher sit next to the bell in the header — you do not need to open the profile sheet to change appearance or locale. Theme persists in local storage and respects system preference on first visit.",
        },
        { type: "h2", text: "Mobile equivalent" },
        {
          type: "p",
          text: "Mobile consolidates profile editing under Settings, Account — display name, bio, email, sessions, and sign out. Theme and language live under Settings, General alongside push notification toggle.",
        },
      ],
    },
    settings: {
      id: "settings",
      title: "Settings",
      description: "General preferences, account profile, sessions, and workspace members.",
      blocks: [
        {
          type: "p",
          text: "Web: /settings with tabs. Mobile: Settings tab with the same three sections.",
        },
        { type: "h2", text: "General" },
        {
          type: "ul",
          items: [
            "Workspace name — rename active workspace (minimum 3 characters).",
            "Language — English, Русский, Deutsch.",
            "Appearance — light/dark theme; web adds optional click ripple.",
            "Push notifications (mobile) — master toggle for device push.",
          ],
        },
        { type: "h2", text: "Account" },
        {
          type: "ul",
          items: [
            "Display name and bio saved to your profile.",
            "Email shown read-only from auth identity.",
            "Active sessions — revoke other devices.",
          ],
        },
        { type: "h2", text: "Members" },
        {
          type: "ul",
          items: [
            "Read-only member list with search.",
            "Shows display name, user id, active/inactive status.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          text: "Web profile menu links to Settings, Account via ?tab=account for bio and sessions.",
        },
      ],
    },
    analytics: {
      id: "analytics",
      title: "Insights & analytics",
      description: "Full metrics on web; sample charts on mobile Insights; live widgets on Home.",
      blocks: [
        { type: "h2", text: "Web — /analytics" },
        {
          type: "p",
          text: "Team performance from real tasks: velocity-style metrics, cycle time, throughput, category breakdown, burndown-style views, team table, and flow funnel. Data refreshes for the active workspace.",
        },
        { type: "h2", text: "Mobile — /analytics" },
        {
          type: "callout",
          variant: "info",
          text: "Mobile Insights uses sample chart data for layout preview. Use web Insights or Home widgets fed by the live analytics API for production numbers.",
        },
        { type: "h2", text: "Home widgets" },
        {
          type: "p",
          text: "Mobile Home shows compact productivity and task breakdown charts when the analytics API responds.",
        },
      ],
    },
    "web-vs-mobile": {
      id: "web-vs-mobile",
      title: "Web vs mobile",
      description: "When to use desktop web, when to use the native app, and what happens in a mobile browser.",
      blocks: [
        {
          type: "p",
          text: "Julow ships two clients on one backend. Parity is a goal, but some surfaces remain desktop-first until mobile APIs catch up.",
        },
        { type: "h2", text: "Prefer web (desktop)" },
        {
          type: "ul",
          items: [
            "Wide kanban with drag-and-drop.",
            "Full document library with upload and folders.",
            "Complete Insights chart suite from live tasks.",
            "Chats with resizable panels and rich attachments.",
            "Multi-project header tabs.",
          ],
        },
        { type: "h2", text: "Prefer mobile" },
        {
          type: "ul",
          items: [
            "Daily phone use — Home, Projects, Chats, Search.",
            "QR login to web without typing passwords.",
            "Push notifications and joining meetings on the go.",
            "Gantt view on project boards.",
          ],
        },
        { type: "h2", text: "Web in a phone browser" },
        {
          type: "p",
          text: "Protected routes show a download prompt with Android APK link instead of the desktop shell. Install the native app for the intended experience.",
        },
        {
          type: "code",
          text: "Web: https://julow.ru\nMobile: APK or dev build distributed by your team",
        },
      ],
    },
    "mobile-app": {
      id: "mobile-app",
      title: "Mobile app in depth",
      description:
        "Native Android experience — tabs, offline cache, push, QR login, meetings stack, and platform-specific UI patterns.",
      blocks: [
        {
          type: "p",
          text: "The Julow mobile app is the intended experience on phones. It shares the julow.ru backend with web but optimizes navigation for one-handed use, push alerts, and offline resilience.",
        },
        { type: "h2", text: "Bottom tabs" },
        {
          type: "ul",
          items: [
            "Home — dashboard summary, meetings entry, notifications, workspace switcher, invite join.",
            "Projects — all accessible projects with pull-to-refresh.",
            "Chats — workspace chat list with unread badges.",
            "Settings — General, Account, Members; documentation link; QR scan; sign out.",
            "Search — global project and task lookup.",
          ],
        },
        { type: "h2", text: "Stack screens (above tabs)" },
        {
          type: "ul",
          items: [
            "project/[id] — board, list, or gantt with task sheets.",
            "chat/[id] — conversation thread.",
            "task/[id]/comments — task comment thread.",
            "meetings/index, meetings/[id]/room — schedule and in-call UI.",
            "notifications — full notification history.",
            "docs — this documentation with horizontal section chips.",
            "qr-scan — camera scanner for web login pairing.",
          ],
        },
        { type: "h2", text: "Offline and cache" },
        {
          type: "p",
          text: "Mobile caches projects, tasks, chats, and messages locally. When the network drops, you can still browse recently synced data. Mutations (new tasks, messages, status changes) queue in a local mutation queue and flush automatically when connectivity returns.",
        },
        { type: "h3", text: "What works offline" },
        {
          type: "ul",
          items: [
            "Read previously loaded project boards and task lists.",
            "Read chat history that was synced before disconnect.",
            "Compose messages and task updates — they send when online.",
            "Search within cached projects and tasks.",
          ],
        },
        { type: "h2", text: "Push notifications" },
        {
          type: "steps",
          items: [
            {
              title: "Enable in Settings",
              body: "Settings, General, Push notifications — toggle on.",
            },
            {
              title: "Grant OS permission",
              body: "Android shows the system permission dialog on first enable.",
            },
            {
              title: "Receive alerts",
              body: "Background pushes for tasks, chats, meetings; in-app toast banners while foregrounded.",
            },
          ],
        },
        { type: "h2", text: "QR login to web" },
        {
          type: "p",
          text: "Settings includes Scan QR to sign in on web. After scanning the code at julow.ru/login/qr, confirm the browser session — useful on shared desktops.",
        },
        { type: "h2", text: "Preview vs live data" },
        {
          type: "callout",
          variant: "info",
          title: "Documents and Insights tabs",
          text: "Mobile Documents and the standalone Analytics tab may show sample layout data. Home widgets and web Insights use live task analytics. Prefer web /documents for full file management until mobile connects to the same file APIs.",
        },
        {
          type: "card",
          variant: "tip",
          title: "Install source",
          body: "Production APK distribution is managed by your team. The web mobile gate at julow.ru links to the current Android build for phone browsers.",
        },
      ],
    },
    faq: {
      id: "faq",
      title: "FAQ",
      description: "Answers to common questions about Julow's interface and workflows.",
      blocks: [
        { type: "h2", text: "Account and access" },
        { type: "h3", text: "Why can't I sign in with password after using Google?" },
        {
          type: "p",
          text: "Julow binds one primary auth method per email. If you registered with OAuth, password login is blocked — and vice versa. The sign-in screen shows a dialog telling you which method to use.",
        },
        { type: "h3", text: "How do I sign in on a shared computer without typing my password?" },
        {
          type: "p",
          text: "Open julow.ru/login/qr on the desktop, then on your phone go to Settings and tap Scan QR to approve the session.",
        },
        { type: "h3", text: "Where do I revoke old sessions?" },
        {
          type: "p",
          text: "Settings, Account lists every active session with device label, IP, and last activity. Revoke any session except the current one.",
        },
        { type: "h2", text: "Projects and tasks" },
        { type: "h3", text: "Why don't I see a teammate's project?" },
        {
          type: "p",
          text: "You need an invitation. Ask for an invite link or check Notifications for a pending invite. After accepting, the project appears under its workspace on /projects.",
        },
        { type: "h3", text: "What does the progress bar on a project card mean?" },
        {
          type: "p",
          text: "It shows completion of tasks assigned to you — not the whole team backlog. Done means the task's workflow column category is done.",
        },
        { type: "h3", text: "Can I use Gantt on web?" },
        {
          type: "p",
          text: "Yes. Open a project and switch to Gantt in the toolbar. Zoom controls adjust the timeline scale.",
        },
        { type: "h2", text: "Chats and meetings" },
        { type: "h3", text: "Why am I not getting chat notifications while the chat is open?" },
        {
          type: "p",
          text: "Julow suppresses duplicate notifications for the chat you currently have active — this reduces noise during focused conversations.",
        },
        { type: "h3", text: "Why must I pick a project when creating a meeting?" },
        {
          type: "p",
          text: "Meetings are project-scoped so all project members receive invites and notifications automatically.",
        },
        { type: "h2", text: "Mobile and web" },
        { type: "h3", text: "Why does julow.ru on my phone show a download page?" },
        {
          type: "p",
          text: "The desktop web UI requires at least 768px width. Phone browsers are directed to install the native app for the intended experience.",
        },
        { type: "h3", text: "Does changing language on web affect mobile?" },
        {
          type: "p",
          text: "Yes — language is stored on your account profile and applies across clients after sync.",
        },
        { type: "h3", text: "Where is documentation in the app?" },
        {
          type: "p",
          text: "Settings includes a documentation link, or open the docs screen with horizontal section chips — the same content as julow.ru/docs.",
        },
      ],
    },
    "keyboard-shortcuts": {
      id: "keyboard-shortcuts",
      title: "Keyboard shortcuts (web)",
      description: "Desktop browser shortcuts for faster navigation on julow.ru.",
      blocks: [
        {
          type: "p",
          text: "Julow's web app supports a focused set of keyboard interactions. There is no global shortcut cheat sheet overlay yet — this section lists what works today.",
        },
        { type: "h2", text: "Global" },
        {
          type: "ul",
          items: [
            "Cmd+F / Ctrl+F — focus header search.",
            "Esc — close search dropdown, notification sheet, or profile sheet when open.",
            "Arrow Up / Arrow Down + Enter — navigate search results.",
          ],
        },
        { type: "h2", text: "Project header tabs" },
        {
          type: "ul",
          items: [
            "Double-click a tab — rename the tab label.",
            "Enter while renaming — save tab name.",
            "Escape while renaming — cancel rename.",
            "Right-click a tab — context menu (color, duplicate, close, unpin).",
          ],
        },
        { type: "h2", text: "Project board" },
        {
          type: "ul",
          items: [
            "Drag-and-drop — move tasks between columns (board and list views).",
            "Click a task card — open detail panel with comments and attachments.",
          ],
        },
        { type: "h2", text: "Chat split view" },
        {
          type: "p",
          text: "On /chats the resizable divider between list and thread responds to mouse drag. No dedicated keyboard resize shortcuts.",
        },
        {
          type: "callout",
          variant: "info",
          title: "Mobile",
          text: "The native app relies on touch gestures — pull to refresh, back swipe, and bottom sheet drag handles. There are no hardware keyboard shortcut bindings on mobile.",
        },
      ],
    },
    troubleshooting: {
      id: "troubleshooting",
      title: "Troubleshooting",
      description: "Fix common issues with sign-in, sync, notifications, and calls.",
      blocks: [
        { type: "h2", text: "Sign-in problems" },
        {
          type: "ul",
          items: [
            "Wrong method dialog — use the provider shown (Google, GitHub, Yandex, Apple, or email password).",
            "OAuth callback errors — ensure you complete the flow in the same browser tab; check pop-up blockers.",
            "QR expired — refresh julow.ru/login/qr and scan again within the time limit.",
          ],
        },
        { type: "h2", text: "Data not updating" },
        {
          type: "ul",
          items: [
            "Web — hard refresh or switch workspace to force context reload.",
            "Mobile — pull to refresh on Home, Projects, or Chats.",
            "After accepting an invite — wait for router refresh or reopen /projects.",
            "Offline mobile — queued changes sync when connectivity returns.",
          ],
        },
        { type: "h2", text: "Notifications" },
        {
          type: "ul",
          items: [
            "Web push — allow browser notifications when prompted; check site permissions in browser settings.",
            "Mobile push — Settings, General, enable Push and grant Android notification permission.",
            "Missing chat alerts while chatting — expected suppression for the active thread.",
          ],
        },
        { type: "h2", text: "Meetings and LiveKit" },
        {
          type: "ul",
          items: [
            "Allow microphone and camera in browser or app OS permissions.",
            "Screen share needs strong uplink — prefer wired Ethernet or stable Wi‑Fi.",
            "If stuck in a room after leaving — open /meetings and confirm no active session redirect.",
          ],
        },
        { type: "h2", text: "Documents" },
        {
          type: "p",
          text: "Upload failures usually indicate permission or size limits from the backend. Retry from /documents with a supported file type. Mobile document management is preview-only until API parity ships.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Still stuck?",
          text: "Note your workspace name, browser or app version, and exact URL when contacting your team admin. Revoke suspicious sessions under Settings, Account immediately if you suspect unauthorized access.",
        },
      ],
    },
    "docs-guide": {
      id: "docs-guide",
      title: "Using this documentation",
      description: "How the guide is organized on web and in the mobile app.",
      blocks: [
        {
          type: "p",
          text: "This documentation describes only features that exist in Julow today — not a roadmap. Content is available in English, Russian, and German matching your app language.",
        },
        { type: "h2", text: "On web (/docs)" },
        {
          type: "ul",
          items: [
            "Left sidebar — grouped topics with icons; stays visible on desktop.",
            "Center column — readable article width (~800px) with callouts, steps, and tip cards.",
            "Narrow screens — menu button opens a slide-in sidebar drawer.",
            "Deep links — /docs/{section} (for example /docs/auth) for sharing with teammates.",
          ],
        },
        { type: "h2", text: "In the mobile app" },
        {
          type: "ul",
          items: [
            "Open from Settings or the documentation entry your build exposes.",
            "Horizontal section chips scroll at the top; tap to switch articles.",
            "Vertical scroll for the full section body — same text as web.",
          ],
        },
        {
          type: "card",
          variant: "tip",
          title: "For PMs and onboarding",
          body: "Share deep links to Getting started and Web vs mobile in welcome emails. Pair QR login docs with your security guidelines for distributed teams.",
        },
      ],
    },
  },
};
