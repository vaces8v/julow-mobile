import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ProjectPayload, WorkspacePayload } from '@/lib/api';
import { cachedApi } from '@/lib/cache/cached-api';
import { useCacheSync } from '@/lib/cache/use-cache-sync';

type WorkspaceContextValue = {
  workspaces: WorkspacePayload[];
  projects: ProjectPayload[];
  activeWorkspaceId: string;
  activeProjectId: string;
  setActiveWorkspaceId: (id: string) => void;
  setActiveProjectId: (id: string) => void;
  refreshProjects: (force?: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspacePayload[]>(() => cachedApi.getWorkspacesSync());
  const [projects, setProjects] = useState<ProjectPayload[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState('');
  const [activeProjectId, setActiveProjectId] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setWorkspaces([]);
      setProjects([]);
      setActiveWorkspaceId('');
      setActiveProjectId('');
      return;
    }

    let cancelled = false;

    void (async () => {
      const list = await cachedApi.getWorkspaces();
      if (cancelled) return;

      setWorkspaces(list);
      setActiveWorkspaceId((cur) =>
        cur && list.some((w) => w.id === cur) ? cur : (list[0]?.id ?? ''),
      );

      if (list.length === 0) {
        setProjects([]);
        setActiveProjectId('');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated]);

  const refreshProjects = useCallback(async (force = false) => {
    if (!activeWorkspaceId) return;
    const list = await cachedApi.getProjects(activeWorkspaceId, { force });
    setProjects(list);
    setActiveProjectId((curr) =>
      list.some((p) => p.id === curr) ? curr : (list[0]?.id ?? ''),
    );
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !activeWorkspaceId) return;
    let cancelled = false;

    void (async () => {
      const cached = cachedApi.getProjectsSync(activeWorkspaceId);
      if (cached.length > 0 && !cancelled) {
        setProjects(cached);
        setActiveProjectId((curr) =>
          cached.some((p) => p.id === curr) ? curr : (cached[0]?.id ?? ''),
        );
      }

      const list = await cachedApi.getProjects(activeWorkspaceId);
      if (cancelled) return;

      setProjects(list);
      setActiveProjectId((curr) =>
        list.some((p) => p.id === curr) ? curr : (list[0]?.id ?? ''),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId, authLoading, isAuthenticated]);

  const refreshAll = useCallback(async () => {
    const workspaceList = await cachedApi.getWorkspaces({ force: true });
    setWorkspaces(workspaceList);

    const nextWorkspaceId =
      activeWorkspaceId && workspaceList.some((workspace) => workspace.id === activeWorkspaceId)
        ? activeWorkspaceId
        : (workspaceList[0]?.id ?? '');

    setActiveWorkspaceId(nextWorkspaceId);

    if (!nextWorkspaceId) {
      setProjects([]);
      setActiveProjectId('');
      return;
    }

    const projectList = await cachedApi.getProjects(nextWorkspaceId, { force: true });
    setProjects(projectList);
    setActiveProjectId((curr) =>
      projectList.some((project) => project.id === curr) ? curr : (projectList[0]?.id ?? ''),
    );
  }, [activeWorkspaceId]);

  const syncFromCache = useCallback(() => {
    setWorkspaces(cachedApi.getWorkspacesSync());
    if (activeWorkspaceId) {
      setProjects(cachedApi.getProjectsSync(activeWorkspaceId));
    }
  }, [activeWorkspaceId]);

  useCacheSync(syncFromCache);

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
