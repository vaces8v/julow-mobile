import type { DocsContent } from "../types";

export const de: DocsContent = {
  pageTitle: "Dokumentation",
  pageSubtitle:
    "Vollständiges Julow-Benutzerhandbuch — Web und Mobile unter julow.ru für Projektmanager, Teamleiter und tägliche Arbeit.",
  navGroups: [
    {
      label: "Start",
      sections: ["getting-started", "auth", "navigation", "workspace", "invites", "docs-guide"],
    },
    {
      label: "Arbeit",
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
      label: "Konto",
      sections: ["notifications", "profile", "settings", "analytics"],
    },
    {
      label: "Plattformen",
      sections: ["web-vs-mobile", "mobile-app"],
    },
    {
      label: "Hilfe",
      sections: ["faq", "keyboard-shortcuts", "troubleshooting"],
    },
  ],
  sections: {
    "getting-started": {
      id: "getting-started",
      title: "Erste Schritte",
      description:
        "Was Julow ist, wie Workspaces Ihr Team organisieren und was Sie direkt nach der Anmeldung sehen.",
      blocks: [
        {
          type: "p",
          text: "Julow ist ein Team-Workspace für Projekte, Aufgaben, Chats, Dateien und Videomeetings. Alle Funktionen leben in einem Workspace — dem gemeinsamen Container Ihres Teams für Mitglieder, Projekte und Berechtigungen.",
        },
        { type: "h2", text: "Grundkonzepte" },
        {
          type: "ul",
          items: [
            "Workspace — ein Team-Bereich; Sie können mehreren angehören (auch als Gast).",
            "Projekt — Board mit Workflow-Spalten und Aufgaben; oft mit Projekt-Chat verknüpft.",
            "Aufgabe — Arbeitseinheit mit Zuständigen, Priorität, Fälligkeitsdatum und Workflow-Status.",
            "Chat — Echtzeit-Nachrichten, oft an ein Projekt gebunden.",
            "Meeting — geplanter oder sofortiger Videoanruf (LiveKit).",
            "Dokument — Dateien in der Workspace-Bibliothek: Uploads oder Anhänge aus Chats und Aufgaben.",
          ],
        },
        { type: "h2", text: "Production URLs (julow.ru)" },
        {
          type: "code",
          text: "Web app: https://julow.ru\nSign in: https://julow.ru/login\nDashboard: https://julow.ru/workspace\nDocumentation: https://julow.ru/docs",
        },
        { type: "h2", text: "Nach der Anmeldung" },
        {
          type: "steps",
          items: [
            {
              title: "Web (Desktop-Browser)",
              body: "Sie landen auf dem Dashboard unter /workspace — Aufgabensummen, überfällige Items, Quick Add und ein Wochen-Aktivitätsdiagramm aus Live-Daten.",
            },
            {
              title: "Mobile (native App)",
              body: "Der Home-Tab zeigt eine ähnliche Übersicht, Meeting-Kurzwege, Benachrichtigungseingang und kompakte Analytics-Widgets, wenn die API verfügbar ist.",
            },
            {
              title: "Sprache wählen",
              body: "Öffnen Sie Settings, dann General, und wählen Sie English, Русский oder Deutsch. Die Wahl gilt für Web und Mobile in Ihrem Konto.",
            },
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Desktop-first Web",
          text: "Die Web-App richtet sich an Bildschirme ab 768px. Im Handy-Browser sehen Sie einen Installationshinweis für die native App statt der vollen Desktop-Oberfläche.",
        },
        {
          type: "card",
          variant: "tip",
          title: "Checkliste für die ersten 30 Minuten",
          body: "Wechseln Sie zum richtigen Workspace, überfliegen Sie das Dashboard, erstellen oder öffnen Sie ein Projekt, Quick Add eine Aufgabe, schreiben Sie im Projekt-Chat, pinnen Sie das Projekt in Header-Tabs und prüfen Sie Settings (Sprache und Sitzungen).",
        },
        { type: "h2", text: "Für wen ist dieser Leitfaden" },
        {
          type: "p",
          text: "Projektmanager können Deep Links wie /docs/invites oder /docs/mobile-app beim Onboarding teilen. Mitwirkende erhalten Schritt-für-Schritt-UI-Pfade. Admins sollten Sitzungs-Docs mit Ihrer Geräterichtlinie kombinieren.",
        },
      ],
    },
    auth: {
      id: "auth",
      title: "Anmeldung und Konto",
      description: "E-Mail, OAuth, QR-Kopplung, Registrierung und Sitzungsverwaltung im Web und in der Mobile-App.",
      blocks: [
        { type: "h2", text: "Web-Anmeldung (/login)" },
        {
          type: "ul",
          items: [
            "E-Mail und Passwort mit optional Remember me.",
            "OAuth — Google, GitHub, Yandex und Apple, wenn Ihr Deployment sie aktiviert.",
            "QR-Anmeldung — /login/qr auf dem Desktop; Bestätigung aus der Mobile-App.",
            "Registrierung unter /register — erstellt ein Konto im Personal-Plan.",
          ],
        },
        { type: "h2", text: "QR-Anmeldeablauf" },
        {
          type: "steps",
          items: [
            { title: "Am Desktop", body: "Öffnen Sie /login/qr. QR-Code und Sitzungs-ID erscheinen und aktualisieren sich bis zum Scan oder Ablauf." },
            { title: "Auf Mobile", body: "Melden Sie sich an, öffnen Sie Settings, tippen Sie Scan QR to sign in on web und bestätigen Sie die Browser-Sitzung." },
            { title: "Ergebnis", body: "Der Web-Tab schließt die Anmeldung ab, ohne Ihr Passwort auf einer gemeinsamen Tastatur einzugeben." },
          ],
        },
        { type: "h2", text: "Mobile-Anmeldung" },
        {
          type: "ul",
          items: [
            "Gleiche E-Mail/Passwort- und OAuth-Anbieter wie im Web.",
            "Settings enthält Scan QR zur Bestätigung einer ausstehenden Web-Sitzung.",
            "Biometrie hängt von Ihrem OS ab — Julow speichert das Sitzungstoken nach der ersten Anmeldung.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "OAuth vs. Passwort",
          text: "Wurde Ihre E-Mail per OAuth registriert, ist Passwort-Anmeldung gesperrt — und umgekehrt. Julow zeigt einen Dialog mit dem passenden Verfahren.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Gemeinsame Computer",
          text: "Bevorzugen Sie QR-Anmeldung auf nicht vertrauenswürdigen Desktops. Widerrufen Sie alte Sitzungen unter Settings → Account nach Nutzung eines öffentlichen Rechners.",
        },
        { type: "h2", text: "Sitzungen" },
        {
          type: "p",
          text: "Settings → Account listet aktive Sitzungen mit Gerätename, IP und letzter Aktivität. Widerrufen Sie jede Sitzung außer der aktuellen. Web nutzt httpOnly-Cookies; Mobile speichert Tokens für API-Aufrufe.",
        },
      ],
    },
    navigation: {
      id: "navigation",
      title: "Navigation",
      description: "Sidebar, Header-Tabs, Suche und mobile Bottom-Navigation — orientiert bleiben.",
      blocks: [
        { type: "h2", text: "Web-Sidebar — Main" },
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
        { type: "h2", text: "Web-Sidebar — Tools" },
        {
          type: "ul",
          items: [
            "Meet — /meetings zum Planen und Beitreten von Videoanrufen.",
            "Documentation — /docs (dieser Leitfaden, auch unter Tools).",
          ],
        },
        { type: "h2", text: "Web-Header" },
        {
          type: "ul",
          items: [
            "Projekt-Tabs — angepinnte Projekte im Browser-Stil; Tab-Menü: umbenennen, Farbe, lösen, andere schließen.",
            "Search — globale Suche nach Aufgaben und Projekten im aktiven Workspace.",
            "Notifications — Glocke mit Ungelesen-Zähler; alle als gelesen markieren im Dropdown.",
            "Profile — Konto-Kurzwege, Theme, Sprache, Abmelden.",
          ],
        },
        { type: "h2", text: "Mobile Bottom-Tabs" },
        {
          type: "ul",
          items: [
            "Home — Dashboard, Meeting-Einstieg, Benachrichtigungsglocke.",
            "Projects — Projekte listen und erstellen.",
            "Chats — Workspace-Chatliste.",
            "Settings — Profil, Workspace, Push, QR-Anmeldung.",
            "Search — eigener Tab für Projekte und Aufgaben.",
          ],
        },
        {
          type: "p",
          text: "Stack-Screens (Projektboard, Chat, Meetings, Benachrichtigungen) öffnen über der Tab-Leiste. Zurück-Taste oder OS-Zurück-Geste führt zu den Tabs.",
        },
        {
          type: "card",
          variant: "tip",
          title: "Projekte im Web anpinnen",
          body: "Pinnen Sie häufig genutzte Projekte in Header-Tabs, um Boards zu wechseln, während Sie in Chats oder Documents bleiben.",
        },
      ],
    },
    workspace: {
      id: "workspace",
      title: "Workspaces und Wechsel",
      description:
        "Wie Workspaces Teams organisieren, wie Sie wechseln und wie Gastprojekte aus Einladungen neben Ihren eigenen erscheinen.",
      blocks: [
        {
          type: "p",
          text: "Ein Workspace ist Julows oberster Team-Container. Ihr Konto kann einem oder mehreren Workspaces angehören. Die meisten Alltags-Screens — Dashboard, Insights, Documents, Umbenennung in Settings — nutzen den aktiven Workspace. Eingeladene Projekte können in anderen Workspaces liegen und erscheinen trotzdem auf /projects ohne Wechsel.",
        },
        { type: "h2", text: "Aktiver Workspace" },
        {
          type: "p",
          text: "Der aktive Workspace bestimmt, welche Aufgaben Dashboard und Insights speisen, welche Dateien zuerst in Documents erscheinen und welchen Namen Sie unter Settings → General bearbeiten. Beim Wechsel werden Workspace-Daten neu geladen, die Sitzung bleibt.",
        },
        { type: "h2", text: "Wechsel im Web" },
        {
          type: "steps",
          items: [
            {
              title: "Workspace-Umschalter öffnen",
              body: "In der linken Sidebar den Workspace-Selector unter dem Julow-Logo. Er listet alle Workspaces mit Anzeigenamen.",
            },
            {
              title: "Workspace wählen",
              body: "Klicken Sie einen anderen Workspace. Die App aktualisiert Projekte, Dashboard-Metriken und Settings-Kontext für dieses Team.",
            },
            {
              title: "Auf dem Dashboard prüfen",
              body: "Öffnen Sie /workspace und prüfen Sie, dass Aufgabensummen und Quick Add zum gewünschten Team gehören.",
            },
          ],
        },
        { type: "h2", text: "Wechsel auf Mobile" },
        {
          type: "p",
          text: "Auf dem Home-Tab tippen Sie den Workspace-Namen in der Kopfzeile für die Auswahl. Nach dem Wechsel Pull-to-Refresh auf Home oder Settings, um Projekte und Cache zu synchronisieren.",
        },
        { type: "h2", text: "Gast- und Cross-Workspace-Projekte" },
        {
          type: "ul",
          items: [
            "Bei Projekteinladung erhalten Sie Zugang, ohne Ihren Heimat-Workspace zu verlassen.",
            "Die Projects-Seite (/projects) listet alle Projekte gruppiert nach Workspace-Namen.",
            "Aktiver Workspace zuerst; Gast-Sektionen zeigen andere Workspaces mit eingeladenen Projekten.",
            "Fortschrittsbalken auf Karten — nur Ihre zugewiesenen Aufgaben, nicht der gesamte Team-Backlog.",
            "Neues Projekt entsteht immer im aktuell aktiven Workspace.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Warum Gastprojekte sichtbar bleiben",
          text: "Julow lädt alle Projekte über GET /projects/mine aus allen Workspaces. Eingeladene Arbeit erscheint sofort nach Accept — Sie müssen nicht raten, welchen Workspace Sie zuerst wählen.",
        },
        { type: "h2", text: "Workspace umbenennen" },
        {
          type: "p",
          text: "Settings → General erlaubt Eigentümern, den aktiven Workspace umzubenennen (mindestens 3 Zeichen). Die Änderung bleibt im Backend und aktualisiert die Sidebar nach dem Speichern.",
        },
      ],
    },
    invites: {
      id: "invites",
      title: "Einladungen und Gastzugang",
      description:
        "Projekten per Einladungslink oder Code beitreten, aus Benachrichtigungen annehmen und Gast-Sichtbarkeit auf der Projects-Seite verstehen.",
      blocks: [
        {
          type: "p",
          text: "Julow unterstützt Projekt-, Workspace- und Organisations-Einladungen. Am häufigsten sind Projekteinladungen — ein Kollege teilt einen Link, Sie erhalten Zugang zu einem Board und dessen Chat.",
        },
        { type: "h2", text: "Einstiegspunkte für Einladungen" },
        {
          type: "ul",
          items: [
            "Öffentliche Seite — https://julow.ru/invite — vollständigen Link oder Token einfügen.",
            "Direktlink — /invite/{token} zeigt Vorschau mit Projektname und Accept / Decline.",
            "Auth gate — /invite/auth, wenn Sie sich vor Accept anmelden müssen.",
            "Dashboard Quick Join — /workspace mit invite-code-Feld (Web und Mobile Home).",
            "Notifications — Einladungsereignisse mit Accept und Decline in der Glocken-Leiste.",
          ],
        },
        { type: "h2", text: "Einladung annehmen" },
        {
          type: "steps",
          items: [
            {
              title: "Link öffnen oder Code einfügen",
              body: "Aus E-Mail oder Chat https://julow.ru/invite/… öffnen oder auf /invite bzw. ins Dashboard-Join-Feld einfügen.",
            },
            {
              title: "Bei Aufforderung anmelden",
              body: "Neue Nutzer registrieren unter /register; Bestehende melden sich unter /login an. OAuth wie bei normaler Anmeldung.",
            },
            {
              title: "Annahme bestätigen",
              body: "Auf der Vorschau Accept tippen. Julow fügt Sie dem Projekt hinzu und aktualisiert Ihre Projektliste.",
            },
            {
              title: "Zum Projekt wechseln",
              body: "Nach Accept Weiterleitung zu /projects/{id}. Das Projekt erscheint auch in seiner Workspace-Sektion auf /projects.",
            },
          ],
        },
        { type: "h2", text: "Ablehnen oder ignorieren" },
        {
          type: "p",
          text: "Im Benachrichtigungs-Detail Decline wählen — Einladung abgelehnt, Aktionsbuttons verschwinden. Ignorieren lässt die Einladung pending bis zum Ablauf laut Backend-Richtlinie.",
        },
        { type: "h2", text: "Gast-Erfahrung" },
        {
          type: "ul",
          items: [
            "Gastprojekte zeigen den Host-Workspace-Namen auf Projektkarten.",
            "Chat, Aufgaben, Meetings und Uploads gemäß Projektberechtigungen.",
            "Workspace-Umbenennung und Mitgliederliste in Settings beziehen sich auf den aktiven Workspace — nicht auf jeden Gast-Workspace.",
            "Search und Header-Tabs behandeln Gastprojekte wie eigene.",
          ],
        },
        {
          type: "callout",
          variant: "warning",
          title: "Links vorsichtig teilen",
          text: "Einladungstoken gewähren Projektdatenzugang. Senden Sie sie über vertrauenswürdige Kanäle und entziehen Sie Zugang durch Entfernen des Mitglieds in den Projekteinstellungen.",
        },
      ],
    },
    dashboard: {
      id: "dashboard",
      title: "Dashboard",
      description:
        "Der /workspace-Startbildschirm — Live-Metriken, Quick Add, Aktivitätsfeed, Diagramme und Beitritt per Invite-Code.",
      blocks: [
        {
          type: "p",
          text: "Das Dashboard ist Ihre Landing Page nach der Anmeldung unter /workspace (Sidebar: Dashboard). Es fasst den Aufgabenstatus des aktiven Workspace aus echten Backend-Daten zusammen — keine Platzhalter.",
        },
        { type: "h2", text: "Übersichtskarten" },
        {
          type: "ul",
          items: [
            "Gesamtzahl Ihrer zugewiesenen Aufgaben im aktiven Workspace.",
            "Overdue — Aufgaben nach Fälligkeit, die nicht in einer done-Workflow-Spalte sind.",
            "In progress — Aufgaben in active- oder review-Workflow-Kategorien.",
            "Completion rate — Anteil Ihrer zugewiesenen Aufgaben als done markiert.",
          ],
        },
        { type: "h2", text: "Quick Add" },
        {
          type: "steps",
          items: [
            {
              title: "Aufgabentitel eingeben",
              body: "Nutzen Sie das Quick-Add-Feld oben im Dashboard.",
            },
            {
              title: "Projekt wählen",
              body: "Wählen Sie aus Projekten des aktiven Workspace. Die Aufgabe wird mit Standard-Workflow-Status erstellt.",
            },
            {
              title: "Absenden",
              body: "Enter oder Add. Zähler und Diagramme aktualisieren beim nächsten Datenload.",
            },
          ],
        },
        { type: "h2", text: "Wöchentliches Aktivitätsdiagramm" },
        {
          type: "p",
          text: "Ein Flächendiagramm zeigt erstellte vs. abgeschlossene Aufgaben der letzten sieben Tage aus Task-Timestamps im Workspace. Hover-Tooltips zeigen exakte Tageszahlen.",
        },
        { type: "h2", text: "Letzte Aktivität" },
        {
          type: "p",
          text: "Scrollbare Liste recent Task-Events (erstellt, abgeschlossen) mit relativen Zeitstempeln. Klick öffnet die Aufgabe auf dem Board via /projects/{projectId}?task={taskId}.",
        },
        { type: "h2", text: "Beitritt per Invite-Code" },
        {
          type: "p",
          text: "Das Dashboard hat ein kompaktes invite-code-Feld. Token oder volle Invite-URL einfügen — Julow parst den Token wie bei /invite/{token}. Mobile Home bietet dasselbe Muster.",
        },
        { type: "h2", text: "Mobile Home-Tab" },
        {
          type: "ul",
          items: [
            "Ähnliche Stat-Chips und Diagramme bei verfügbarer Analytics-API.",
            "Meeting-Karten für geplante und Sofort-Anrufe.",
            "Benachrichtigungsglocke öffnet /notifications.",
            "Workspace-Umschalter in der Kopfzeile.",
            "Pull to refresh lädt gecachte Projekte und Aufgaben neu.",
          ],
        },
        {
          type: "card",
          variant: "tip",
          title: "Tägliches PM-Ritual",
          body: "Starten Sie morgens am Dashboard: Overdue prüfen, Wochendiagramm auf Throughput-Einbrüche scannen, Capture-Items per Quick Add, dann angepinnte Projekt-Tabs fürs Standup.",
        },
      ],
    },
    projects: {
      id: "projects",
      title: "Projekte",
      description: "Projekte erstellen, Status und Fortschritt lesen, Kanban-Boards öffnen und mobile Ansichts-Umschalter nutzen.",
      blocks: [
        {
          type: "p",
          text: "Projekte gehören zu einem Workspace. Sie sehen jedes eigene oder eingeladene Projekt, auch Gastzugang in anderen Workspaces.",
        },
        { type: "h2", text: "Projektliste (/projects)" },
        {
          type: "ul",
          items: [
            "Karten nach Workspace mit Status: Active, Paused, Archived, Completed.",
            "Fortschrittsbalken — Anteil Ihrer Aufgaben in done-Workflow-Spalten.",
            "Create project — Dialog mit Name und optionaler Beschreibung im aktiven Workspace.",
          ],
        },
        { type: "h2", text: "Projektboard (/projects/{id})" },
        {
          type: "steps",
          items: [
            { title: "Kanban-Spalten", body: "Spalten aus dem Projekt-Workflow (To do, In progress, Review, Done usw.). Karten zwischen Spalten ziehen." },
            { title: "Aufgabenkarte", body: "Klick auf Karte für Titel, Beschreibung, Zuständige, Priorität, Fälligkeit und Status." },
            { title: "Header-Tabs", body: "Projekt anpinnen, um schnell von Chats oder Documents zu wechseln ohne Kontextverlust." },
          ],
        },
        { type: "h2", text: "Mobile Projekte" },
        {
          type: "p",
          text: "Projects-Tab zeigt dieselben Daten. Karte tippen — Board mit Board-, List- oder Gantt-Umschalter oben.",
        },
        { type: "h2", text: "Projekt erstellen" },
        {
          type: "steps",
          items: [
            {
              title: "/projects öffnen",
              body: "Create project (Web) oder Plus-Steuerung im Mobile Projects-Tab.",
            },
            {
              title: "Name und Beschreibung",
              body: "Name ist Pflicht. Beschreibung optional, hilft dem Team beim Scope.",
            },
            {
              title: "Bestätigen",
              body: "Projekt entsteht im aktiven Workspace und erscheint in der ersten Listensektion.",
            },
          ],
        },
        { type: "h2", text: "Status-Badges" },
        {
          type: "ul",
          items: [
            "Active — Standard-Arbeitszustand.",
            "Paused — vorübergehend pausiert; Aufgaben bleiben, Team signalisiert reduzierte Velocity.",
            "Archived — vor allem Lesen, aus Standard-Flows ausgeblendet.",
            "Completed — Delivery abgeschlossen; nützlich für Portfolio-Reporting.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Sichtbarkeit über Workspaces",
          text: "Sie müssen nicht den Workspace wechseln, um eingeladene Projekte zu sehen. Sie erscheinen unter dem Host-Workspace-Namen auf derselben /projects-Seite.",
        },
      ],
    },
    "board-views": {
      id: "board-views",
      title: "Board, Liste und Gantt",
      description:
        "Wechsel zwischen Kanban, Tabellenliste und Gantt-Timeline im Web und in der Mobile-Projektansicht.",
      blocks: [
        {
          type: "p",
          text: "Jedes Projektboard unterstützt mehrere Visualisierungen derselben Aufgaben. Ansichtswechsel ändert keine Daten — nur Layout und Interaktion.",
        },
        { type: "h2", text: "Ansichts-Umschalter" },
        {
          type: "ul",
          items: [
            "Board — Spalten entsprechen Workflow-Status; Karten ziehen im Web.",
            "List — tabellarische Sektionen pro Status mit Prioritäts- und Fälligkeitsspalten im Web.",
            "Gantt — Timeline-Balken nach Start/Fälligkeit mit Zoom im Web und Mobile.",
          ],
        },
        { type: "h2", text: "Web — /projects/{id}" },
        {
          type: "steps",
          items: [
            {
              title: "Projekt öffnen",
              body: "Von /projects oder angepinntem Header-Tab zum Projektboard navigieren.",
            },
            {
              title: "Ansicht wählen",
              body: "Board / List / Gantt-Icons in der Projekt-Toolbar unter dem Header.",
            },
            {
              title: "Board Drag-and-Drop",
              body: "Aufgabenkarte in andere Spalte ziehen. Julow PATCHt die workflow status_id dieser Spalte.",
            },
            {
              title: "Gantt-Zoom",
              body: "Plus/Minus für Timeline-Skalierung (50%–200%). Horizontal scrollen bei langen Bereichen.",
            },
          ],
        },
        { type: "h2", text: "Mobile — Projektscreen" },
        {
          type: "p",
          text: "Projekt im Projects-Tab tippen. Icons oben wechseln Board, List, Gantt. Aufgabendetails im Bottom Sheet; Kommentare auf task/[id]/comments. Pull to refresh synchronisiert Board-Daten.",
        },
        { type: "h2", text: "Projekt-Toolbar-Aktionen" },
        {
          type: "ul",
          items: [
            "Add task — Erstellungsdialog (Web) oder Bottom Sheet (Mobile).",
            "Search within project — sichtbare Karten nach Titel filtern.",
            "Settings — Projektname, Beschreibung, Farbe, Archiv (Web-Dialog).",
            "Members — Mitgliedschaft anzeigen und verwalten (Web-Dialog).",
            "Pin to header — Projekt in Browser-Style-Tabs der Web-Shell.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "Workflow-Spalten vs. Ansicht",
          text: "Spaltennamen aus der Workflow-Konfiguration (To do, In progress, Review, Done usw.). List und Gantt gruppieren nach denselben Statuskategorien wie das Board.",
        },
      ],
    },
    tasks: {
      id: "tasks",
      title: "Aufgaben",
      description: "Workflow-Spalten, Quick Add, Aufgabendetails, Kommentare, Prioritäten und Deep Links.",
      blocks: [
        {
          type: "p",
          text: "Aufgaben sind die kleinste Arbeitseinheit in Julow. Jede Aufgabe gehört genau einem Projekt und durchläuft dessen Workflow-Spalten.",
        },
        { type: "h2", text: "Workflow-Status" },
        {
          type: "p",
          text: "Jedes Projekt definiert Workflow-Spalten mit Kategorien: todo, in_progress, review, done, blocked, cancelled. Done bedeutet Spaltenkategorie done — kein separates Legacy-Feld. Das Backend speichert status_id (UUID) auf eine Workflow-Status-Zeile.",
        },
        { type: "h3", text: "Bedeutung der Kategorien" },
        {
          type: "ul",
          items: [
            "todo — nicht begonnen; Standard für neue Aufgaben.",
            "in_progress — aktiv in Arbeit.",
            "review — wartet auf QA, Code Review oder Freigabe.",
            "done — abgeschlossen; zählt für Velocity und Completion Rate.",
            "blocked — kann nicht fortgesetzt werden; oft mit erklärendem Kommentar.",
            "cancelled — wird nicht erledigt; aus aktiver Planung ausgeschlossen.",
          ],
        },
        { type: "h2", text: "Prioritäten" },
        {
          type: "ul",
          items: [
            "critical — höchste Dringlichkeit; roter Indikator auf Karten.",
            "high — orangefarbener Indikator.",
            "medium — standardmäßig amber Indikator.",
            "low — gedämpfter Indikator.",
            "none — kein Prioritätspunkt wenn unset.",
          ],
        },
        { type: "h2", text: "Dashboard Quick Add" },
        {
          type: "p",
          text: "Unter /workspace Titel in Quick Add eingeben und Projekt wählen. Dashboard zeigt Totals, Overdue, Completion Rate und Wochendiagramm aus echten Aufgaben.",
        },
        { type: "h2", text: "Aufgaben auf dem Board erstellen" },
        {
          type: "steps",
          items: [
            {
              title: "Projekt öffnen",
              body: "Navigieren Sie zu /projects/{id} oder angepinntem Header-Tab.",
            },
            {
              title: "Add task",
              body: "Add in Spalte (Web) oder Plus (Mobile). Optional Spaltenstatus vorwählen.",
            },
            {
              title: "Details ausfüllen",
              body: "Titel ist Pflicht. Zuständige, Priorität, Fälligkeit, Beschreibung und Labels im Detailpanel setzen.",
            },
          ],
        },
        { type: "h2", text: "Aufgabendetails" },
        {
          type: "ul",
          items: [
            "Felder: title, description, assignees, priority, due date, start date (Gantt), workflow status, labels.",
            "Kommentar-Thread mit Text und Dateianhängen.",
            "Deep Link: /projects/{projectId}?task={taskId} — von Benachrichtigungen und Search genutzt.",
            "Mobile: vom Board oder List; Kommentare auf task/[id]/comments.",
          ],
        },
        { type: "h2", text: "Kommentare und Anhänge" },
        {
          type: "p",
          text: "Aufgabenkommentare unterstützen Text und Datei-Uploads. Anhänge zeigen Dateityp-Icons und Download-Links. Kommentar-Benachrichtigungen verlinken zurück zur Aufgabe aus der Glocken-Leiste.",
        },
        { type: "h2", text: "Suche" },
        {
          type: "p",
          text: "Header-Search im Web und Search-Tab auf Mobile suchen Aufgaben und Projekte nach Titel (und Labels im Web) in Ihren zugänglichen Workspaces.",
        },
      ],
    },
    chats: {
      id: "chats",
      title: "Chats",
      description: "Team-Nachrichten in Echtzeit, Anhänge und Desktop-Split-Layout.",
      blocks: [
        {
          type: "p",
          text: "Chats nutzen WebSocket-Zustellung. Solange ein Chat offen und aktiv ist, werden doppelte Benachrichtigungen für diesen Thread unterdrückt.",
        },
        { type: "h2", text: "Chatliste (/chats)" },
        {
          type: "ul",
          items: [
            "Projekt-Chats zeigen Projektfarbe und -name.",
            "Ungelesen-Badges aktualisieren sich live bei neuen Nachrichten.",
            "Search filtert die Liste nach Chat-Titel.",
          ],
        },
        { type: "h2", text: "Unterhaltung" },
        {
          type: "ul",
          items: [
            "Text senden; eingefügte URLs werden klickbare Links.",
            "Dateien anhängen; Bilder und Videos inline mit leichtem Video-Player.",
            "Desktop: resizable Split — Liste links, Thread rechts.",
          ],
        },
        { type: "h2", text: "Mobile Chats" },
        {
          type: "p",
          text: "Chats öffnen, Zeile tippen für /chat/{id}. Pull to refresh; Ungelesen-Zähler synchronisieren mit dem Backend.",
        },
      ],
    },
    meetings: {
      id: "meetings",
      title: "Meetings",
      description: "Anrufe planen, Sofort-Räume starten und In-Call-Steuerung nutzen (LiveKit).",
      blocks: [
        {
          type: "p",
          text: "Im Web Tools, dann Meet (/meetings). Auf Mobile Home-Kurzwege oder Meetings-Stack-Screen.",
        },
        { type: "h2", text: "Meeting-Liste" },
        {
          type: "ul",
          items: [
            "Status: Draft, Scheduled, In progress, Completed, Cancelled.",
            "Nach Projekt filtern; planen mit Titel, Datum, Uhrzeit, optionaler Projektverknüpfung.",
            "New room — sofortiger Ad-hoc-Anruf zum direkten Beitreten.",
          ],
        },
        { type: "h2", text: "Im Anruf" },
        {
          type: "ul",
          items: [
            "Web-Raum: /meetings/{id}/room — Mikrofon, Kamera, Bildschirmfreigabe, Verlassen.",
            "Mobile-Raum: meetings/[id]/room mit denselben Kernsteuerungen.",
            "Web Picture-in-Picture — Julow nutzen, während der Anruf schwebt.",
          ],
        },
        {
          type: "callout",
          variant: "info",
          title: "LiveKit",
          text: "Anrufqualität hängt von LiveKit-Deployment und Netz ab. Kabel oder stabiles Wi‑Fi für Bildschirmfreigabe.",
        },
      ],
    },
    documents: {
      id: "documents",
      title: "Dokumente",
      description: "Workspace-Dateibibliothek im Web; Preview-Zustand auf Mobile.",
      blocks: [
        { type: "h2", text: "Web — /documents" },
        {
          type: "ul",
          items: [
            "Ordnerbaum: All files, Projektordner, Uploads.",
            "Grid- oder Listenansicht; Sortierung nach Name, Datum, Größe oder Autor.",
            "Filter nach Dateityp und Quelle (project, chat, task, storage).",
            "Upload, Download, Umbenennen, Verschieben, Löschen bei Berechtigung.",
            "Ansichtszustand pro Workspace in local storage.",
          ],
        },
        { type: "h2", text: "Mobile — /documents" },
        {
          type: "callout",
          variant: "info",
          title: "Preview-Daten",
          text: "Der mobile Documents-Screen zeigt derzeit Sample-Dateien für UI-Preview. Nutzen Sie julow.ru/documents für echtes Dateimanagement, bis Mobile dieselben Backend-APIs nutzt.",
        },
      ],
    },
    search: {
      id: "search",
      title: "Suche",
      description:
        "Projekte und Aufgaben schnell finden — globale Header-Suche im Web und eigener Search-Tab auf Mobile.",
      blocks: [
        {
          type: "p",
          text: "Julow-Suche springt zur Arbeit ohne Listen zu durchsuchen. Beide Clients fragen Aufgaben und Projekte ab, auf die Sie in allen Workspaces Zugriff haben.",
        },
        { type: "h2", text: "Header-Suche im Web" },
        {
          type: "steps",
          items: [
            {
              title: "Feld fokussieren",
              body: "Suchfeld in der Kopfzeile anklicken oder Cmd+F (macOS) / Ctrl+F (Windows/Linux).",
            },
            {
              title: "Mindestens ein Zeichen",
              body: "Ergebnisse debouncen nach 250ms. Projekte lokal nach Name; Aufgaben via GET /tasks/mine?search=.",
            },
            {
              title: "Ergebnisse navigieren",
              body: "Pfeiltasten zum Markieren, Enter öffnen, Esc schließt Dropdown.",
            },
            {
              title: "Treffer öffnen",
              body: "Projekte → /projects/{id}. Aufgaben → /projects/{projectId}?task={taskId}.",
            },
          ],
        },
        { type: "h2", text: "Mobile Search-Tab" },
        {
          type: "ul",
          items: [
            "Bottom-Tab Search öffnet Vollbild-Suche.",
            "Getrennte Sektionen für passende Projekte und Aufgaben.",
            "Projekt tippen — Board; Aufgabe — Projektdetail.",
            "Offline gecachte Daten, online Refresh.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          title: "Suchumfang",
          text: "Search umfasst Projekte und Aufgabentitel (und Labels im Web). Kein Volltext in Chat-Nachrichten oder Dokumentinhalten — dafür Chats oder Documents öffnen.",
        },
      ],
    },
    notifications: {
      id: "notifications",
      title: "Benachrichtigungen",
      description: "In-App-Alerts, WebSocket, Browser-Push und Mobile-Push-Schalter.",
      blocks: [
        { type: "h2", text: "Web" },
        {
          type: "ul",
          items: [
            "Glocke in der Kopfzeile — Dropdown nach Zeit mit Ungelesen-Hervorhebung.",
            "Mark one read oder Mark all read.",
            "WebSocket für Live-Events; Firebase Cloud Messaging für Browser-Push wenn aktiviert.",
          ],
        },
        { type: "h2", text: "Mobile" },
        {
          type: "ul",
          items: [
            "Glocke auf Home oder Screen /notifications.",
            "Sektionen: Today, Yesterday, Earlier — pull to refresh.",
            "Settings → General → Push notifications — OS-Berechtigung beim Einschalten.",
            "In-App-Toast-Banner im Vordergrund.",
          ],
        },
        {
          type: "p",
          text: "Texte und Gruppierung folgen Backend-Event-Typen (tasks, chats, meetings, invites usw.). Formulierungen können je Payload leicht variieren.",
        },
        { type: "h2", text: "Benachrichtigungskategorien" },
        {
          type: "ul",
          items: [
            "Task — Zuweisungen, Statusänderungen, Fristen.",
            "Comment — neue Kommentare zu verfolgten Aufgaben.",
            "Mention — @mentions in Chats (wenn Payload unterstützt).",
            "Deadline — Overdue- und Bald-fällig-Erinnerungen.",
            "Invite — Projekt-, Workspace- oder Org-Einladungen mit Accept/Decline.",
            "Chat — neue Nachrichten, wenn Sie den Thread nicht ansehen.",
            "System — Workspace- und Kontoereignisse.",
          ],
        },
        { type: "h2", text: "Deep Links aus Benachrichtigungen" },
        {
          type: "p",
          text: "Klick öffnet die Entität: Aufgaben via /projects/{id}?task=…, Chats via /chats?chat=…, Invites mit inline Accept/Decline. Mark as read automatisch beim Öffnen der Detailansicht.",
        },
      ],
    },
    profile: {
      id: "profile",
      title: "Profil und Schnellaktionen",
      description:
        "Profilmenü in der Web-Kopfzeile — Konto-Kurzwege, Theme, Sprache, Statistik und Abmelden.",
      blocks: [
        {
          type: "p",
          text: "Im Desktop-Web Avatar oben rechts tippen — Profile Sheet, Slide-in-Panel von rechts.",
        },
        { type: "h2", text: "Was Sie sehen" },
        {
          type: "ul",
          items: [
            "Display name aus E-Mail-Local-Part, bis Sie einen Namen in Settings setzen.",
            "E-Mail aus authentifizierter Identität (hier read-only).",
            "Stat-Chips: Projektanzahl im aktiven Workspace, offene Header-Tabs, ungelesene Benachrichtigungen.",
          ],
        },
        { type: "h2", text: "Menüaktionen" },
        {
          type: "ul",
          items: [
            "My account — /settings?tab=account für Bio und Sitzungen.",
            "Settings — /settings auf General (Workspace-Name, Sprache, click ripple).",
            "Notifications — dieselbe Glocken-Leiste wie das Header-Icon.",
            "Sign out — beendet die aktuelle Web-Sitzung.",
          ],
        },
        { type: "h2", text: "Header-Kurzwege (außerhalb des Sheets)" },
        {
          type: "p",
          text: "Theme-Umschalter (Sonne/Mond) und Sprache neben der Glocke — Profile Sheet nicht nötig. Theme in local storage; beim ersten Besuch Systempräferenz.",
        },
        { type: "h2", text: "Mobile-Entsprechung" },
        {
          type: "p",
          text: "Mobile bündelt Profilbearbeitung unter Settings → Account — display name, bio, email, sessions, sign out. Theme und Sprache unter Settings → General neben Push-Toggle.",
        },
      ],
    },
    settings: {
      id: "settings",
      title: "Einstellungen",
      description: "Allgemeine Präferenzen, Kontoprofil, Sitzungen und Workspace-Mitglieder.",
      blocks: [
        {
          type: "p",
          text: "Web: /settings mit Tabs. Mobile: Settings-Tab mit denselben drei Sektionen.",
        },
        { type: "h2", text: "General" },
        {
          type: "ul",
          items: [
            "Workspace name — aktiven Workspace umbenennen (mindestens 3 Zeichen).",
            "Language — English, Русский, Deutsch.",
            "Appearance — hell/dunkel; Web optional click ripple.",
            "Push notifications (Mobile) — Master-Toggle für Device-Push.",
          ],
        },
        { type: "h2", text: "Account" },
        {
          type: "ul",
          items: [
            "Display name und bio im Profil gespeichert.",
            "E-Mail read-only aus Auth-Identität.",
            "Active sessions — andere Geräte widerrufen.",
          ],
        },
        { type: "h2", text: "Members" },
        {
          type: "ul",
          items: [
            "Read-only Mitgliederliste mit Search.",
            "Display name, user id, active/inactive Status.",
          ],
        },
        {
          type: "callout",
          variant: "tip",
          text: "Web-Profilmenü verlinkt Settings → Account via ?tab=account für Bio und Sitzungen.",
        },
      ],
    },
    analytics: {
      id: "analytics",
      title: "Insights und Analytik",
      description: "Volle Metriken im Web; Sample-Diagramme in Mobile Insights; Live-Widgets auf Home.",
      blocks: [
        { type: "h2", text: "Web — /analytics" },
        {
          type: "p",
          text: "Teamleistung aus echten Aufgaben: Velocity-Metriken, Cycle Time, Throughput, Kategorie-Breakdown, Burndown-Ansichten, Team-Tabelle und Flow-Funnel. Daten für den aktiven Workspace.",
        },
        { type: "h2", text: "Mobile — /analytics" },
        {
          type: "callout",
          variant: "info",
          text: "Mobile Insights nutzt Sample-Chart-Daten für Layout-Preview. Für Produktionszahlen Web Insights oder Home-Widgets mit live analytics API.",
        },
        { type: "h2", text: "Home-Widgets" },
        {
          type: "p",
          text: "Mobile Home zeigt kompakte Productivity- und Task-Breakdown-Diagramme, wenn die Analytics-API antwortet.",
        },
      ],
    },
    "web-vs-mobile": {
      id: "web-vs-mobile",
      title: "Web vs. Mobile",
      description: "Wann Desktop-Web, wann die native App — und was im Handy-Browser passiert.",
      blocks: [
        {
          type: "p",
          text: "Julow bietet zwei Clients auf einem Backend. Parität ist Ziel, manche Oberflächen bleiben desktop-first, bis Mobile-APIs nachziehen.",
        },
        { type: "h2", text: "Web bevorzugen (Desktop)" },
        {
          type: "ul",
          items: [
            "Breites Kanban mit Drag-and-Drop.",
            "Volle Dokumentenbibliothek mit Upload und Ordnern.",
            "Komplettes Insights-Diagramm-Set aus Live-Aufgaben.",
            "Chats mit resizable Panels und rich attachments.",
            "Multi-Project-Header-Tabs.",
          ],
        },
        { type: "h2", text: "Mobile bevorzugen" },
        {
          type: "ul",
          items: [
            "Tägliche Nutzung am Telefon — Home, Projects, Chats, Search.",
            "QR-Login ins Web ohne Passworteingabe.",
            "Push-Benachrichtigungen und Meetings unterwegs.",
            "Gantt-Ansicht auf Projektboards.",
          ],
        },
        { type: "h2", text: "Web im Handy-Browser" },
        {
          type: "p",
          text: "Geschützte Routen zeigen einen Download-Hinweis mit Android-APK-Link statt der Desktop-Shell. Installieren Sie die native App für die vorgesehene Erfahrung.",
        },
        {
          type: "code",
          text: "Web: https://julow.ru\nMobile: APK oder Dev-Build von Ihrem Team",
        },
      ],
    },
    "mobile-app": {
      id: "mobile-app",
      title: "Mobile App im Detail",
      description:
        "Native Android — Tabs, Offline-Cache, Push, QR-Login, Meetings-Stack und plattformspezifische UI.",
      blocks: [
        {
          type: "p",
          text: "Die Julow Mobile App ist die vorgesehene Erfahrung auf Telefonen. Gemeinsames julow.ru-Backend mit dem Web, Navigation optimiert für Einhandbedienung, Push und Offline-Resilienz.",
        },
        { type: "h2", text: "Bottom-Tabs" },
        {
          type: "ul",
          items: [
            "Home — Dashboard-Zusammenfassung, Meeting-Einstieg, Benachrichtigungen, Workspace-Umschalter, Invite Join.",
            "Projects — alle zugänglichen Projekte mit Pull-to-Refresh.",
            "Chats — Workspace-Chatliste mit Ungelesen-Badges.",
            "Settings — General, Account, Members; Dokumentationslink; QR-Scan; Abmelden.",
            "Search — globale Projekt- und Aufgabensuche.",
          ],
        },
        { type: "h2", text: "Stack-Screens (über Tabs)" },
        {
          type: "ul",
          items: [
            "project/[id] — Board, List oder Gantt mit Task Sheets.",
            "chat/[id] — Konversations-Thread.",
            "task/[id]/comments — Aufgaben-Kommentar-Thread.",
            "meetings/index, meetings/[id]/room — Planung und In-Call-UI.",
            "notifications — vollständiger Benachrichtigungsverlauf.",
            "docs — diese Dokumentation mit horizontalen Section Chips.",
            "qr-scan — Kamera-Scanner für Web-Login-Pairing.",
          ],
        },
        { type: "h2", text: "Offline und Cache" },
        {
          type: "p",
          text: "Mobile cached Projekte, Aufgaben, Chats und Nachrichten lokal. Bei Netzwerkausfall können Sie kürzlich synchronisierte Daten lesen. Mutationen (neue Aufgaben, Nachrichten, Status) in einer lokalen Queue — automatisches Senden bei Verbindung.",
        },
        { type: "h3", text: "Was offline funktioniert" },
        {
          type: "ul",
          items: [
            "Zuvor geladene Projektboards und Aufgabenlisten lesen.",
            "Chat-Verlauf, der vor dem Disconnect synchronisiert war.",
            "Nachrichten und Aufgaben-Updates verfassen — Versand bei Online.",
            "Search in gecachten Projekten und Aufgaben.",
          ],
        },
        { type: "h2", text: "Push-Benachrichtigungen" },
        {
          type: "steps",
          items: [
            {
              title: "In Settings aktivieren",
              body: "Settings → General → Push notifications — einschalten.",
            },
            {
              title: "OS-Berechtigung erteilen",
              body: "Android zeigt beim ersten Aktivieren den Systemdialog.",
            },
            {
              title: "Alerts empfangen",
              body: "Background-Push für Tasks, Chats, Meetings; In-App-Toast im Vordergrund.",
            },
          ],
        },
        { type: "h2", text: "QR-Login ins Web" },
        {
          type: "p",
          text: "Settings enthält Scan QR to sign in on web. Nach Scan auf julow.ru/login/qr Browser-Sitzung bestätigen — nützlich auf gemeinsamen Desktops.",
        },
        { type: "h2", text: "Preview vs. Live-Daten" },
        {
          type: "callout",
          variant: "info",
          title: "Documents- und Insights-Tabs",
          text: "Mobile Documents und der Analytics-Tab können Sample-Layout-Daten zeigen. Home-Widgets und Web Insights nutzen Live-Task-Analytics. Für volles Dateimanagement Web /documents, bis Mobile dieselben File-APIs nutzt.",
        },
        {
          type: "card",
          variant: "tip",
          title: "Installationsquelle",
          body: "Production-APK-Verteilung verwaltet Ihr Team. Das Mobile Gate auf julow.ru verlinkt die aktuelle Android-Build für Handy-Browser.",
        },
      ],
    },
    faq: {
      id: "faq",
      title: "FAQ",
      description: "Antworten auf häufige Fragen zu Julows Oberfläche und Workflows.",
      blocks: [
        { type: "h2", text: "Konto und Zugang" },
        { type: "h3", text: "Warum kann ich nach Google nicht mit Passwort anmelden?" },
        {
          type: "p",
          text: "Julow bindet eine primäre Auth-Methode pro E-Mail. Bei OAuth-Registrierung ist Passwort-Login gesperrt — und umgekehrt. Der Anmeldebildschirm zeigt einen Dialog mit dem passenden Verfahren.",
        },
        { type: "h3", text: "Wie melde ich mich auf einem gemeinsamen PC ohne Passwort an?" },
        {
          type: "p",
          text: "Öffnen Sie julow.ru/login/qr am Desktop, gehen Sie auf dem Telefon zu Settings und tippen Sie Scan QR zur Sitzungsbestätigung.",
        },
        { type: "h3", text: "Wo widerrufe ich alte Sitzungen?" },
        {
          type: "p",
          text: "Settings → Account listet alle aktiven Sitzungen mit Gerät, IP und letzter Aktivität. Widerrufen Sie jede außer der aktuellen.",
        },
        { type: "h2", text: "Projekte und Aufgaben" },
        { type: "h3", text: "Warum sehe ich das Projekt eines Kollegen nicht?" },
        {
          type: "p",
          text: "Sie brauchen eine Einladung. Bitten Sie um einen Invite-Link oder prüfen Sie Notifications. Nach Accept erscheint das Projekt unter seinem Workspace auf /projects.",
        },
        { type: "h3", text: "Was bedeutet der Fortschrittsbalken auf der Projektkarte?" },
        {
          type: "p",
          text: "Er zeigt den Abschluss Ihrer zugewiesenen Aufgaben — nicht den gesamten Team-Backlog. Done bedeutet Workflow-Spaltenkategorie done.",
        },
        { type: "h3", text: "Gibt es Gantt im Web?" },
        {
          type: "p",
          text: "Ja. Projekt öffnen und in der Toolbar zu Gantt wechseln. Zoom-Steuerung passt die Timeline-Skalierung an.",
        },
        { type: "h2", text: "Chats und Meetings" },
        { type: "h3", text: "Warum keine Chat-Benachrichtigungen, solange der Chat offen ist?" },
        {
          type: "p",
          text: "Julow unterdrückt Duplikate für den aktiven Chat — weniger Rauschen bei fokussierten Gesprächen.",
        },
        { type: "h3", text: "Warum muss ich beim Meeting-Erstellen ein Projekt wählen?" },
        {
          type: "p",
          text: "Meetings sind projektbezogen, damit alle Projektmitglieder automatisch Einladungen und Benachrichtigungen erhalten.",
        },
        { type: "h2", text: "Mobile und Web" },
        { type: "h3", text: "Warum zeigt julow.ru auf meinem Telefon eine Download-Seite?" },
        {
          type: "p",
          text: "Die Desktop-Web-UI braucht mindestens 768px Breite. Handy-Browser werden zur Installation der nativen App geleitet.",
        },
        { type: "h3", text: "Beeinflusst Sprachwechsel im Web Mobile?" },
        {
          type: "p",
          text: "Ja — die Sprache liegt im Kontoprofil und gilt nach Sync in allen Clients.",
        },
        { type: "h3", text: "Wo finde ich die Dokumentation in der App?" },
        {
          type: "p",
          text: "Settings enthält einen Dokumentationslink, oder öffnen Sie docs mit horizontalen Section Chips — derselbe Inhalt wie julow.ru/docs.",
        },
      ],
    },
    "keyboard-shortcuts": {
      id: "keyboard-shortcuts",
      title: "Tastenkürzel (Web)",
      description: "Desktop-Browser-Kürzel für schnellere Navigation auf julow.ru.",
      blocks: [
        {
          type: "p",
          text: "Die Julow-Web-App unterstützt einen fokussierten Satz Tastatur-Interaktionen. Es gibt noch kein globales Shortcut-Overlay — hier steht, was heute funktioniert.",
        },
        { type: "h2", text: "Global" },
        {
          type: "ul",
          items: [
            "Cmd+F / Ctrl+F — Header-Search fokussieren.",
            "Esc — Search-Dropdown, Notification Sheet oder Profile Sheet schließen.",
            "Pfeil hoch/runter + Enter — Search-Ergebnisse navigieren.",
          ],
        },
        { type: "h2", text: "Projekt-Header-Tabs" },
        {
          type: "ul",
          items: [
            "Doppelklick Tab — Label umbenennen.",
            "Enter beim Umbenennen — speichern.",
            "Escape beim Umbenennen — abbrechen.",
            "Rechtsklick Tab — Kontextmenü (Farbe, Duplikat, Schließen, Lösen).",
          ],
        },
        { type: "h2", text: "Projektboard" },
        {
          type: "ul",
          items: [
            "Drag-and-Drop — Aufgaben zwischen Spalten (Board und List).",
            "Aufgabenkarte klicken — Detailpanel mit Kommentaren und Anhängen.",
          ],
        },
        { type: "h2", text: "Chat-Split-Ansicht" },
        {
          type: "p",
          text: "Auf /chats reagiert der resizable Divider zwischen Liste und Thread auf Maus-Drag. Keine dedizierten Keyboard-Resize-Kürzel.",
        },
        {
          type: "callout",
          variant: "info",
          title: "Mobile",
          text: "Die native App nutzt Touch-Gesten — Pull to Refresh, Back-Swipe, Bottom-Sheet-Griffe. Keine Hardware-Tastatur-Bindings auf Mobile.",
        },
      ],
    },
    troubleshooting: {
      id: "troubleshooting",
      title: "Fehlerbehebung",
      description: "Häufige Probleme bei Anmeldung, Sync, Benachrichtigungen und Anrufen beheben.",
      blocks: [
        { type: "h2", text: "Anmeldeprobleme" },
        {
          type: "ul",
          items: [
            "Wrong method Dialog — nutzen Sie den angezeigten Provider (Google, GitHub, Yandex, Apple oder E-Mail-Passwort).",
            "OAuth-Callback-Fehler — Flow in derselben Browser-Tab abschließen; Pop-up-Blocker prüfen.",
            "QR abgelaufen — julow.ru/login/qr aktualisieren und erneut scannen.",
          ],
        },
        { type: "h2", text: "Daten aktualisieren sich nicht" },
        {
          type: "ul",
          items: [
            "Web — Hard Refresh oder Workspace-Wechsel für Kontext-Reload.",
            "Mobile — Pull to Refresh auf Home, Projects oder Chats.",
            "Nach Invite-Accept — Router-Refresh abwarten oder /projects neu öffnen.",
            "Offline Mobile — queued changes sync bei Verbindung.",
          ],
        },
        { type: "h2", text: "Benachrichtigungen" },
        {
          type: "ul",
          items: [
            "Web Push — Browser-Benachrichtigungen erlauben; Site-Permissions prüfen.",
            "Mobile Push — Settings → General → Push und Android-Berechtigung.",
            "Fehlende Chat-Alerts im aktiven Chat — erwartete Suppression.",
          ],
        },
        { type: "h2", text: "Meetings und LiveKit" },
        {
          type: "ul",
          items: [
            "Mikrofon und Kamera in Browser- oder App-OS-Berechtigungen erlauben.",
            "Bildschirmfreigabe braucht stabilen Uplink — Ethernet oder stabiles Wi‑Fi.",
            "Nach Verlassen im Raum hängen — /meetings öffnen und active session redirect prüfen.",
          ],
        },
        { type: "h2", text: "Documents" },
        {
          type: "p",
          text: "Upload-Fehler deuten meist auf Backend-Limits oder Berechtigungen. Von /documents mit unterstütztem Dateityp erneut versuchen. Mobile Dateiverwaltung preview-only bis API-Parität.",
        },
        {
          type: "callout",
          variant: "warning",
          title: "Immer noch blockiert?",
          text: "Notieren Sie Workspace-Name, Browser-/App-Version und exakte URL beim Team-Admin. Verdächtige Sitzungen sofort unter Settings → Account widerrufen.",
        },
      ],
    },
    "docs-guide": {
      id: "docs-guide",
      title: "Diese Dokumentation nutzen",
      description: "Wie der Leitfaden im Web und in der Mobile-App aufgebaut ist.",
      blocks: [
        {
          type: "p",
          text: "Diese Dokumentation beschreibt nur heute existierende Julow-Funktionen — kein Roadmap. Inhalt auf English, Russian und German passend zur App-Sprache.",
        },
        { type: "h2", text: "Im Web (/docs)" },
        {
          type: "ul",
          items: [
            "Linke Sidebar — gruppierte Themen mit Icons; auf Desktop sichtbar.",
            "Mittlere Spalte — lesbare Artikelbreite (~800px) mit Callouts, Steps und Tip Cards.",
            "Schmale Screens — Menübutton öffnet Slide-in-Sidebar.",
            "Deep Links — /docs/{section} (z. B. /docs/auth) zum Teilen mit Kollegen.",
          ],
        },
        { type: "h2", text: "In der Mobile-App" },
        {
          type: "ul",
          items: [
            "Aus Settings oder dem Dokumentationseintrag Ihrer Build.",
            "Horizontale Section Chips oben; Tipp wechselt Artikel.",
            "Vertikales Scrollen für den vollen Section-Body — gleicher Text wie Web.",
          ],
        },
        {
          type: "card",
          variant: "tip",
          title: "Für PMs und Onboarding",
          body: "Teilen Sie Deep Links zu Getting started und Web vs mobile in Welcome-Mails. Kombinieren Sie QR-Login-Docs mit Security Guidelines für verteilte Teams.",
        },
      ],
    },
  },
};
