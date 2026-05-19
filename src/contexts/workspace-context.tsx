import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ProjectPayload, WorkspacePayload } from '@/lib/api';

type WorkspaceContextValue = {
  workspaces: WorkspacePayload[];
  projects: ProjectPayload[];
  activeWorkspaceId: string;
  activeProjectId: string;
  setActiveWorkspaceId: (id: string) => void;
  setActiveProjectId: (id: string) => void;
  refreshProjects: () => Promise<void>;
  refreshAll: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspacePayload[]>([]);
  const [projects, setProjects] = useState<ProjectPayload[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [activeProjectId, setActiveProjectId] = useState('');

  const loadWorkspaces = useCallback(async () => {
    const list = await api.getWorkspaces();
    setWorkspaces(list);
    setActiveWorkspaceId((cur) =>
      cur && list.some((w) => w.id === cur) ? cur : (list[0]?.id ?? ''),
    );
  }, []);

  useEffect(() => {
    void loadWorkspaces();
  }, [loadWorkspaces]);

  const refreshProjects = useCallback(async () => {
    if (!activeWorkspaceId) return;
    const list = await api.getProjects(activeWorkspaceId);
    setProjects(list);
    setActiveProjectId((curr) =>
      list.some((p) => p.id === curr) ? curr : (list[0]?.id ?? ''),
    );
  }, [activeWorkspaceId]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const refreshAll = useCallback(async () => {
    await loadWorkspaces();
    await refreshProjects();
  }, [loadWorkspaces, refreshProjects]);

  const value = useMemo(
    () => ({
      workspaces,
      projects,
      activeWorkspaceId,
      activeProjectId,
      setActiveWorkspaceId,
      setActiveProjectId,
      refreshProjects,
      refreshAll,
    }),
    [workspaces, projects, activeWorkspaceId, activeProjectId, refreshProjects, refreshAll],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

const fallbackWorkspace: WorkspaceContextValue = {
  workspaces: [],
  projects: [],
  activeWorkspaceId: '',
  activeProjectId: '',
  setActiveWorkspaceId: () => {},
  setActiveProjectId: () => {},
  refreshProjects: async () => {},
  refreshAll: async () => {},
};

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) return fallbackWorkspace;
  return ctx;
}
