import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useWorkspace } from '@/contexts/workspace-context';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { api, type ProjectPayload, type TaskPayload } from '@/lib/api';
import {
  CheckmarkCircle02Icon,
  Folder02Icon,
  Search01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
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
  const { activeWorkspaceId } = useWorkspace();
  const styles = useMemo(() => createStyles(c), [c]);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [projects, setProjects] = useState<ProjectPayload[]>([]);
  const [tasks, setTasks] = useState<TaskPayload[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectPayload[]>([]);
  const [allTasks, setAllTasks] = useState<TaskPayload[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Load all projects and tasks once for local filtering
  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      try {
        const [projs, tsks] = await Promise.all([
          api.getMyProjects().catch(() =>
            activeWorkspaceId ? api.getProjects(activeWorkspaceId) : []
          ),
          api.getTasks(undefined, { limit: 200 }).catch(() => []),
        ]);
        if (cancelled) return;
        setAllProjects(projs);
        setAllTasks(tsks);
      } catch { /* ignore */ }
      finally { if (!cancelled) setInitialLoaded(true); }
    };
    loadData();
    return () => { cancelled = true; };
  }, [activeWorkspaceId]);

  // Debounce query
  useEffect(() => {
    const q = query.trim();
    if (!q) { setDebouncedQuery(''); return; }
    const timer = setTimeout(() => setDebouncedQuery(q), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Filter locally when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) { setTasks([]); setProjects([]); setLoading(false); return; }
    setLoading(true);

    const q = debouncedQuery.toLowerCase();

    // Filter projects locally
    const filteredProjects = allProjects
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, PROJECTS_LIMIT);
    setProjects(filteredProjects);

    // Filter tasks locally
    const filteredTasks = allTasks
      .filter((t) => {
        const inTitle = t.title.toLowerCase().includes(q);
        const inLabels = t.labels?.some((l) => l.toLowerCase().includes(q));
        return inTitle || inLabels;
      })
      .slice(0, TASKS_LIMIT);
    setTasks(filteredTasks);
    setLoading(false);
  }, [debouncedQuery, allProjects, allTasks]);

  // Auto-focus on tab focus
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => inputRef.current?.focus(), 150);
      return () => clearTimeout(timer);
    }, [])
  );

  // Tab press handler
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
    allProjects.forEach((p) => m.set(p.id, p));
    return m;
  }, [allProjects]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={c.scheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Search header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>  
        <View style={styles.searchBar}>
          <HugeiconsIcon icon={Search01Icon} size={18} color={c.muted} strokeWidth={2} />
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
            <Pressable onPress={() => { setQuery(''); setDebouncedQuery(''); }} hitSlop={8}>
              <HugeiconsIcon icon={Cancel01Icon} size={18} color={c.muted} strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Results */}
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Loading indicator */}
        {loading && (
          <Animated.View entering={FadeIn.duration(150)} style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={c.accent} />
          </Animated.View>
        )}

        {/* Empty state (no query) */}
        {!hasQuery && !loading && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.emptyState}>
            <HugeiconsIcon icon={Search01Icon} size={48} color={c.border} strokeWidth={1.2} />
            <Text style={styles.emptyTitle}>{t.common.search}</Text>
            <Text style={styles.emptySubtitle}>
              {Platform.select({ ios: 'Введите название проекта или задачи', default: 'Введите название проекта или задачи' })}
            </Text>
          </Animated.View>
        )}

        {/* No results */}
        {showEmpty && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Ничего не найдено</Text>
            <Text style={styles.emptySubtitle}>Попробуйте другой запрос</Text>
          </Animated.View>
        )}

        {/* Projects section */}
        {projects.length > 0 && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Text style={styles.sectionTitle}>Проекты</Text>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                style={styles.resultRow}
                onPress={() => router.push(`/project/${project.id}` as any)}
              >
                <View style={[styles.resultIcon, { backgroundColor: (project.color ?? c.accent) + '18' }]}>
                  <HugeiconsIcon icon={Folder02Icon} size={18} color={project.color ?? c.accent} strokeWidth={2} />
                </View>
                <View style={styles.resultBody}>
                  <Text style={styles.resultTitle} numberOfLines={1}>{project.name}</Text>
                  {project.status && (
                    <Text style={styles.resultMeta} numberOfLines={1}>{project.status}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {/* Tasks section */}
        {tasks.length > 0 && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
            <Text style={styles.sectionTitle}>Задачи</Text>
            {tasks.map((task) => {
              const proj = projectById.get(task.projectId);
              return (
                <Pressable
                  key={task.id}
                  style={styles.resultRow}
                  onPress={() => router.push(`/project/${task.projectId}` as any)}
                >
                  <View style={[styles.resultIcon, { backgroundColor: statusColor(task.status, c) + '18' }]}>
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color={statusColor(task.status, c)} strokeWidth={2} />
                  </View>
                  <View style={styles.resultBody}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{task.title}</Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>
                      {task.status}{proj ? ` · ${proj.name}` : ''}
                    </Text>
                  </View>
                  {task.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: priorityColor(task.priority) + '18' }]}>
                      <Text style={[styles.priorityText, { color: priorityColor(task.priority) }]}>
                        {task.priority.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        )}
      </ScrollView>
    </View>
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
    case 'critical': case 'urgent': return '#ef4444';
    case 'high': return '#f97316';
    case 'medium': return '#eab308';
    case 'low': return '#6b7280';
    default: return '#6b7280';
  }
}

function createStyles(c: SemanticTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: c.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surfaceSecondary,
      borderRadius: SigmaRadius.md,
      paddingHorizontal: 12,
      height: 44,
      gap: 10,
    },
    searchInput: {
      flex: 1,
      color: c.foreground,
      fontSize: SigmaTypo.body,
      // Fix Android text cut-off: ensure proper vertical alignment
      paddingVertical: Platform.OS === 'android' ? 8 : 0,
      textAlignVertical: 'center',
      includeFontPadding: false,
    },
    scroll: {
      flex: 1,
    },
    loadingContainer: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
      gap: 8,
    },
    emptyTitle: {
      fontSize: SigmaTypo.headline,
      fontWeight: '600',
      color: c.muted,
      marginTop: 12,
    },
    emptySubtitle: {
      fontSize: SigmaTypo.bodySmall,
      color: c.muted,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
    sectionTitle: {
      fontSize: SigmaTypo.caption,
      fontWeight: '700',
      color: c.muted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 8,
    },
    resultRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    resultIcon: {
      width: 40,
      height: 40,
      borderRadius: SigmaRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
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
