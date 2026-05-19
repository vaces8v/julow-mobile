/**
 * Моковые задачи для «Сегодня» без сетевого API (как на web).
 */

import type { TaskPayload } from './api';

export const TODAY_MOCK_PROJECT_NAMES: Record<string, string> = {
  'julow-web': 'Julow Web App',
  'mobile-client': 'Mobile Client',
  'api-gateway': 'API Gateway',
  'design-system': 'Design System',
  documentation: 'Documentation',
};

export const TODAY_MOCK_TASKS: TaskPayload[] = [
  {
    id: 'mock-t1',
    title: 'Homepage hero & tokens',
    status: 'in_progress',
    priority: 'high',
    labels: ['design'],
    projectId: 'julow-web',
  },
  {
    id: 'mock-t2',
    title: 'Checkout flow QA',
    status: 'review',
    priority: 'high',
    labels: ['qa'],
    projectId: 'julow-web',
  },
  {
    id: 'mock-t3',
    title: 'Push notification hooks',
    status: 'todo',
    priority: 'medium',
    labels: ['mobile'],
    projectId: 'mobile-client',
  },
  {
    id: 'mock-t4',
    title: 'Rate limit middleware',
    status: 'in_progress',
    priority: 'medium',
    labels: ['backend'],
    projectId: 'api-gateway',
  },
  {
    id: 'mock-t5',
    title: 'Button variants audit',
    status: 'todo',
    priority: 'low',
    labels: ['design-system'],
    projectId: 'design-system',
  },
  {
    id: 'mock-t6',
    title: 'API reference sync',
    status: 'todo',
    priority: 'medium',
    labels: ['docs'],
    projectId: 'documentation',
  },
  {
    id: 'mock-t7',
    title: 'Sprint retro notes',
    status: 'done',
    priority: 'low',
    labels: ['team'],
    projectId: 'julow-web',
  },
  {
    id: 'mock-t8',
    title: 'Dark mode contrast pass',
    status: 'review',
    priority: 'high',
    labels: ['a11y'],
    projectId: 'design-system',
  },
];

export function todayMockProjectName(projectId: string): string {
  return TODAY_MOCK_PROJECT_NAMES[projectId] ?? '—';
}
