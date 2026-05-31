import type { Locale } from "@/i18n/translations";

export type DocSectionId =
  | "getting-started"
  | "auth"
  | "navigation"
  | "workspace"
  | "invites"
  | "dashboard"
  | "projects"
  | "board-views"
  | "tasks"
  | "chats"
  | "meetings"
  | "documents"
  | "search"
  | "notifications"
  | "profile"
  | "settings"
  | "analytics"
  | "web-vs-mobile"
  | "mobile-app"
  | "faq"
  | "keyboard-shortcuts"
  | "troubleshooting"
  | "docs-guide";

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "steps"; items: { title: string; body: string }[] }
  | { type: "card"; title: string; body: string; variant?: "default" | "tip" }
  | { type: "code"; text: string }
  | { type: "callout"; variant: "info" | "tip" | "warning"; title?: string; text: string };

export type DocSection = {
  id: DocSectionId;
  title: string;
  description: string;
  blocks: DocBlock[];
};

export type DocNavGroup = {
  label: string;
  sections: DocSectionId[];
};

export type DocsContent = {
  pageTitle: string;
  pageSubtitle: string;
  navGroups: DocNavGroup[];
  sections: Record<DocSectionId, DocSection>;
};

export const DOC_SECTION_IDS: DocSectionId[] = [
  "getting-started",
  "auth",
  "navigation",
  "workspace",
  "invites",
  "dashboard",
  "projects",
  "board-views",
  "tasks",
  "chats",
  "meetings",
  "documents",
  "search",
  "notifications",
  "profile",
  "settings",
  "analytics",
  "web-vs-mobile",
  "mobile-app",
  "faq",
  "keyboard-shortcuts",
  "troubleshooting",
  "docs-guide",
];

export const DEFAULT_DOC_SECTION: DocSectionId = "getting-started";

export function isDocSectionId(value: string): value is DocSectionId {
  return (DOC_SECTION_IDS as string[]).includes(value);
}

export type DocsByLocale = Record<Locale, DocsContent>;
