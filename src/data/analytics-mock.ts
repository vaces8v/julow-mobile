/**
 * Демо-данные для Insights / Analytics (Julow — PM dashboard).
 * В проде заменятся ответами API: velocity, burndown, распределение по типам задач, команда.
 */

export type SprintVelocityRow = { sprint: string; planned: number; actual: number };
export type WeeklyActivityRow = { day: string; tasks: number; hours: number };
export type MonthlyTrendRow = { month: string; completed: number; created: number };
export type BurndownRow = { day: string; remaining: number; ideal: number };
export type TeamMemberRow = {
  id: string;
  name: string;
  role: string;
  done: number;
  inProgress: number;
  pts: number;
  focus: number;
};
export type FlowStageRow = {
  value: number;
  max: number;
  color: string;
  conv?: string;
};

/** Спринты: план vs факт (story points) — типичная метрика для agile-команд */
export const MOCK_SPRINT_VELOCITY: SprintVelocityRow[] = [
  { sprint: "S7", planned: 36, actual: 34 },
  { sprint: "S8", planned: 40, actual: 39 },
  { sprint: "S9", planned: 38, actual: 32 },
  { sprint: "S10", planned: 40, actual: 38 },
  { sprint: "S11", planned: 35, actual: 42 },
  { sprint: "S12", planned: 42, actual: 30 },
  { sprint: "S13", planned: 38, actual: 44 },
  { sprint: "S14", planned: 40, actual: 45 },
];

/** Закрытые задачи и часы фокуса по дням недели */
export const MOCK_WEEKLY_ACTIVITY: WeeklyActivityRow[] = [
  { day: "Mon", tasks: 12, hours: 6.5 },
  { day: "Tue", tasks: 18, hours: 7.2 },
  { day: "Wed", tasks: 15, hours: 5.8 },
  { day: "Thu", tasks: 22, hours: 8.1 },
  { day: "Fri", tasks: 20, hours: 7.5 },
  { day: "Sat", tasks: 8, hours: 3.2 },
  { day: "Sun", tasks: 5, hours: 2.0 },
];

/** Создано vs завершено по месяцам (throughput / входящий поток) */
export const MOCK_MONTHLY_TREND: MonthlyTrendRow[] = [
  { month: "Jan", completed: 42, created: 55 },
  { month: "Feb", completed: 38, created: 48 },
  { month: "Mar", completed: 51, created: 60 },
  { month: "Apr", completed: 47, created: 52 },
  { month: "May", completed: 63, created: 70 },
  { month: "Jun", completed: 58, created: 65 },
  { month: "Jul", completed: 72, created: 80 },
  { month: "Aug", completed: 68, created: 75 },
  { month: "Sep", completed: 80, created: 85 },
  { month: "Oct", completed: 75, created: 78 },
  { month: "Nov", completed: 88, created: 90 },
  { month: "Dec", completed: 65, created: 72 },
];

/** Burndown: остаток работ vs идеальная линия */
export const MOCK_BURNDOWN: BurndownRow[] = [
  { day: "D1", remaining: 120, ideal: 120 },
  { day: "D3", remaining: 108, ideal: 102 },
  { day: "D5", remaining: 90, ideal: 84 },
  { day: "D7", remaining: 74, ideal: 66 },
  { day: "D9", remaining: 55, ideal: 48 },
  { day: "D11", remaining: 38, ideal: 30 },
  { day: "D13", remaining: 18, ideal: 12 },
  { day: "D14", remaining: 7, ideal: 0 },
];

export const MOCK_TEAM: TeamMemberRow[] = [
  { id: "1", name: "Alexey K.", role: "Tech Lead", done: 18, inProgress: 4, pts: 52, focus: 31 },
  { id: "2", name: "Marina V.", role: "Product", done: 14, inProgress: 3, pts: 40, focus: 28 },
  { id: "3", name: "Denis P.", role: "Full-stack", done: 12, inProgress: 5, pts: 38, focus: 26 },
  { id: "4", name: "Olga S.", role: "Design", done: 10, inProgress: 2, pts: 28, focus: 22 },
  { id: "5", name: "Pavel N.", role: "QA", done: 7, inProgress: 1, pts: 18, focus: 19 },
  { id: "6", name: "Irina M.", role: "Frontend", done: 11, inProgress: 2, pts: 34, focus: 24 },
];

/** Доли категорий задач (сумма ~100 для круговой диаграммы) */
export const MOCK_CATEGORY_SHARE = [
  { key: "dev" as const, pct: 42 },
  { key: "design" as const, pct: 24 },
  { key: "testing" as const, pct: 18 },
  { key: "planning" as const, pct: 16 },
];

/** Воронка стадий (от созданных к завершённым); подписи — из i18n по порядку */
export const MOCK_FLOW_STAGES: FlowStageRow[] = [
  { value: 128, max: 128, color: "#94a3b8" },
  { value: 102, max: 128, color: "#3b82f6", conv: "80%" },
  { value: 76, max: 128, color: "#f97316", conv: "75%" },
  { value: 68, max: 128, color: "#22c55e", conv: "89%" },
];

/** KPI для карточек сверху (демо) */
export const MOCK_KPI = {
  velocityPts: 18,
  cycleDays: 23,
  throughputTasks: 142,
  sprintProgressPct: 68,
  sprintCompleted: 45,
  sprintRemaining: 21,
  sprintDaysLeft: 6,
  flowSummary: { conv: "54%", cycle: "2.1d", completed: "68" },
} as const;
