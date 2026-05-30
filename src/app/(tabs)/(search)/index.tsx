import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useWorkspace } from '@/contexts/workspace-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, type ProjectPayload, type TaskPayload } from '@/lib/api';
import {
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Folder02Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEBOUNCE_MS = 300;
const PROJECTS_LIMIT = 5;
const TASKS_LIMIT = 8;

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { t } = useI18n();
  const sc = t.search;
  const { activeWorkspaceId } = useWorkspace();
  const styles = useMemo(() => createStyles(c), [c]);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [allProjects, setAllProjects] = useState<ProjectPayload[]>([]);
  const [tasks, setTasks] = useState<TaskPayload[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;
    const loadProjects = async () => {
      try {
        const projs = await api.getMyProjects().catch(() =>
          activeWorkspaceId ? api.getProjects(activeWorkspaceId) : [],
        );
        if (!cancelled) setAllProjects(projs);
      } catch {
        if (!cancelled) setAllProjects([]);
      }
    };
    loadProjects();
    return () => {
      cancelled = true;
    };
  }, [activeWorkspaceId]);

  useEffect(() => {
    const q = query.trim();
    const timer = setTimeout(() => setDebouncedQuery(q), q ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setTasks([]);
      setTasksLoading(false);
      return;
    }

    let cancelled = false;
    setTasksLoading(true);

    api
      .getTasks(undefined, { search: debouncedQuery, limit: TASKS_LIMIT * 2 })
      .then((res) => {
        if (cancelled) return;
        const q = debouncedQuery.toLowerCase();
        const matched = res
          .filter((task) => {
            const inTitle = task.title.toLowerCase().includes(q);
            const inLabels = task.labels?.some((label) => label.toLowerCase().includes(q));
            return inTitle || inLabels;
          })
          .slice(0, TASKS_LIMIT);
        setTasks(matched);
      })
      .catch(() => {
        if (!cancelled) setTasks([]);
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const scopedProjects = useMemo(() => {
    if (!activeWorkspaceId) return allProjects;
    return allProjects.filter((p) => p.workspaceId === activeWorkspaceId);
  }, [allProjects, activeWorkspaceId]);

  const projects = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    if (!q) return [] as ProjectPayload[];
    return scopedProjects
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, PROJECTS_LIMIT);
  }, [scopedProjects, debouncedQuery]);

  const debouncing = query.trim() !== debouncedQuery;
  const loading = debouncing || tasksLoading;

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }, []),
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('tabPress', (tab) => {
      if (tab === '(search)') {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        inputRef.current?.focus();
      }
    });
    return () => sub.remove();
  }, []);

  const hasQuery = debouncedQuery.length > 0;
  const hasResults = projects.length > 0 || tasks.length > 0;
  const showEmpty = hasQuery && !loading && !hasResults;

  const projectById = useMemo(() => {
    const m = new Map<string, ProjectPayload>();
    scopedProjects.forEach((p) => m.set(p.id, p));
    return m;
  }, [scopedProjects]);

  const clearQuery = () => {
    setQuery('');
    setDebouncedQuery('');
    setTasks([]);
  };

  const openProject = (projectId: string) => {
    router.push(`/project/${projectId}` as any);
  };

  const openTask = (task: TaskPayload) => {
    router.push(`/project/${task.projectId}?task=${task.id}` as any);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      <LinearGradient
        colors={[c.accent + '12', 'transparent']}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: insets.top + 10,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Fade delay={20} initialY={6}>
          <View style={styles.titleWrap}>
            <Text style={styles.largeTitle}>{sc.title}</Text>
            <Text style={styles.largeSubtitle}>{sc.hint}</Text>
          </View>
        </Fade>

        <Fade delay={40} initialY={6}>
          <View style={styles.searchBox}>
            <HugeiconsIcon icon={Search01Icon} size={18} color={c.muted} strokeWidth={1.8} />
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder={t.common.search}
              placeholderTextColor={c.muted}
              value={query}
              onChangeText={setQuery}
              keyboardAppearance={c.scheme === 'dark' ? 'dark' : 'light'}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <Pressable onPress={clearQuery} hitSlop={8}>
                <HugeiconsIcon icon={Cancel01Icon} size={18} color={c.muted} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        </Fade>

        {loading && (
          <Animated.View entering={FadeIn.duration(150)} style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={c.accent} />
            <Text style={styles.loadingText}>{sc.loading}</Text>
          </Animated.View>
        )}

        {!hasQuery && !loading && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <HugeiconsIcon icon={Search01Icon} size={32} color={c.muted} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>{sc.title}</Text>
            <Text style={styles.emptySubtitle}>{sc.hint}</Text>
          </Animated.View>
        )}

        {showEmpty && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{sc.empty}</Text>
            <Text style={styles.emptySubtitle}>{sc.emptyHint}</Text>
          </Animated.View>
        )}

        {projects.length > 0 && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Text style={styles.sectionTitle}>{sc.projectsLabel}</Text>
            <View style={styles.resultGroup}>
              {projects.map((project, i) => (
                <Fade key={project.id} delay={60 + i * 35} initialY={6}>
                  <SearchProjectRow
                    project={project}
                    accent={c.accent}
                    onPress={() => openProject(project.id)}
                    styles={styles}
                    isLast={i === projects.length - 1}
                  />
                </Fade>
              ))}
            </View>
          </Animated.View>
        )}

        {tasks.length > 0 && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Text style={styles.sectionTitle}>{sc.tasksLabel}</Text>
            <View style={styles.resultGroup}>
              {tasks.map((task, i) => {
                const proj = projectById.get(task.projectId);
                return (
                  <Fade key={task.id} delay={60 + i * 35} initialY={6}>
                    <SearchTaskRow
                      task={task}
                      projectName={proj?.name}
                      theme={c}
                      onPress={() => openTask(task)}
                      styles={styles}
                      isLast={i === tasks.length - 1}
                    />
                  </Fade>
                );
              })}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

function SearchProjectRow({
  project,
  accent,
  onPress,
  styles,
  isLast,
}: {
  project: ProjectPayload;
  accent: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  isLast: boolean;
}) {
  const color = project.color ?? accent;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultRow,
        !isLast && styles.resultRowBorder,
        pressed && styles.resultRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.resultIcon, { backgroundColor: color + '18' }]}>
        <Text style={[styles.projectInitial, { color }]}>{project.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {project.name}
        </Text>
        {(project.description || project.status) && (
          <Text style={styles.resultMeta} numberOfLines={1}>
            {project.description ?? project.status}
          </Text>
        )}
      </View>
      <HugeiconsIcon icon={Folder02Icon} size={16} color={color} strokeWidth={2} />
    </Pressable>
  );
}

function SearchTaskRow({
  task,
  projectName,
  theme,
  onPress,
  styles,
  isLast,
}: {
  task: TaskPayload;
  projectName?: string;
  theme: SemanticTheme;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  isLast: boolean;
}) {
  const status = statusColor(task.status, theme);
  return (
    <Pressable
      style={({ pressed }) => [
        styles.resultRow,
        !isLast && styles.resultRowBorder,
        pressed && styles.resultRowPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.resultIcon, { backgroundColor: status + '18' }]}>
        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color={status} strokeWidth={2} />
      </View>
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {task.title}
        </Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {projectName ? `${projectName} · ` : ''}
          {task.status}
        </Text>
      </View>
      {task.priority ? (
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor(task.priority) + '18' }]}>
          <Text style={[styles.priorityText, { color: priorityColor(task.priority) }]}>
            {task.priority.charAt(0).toUpperCase()}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function statusColor(status: string, c: SemanticTheme): string {
  const s = status.toLowerCase();
  if (s.includes('done') || s.includes('готов') || s.includes('complete')) return c.success;
  if (s.includes('progress') || s.includes('работ')) return c.accent;
  if (s.includes('review') || s.includes('проверк')) return c.warning;
  return c.muted;
}

function priorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'critical':
    case 'urgent':
      return '#ef4444';
    case 'high':
      return '#f97316';
    case 'medium':
      return '#eab308';
    case 'low':
      return '#6b7280';
    default:
      return '#6b7280';
  }
}

function createStyles(c: SemanticTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    topGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 220,
      zIndex: 0,
    },
    scroll: {
      flex: 1,
    },
    titleWrap: {
      marginBottom: 14,
    },
    largeTitle: {
      fontSize: SigmaTypo.largeTitle,
      fontWeight: '800',
      letterSpacing: -0.5,
      color: c.foreground,
    },
    largeSubtitle: {
      marginTop: 4,
      fontSize: SigmaTypo.bodySmall,
      fontWeight: '500',
      lineHeight: 19,
      color: c.muted,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: SigmaRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 14,
      height: 46,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      borderCurve: 'continuous',
    },
    searchInput: {
      flex: 1,
      color: c.foreground,
      fontSize: SigmaTypo.bodySmall,
      paddingVertical: Platform.OS === 'android' ? 6 : 0,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    loadingContainer: {
      paddingVertical: 28,
      alignItems: 'center',
      gap: 10,
    },
    loadingText: {
      fontSize: SigmaTypo.caption,
      color: c.muted,
      fontWeight: '500',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 56,
      paddingHorizontal: 24,
      gap: 8,
    },
    emptyIconWrap: {
      width: 64,
      height: 64,
      borderRadius: SigmaRadius.lg,
      backgroundColor: c.surfaceSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontSize: SigmaTypo.title3,
      fontWeight: '800',
      color: c.foreground,
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    emptySubtitle: {
      fontSize: SigmaTypo.bodySmall,
      fontWeight: '500',
      color: c.muted,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 280,
    },
    sectionTitle: {
      fontSize: SigmaTypo.caption,
      fontWeight: '700',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 22,
      marginBottom: 10,
      marginLeft: 2,
    },
    resultGroup: {
      borderRadius: SigmaRadius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
      backgroundColor: c.surface,
      overflow: 'hidden',
      borderCurve: 'continuous',
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 12,
    },
    resultRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    resultRowPressed: {
      backgroundColor: c.surfaceSecondary,
    },
    resultIcon: {
      width: 40,
      height: 40,
      borderRadius: SigmaRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    projectInitial: {
      fontSize: SigmaTypo.body,
      fontWeight: '800',
    },
    resultBody: {
      flex: 1,
      gap: 2,
    },
    resultTitle: {
      fontSize: SigmaTypo.body,
      fontWeight: '600',
      color: c.foreground,
    },
    resultMeta: {
      fontSize: SigmaTypo.caption,
      color: c.muted,
    },
    priorityBadge: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    priorityText: {
      fontSize: 11,
      fontWeight: '700',
    },
  });
}
