import { ScreenShell } from '@/components/screen-shell';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import {
  Add01Icon,
  File02Icon,
  Folder02Icon,
  FolderOpenIcon,
  GridViewIcon,
  Menu01Icon,
  Pin02Icon,
  Search01Icon,
  Upload01Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Button } from 'heroui-native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

type ViewMode = 'grid' | 'list';

const ACCENT = '#3b82f6';

type FolderNode = { id: string; name: string; children?: FolderNode[] };

const TREE: FolderNode[] = [
  { id: 'product', name: 'Product', children: [
    { id: 'product-prd', name: 'PRDs' },
    { id: 'product-design', name: 'Design Specs' },
  ]},
  { id: 'engineering', name: 'Engineering', children: [
    { id: 'eng-api', name: 'API Docs' },
    { id: 'eng-arch', name: 'Architecture' },
    { id: 'eng-runbooks', name: 'Runbooks' },
  ]},
  { id: 'operations', name: 'Operations', children: [
    { id: 'ops-onboard', name: 'Onboarding' },
    { id: 'ops-security', name: 'Security' },
  ]},
  { id: 'releases', name: 'Releases' },
];

const ALL_FILES = [
  { id: 1, name: 'Product Requirements v2', folder: 'product', updated: '2h ago', author: 'Alexey', size: '24 KB', ext: 'doc', pinned: true },
  { id: 2, name: 'API Specification v3', folder: 'engineering', updated: '5h ago', author: 'Marina', size: '156 KB', ext: 'md', pinned: false },
  { id: 3, name: 'Sprint Retrospective', folder: 'operations', updated: '1d ago', author: 'Denis', size: '12 KB', ext: 'doc', pinned: false },
  { id: 4, name: 'Architecture Decision Log', folder: 'engineering', updated: '2d ago', author: 'Alexey', size: '48 KB', ext: 'md', pinned: true },
  { id: 5, name: 'Onboarding Guide', folder: 'operations', updated: '3d ago', author: 'Olga', size: '32 KB', ext: 'pdf', pinned: false },
  { id: 6, name: 'Release Notes v2.4', folder: 'releases', updated: '4d ago', author: 'Marina', size: '8 KB', ext: 'md', pinned: false },
  { id: 7, name: 'Testing Strategy', folder: 'engineering', updated: '1w ago', author: 'Denis', size: '20 KB', ext: 'doc', pinned: false },
  { id: 8, name: 'Incident Response Guide', folder: 'operations', updated: '1w ago', author: 'Pavel', size: '34 KB', ext: 'pdf', pinned: false },
  { id: 9, name: 'Figma Prototype Links', folder: 'product', updated: '2w ago', author: 'Marina', size: '4 KB', ext: 'txt', pinned: false },
  { id: 10, name: 'Database Schema v5', folder: 'engineering', updated: '2w ago', author: 'Alexey', size: '64 KB', ext: 'md', pinned: false },
];

const EXT_COLORS: Record<string, string> = {
  doc: '#3b82f6',
  md: '#8b5cf6',
  pdf: '#ef4444',
  txt: '#94a3b8',
};

export default function DocumentsScreen() {
  const c = useSemanticTheme();
  const { t } = useI18n();
  const doc = t.documents;

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [activeFolder, setActiveFolder] = useState('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [folderOpen, setFolderOpen] = useState(true);

  const filteredFiles = useMemo(() => ALL_FILES.filter(f => {
    const matchFolder = activeFolder === 'all' || f.folder === activeFolder || f.folder.startsWith(activeFolder + '-');
    const matchQuery = !query || f.name.toLowerCase().includes(query.toLowerCase()) || f.author.toLowerCase().includes(query.toLowerCase());
    return matchFolder && matchQuery;
  }), [activeFolder, query]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  return (
    <ScreenShell
      title={doc.title}
      subtitle={doc.subtitle}
      right={
        <View style={styles.rightBtns}>
          <Pressable style={[styles.iconBtn, { borderColor: c.border, backgroundColor: c.surface }]}>
            <HugeiconsIcon icon={Upload01Icon} size={16} color={c.muted} strokeWidth={1.8} />
          </Pressable>
          <Button size="sm" variant="primary">
            <Button.Label>{doc.upload}</Button.Label>
          </Button>
        </View>
      }
    >
      {/* Search + view toggle row */}
      <Fade delay={0} initialY={6}>
        <View style={styles.toolbarRow}>
          <View style={[styles.searchWrap, { backgroundColor: c.surface, borderColor: c.border }]}>
            <HugeiconsIcon icon={Search01Icon} size={15} color={c.muted} strokeWidth={1.8} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={doc.searchPlaceholder}
              placeholderTextColor={c.muted}
              style={[styles.searchInput, { color: c.foreground }]}
            />
          </View>
          <View style={[styles.viewToggle, { backgroundColor: c.surface, borderColor: c.border }]}>
            <ViewBtn active={viewMode === 'list'} onPress={() => setViewMode('list')} icon={Menu01Icon} />
            <ViewBtn active={viewMode === 'grid'} onPress={() => setViewMode('grid')} icon={GridViewIcon} />
          </View>
        </View>
      </Fade>

      {/* Storage bar */}
      <Fade delay={60} initialY={4} style={{ marginTop: 14 }}>
        <View style={[styles.storageCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <LinearGradient colors={[ACCENT + '14', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <View style={styles.storageRow}>
            <Text style={[styles.storageLbl, { color: c.muted }]}>Storage</Text>
            <Text style={[styles.storageLbl, { color: c.muted }]}>7.2 / 10 GB</Text>
          </View>
          <View style={[styles.track, { backgroundColor: c.border }]}>
            <View style={[styles.trackFill, { backgroundColor: ACCENT, width: '72%' }]} />
          </View>
        </View>
      </Fade>

      {/* Folder tree */}
      <Fade delay={100} initialY={4} style={{ marginTop: 14 }}>
        <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
          <LinearGradient colors={[ACCENT + '0C', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Pressable
            onPress={() => setFolderOpen(v => !v)}
            style={styles.sectionHeaderRow}
          >
            <Text style={[styles.sectionHeading, { color: c.muted }]}>{doc.folders.toUpperCase()}</Text>
            <HugeiconsIcon icon={folderOpen ? FolderOpenIcon : Folder02Icon} size={14} color={c.muted} strokeWidth={1.8} />
          </Pressable>

          {folderOpen && (
            <View style={{ gap: 2 }}>
              <FolderPill
                id="all"
                name={doc.allFiles}
                active={activeFolder}
                onSelect={setActiveFolder}
                icon={GridViewIcon}
              />
              {TREE.map(node => (
                <FolderTreeItem key={node.id} node={node} active={activeFolder} onSelect={setActiveFolder} />
              ))}
            </View>
          )}
        </View>
      </Fade>

      {/* File count bar */}
      <Fade delay={140} initialY={4} style={{ marginTop: 14 }}>
        <View style={styles.statusBar}>
          <Text style={[styles.statusText, { color: c.muted }]}>
            {filteredFiles.length} {doc.colName.toLowerCase()}{filteredFiles.length !== 1 ? 's' : ''}
            {selected.size > 0 ? `  ·  ${selected.size} ${doc.selected}` : ''}
          </Text>
          {selected.size > 0 && (
            <Pressable onPress={() => setSelected(new Set())} style={[styles.clearBtn, { borderColor: c.border }]}>
              <Text style={[styles.clearBtnText, { color: c.muted }]}>Clear</Text>
            </Pressable>
          )}
        </View>
      </Fade>

      {/* Files */}
      <View style={{ marginTop: 10 }}>
        {viewMode === 'list' ? (
          <View style={[styles.listContainer, { backgroundColor: c.surface, borderColor: c.border }]}>
            {/* Column headers */}
            <View style={[styles.listHeader, { borderBottomColor: c.border }]}>
              <Text style={[styles.colHead, { color: c.muted, flex: 3 }]}>{doc.colName}</Text>
              <Text style={[styles.colHead, { color: c.muted, flex: 1, textAlign: 'right' }]}>{doc.colAuthor}</Text>
              <Text style={[styles.colHead, { color: c.muted, flex: 1, textAlign: 'right' }]}>{doc.colModified}</Text>
            </View>
            {filteredFiles.length === 0 ? (
              <EmptyState label={doc.noFiles} />
            ) : (
              filteredFiles.map((file, i) => (
                <Fade key={file.id} delay={i * 35} initialY={4}>
                  <FileListRow
                    file={file}
                    selected={selected.has(file.id)}
                    onPress={() => toggleSelect(file.id)}
                    extColor={EXT_COLORS[file.ext] ?? '#94a3b8'}
                  />
                </Fade>
              ))
            )}
          </View>
        ) : (
          <View style={styles.gridContainer}>
            {filteredFiles.length === 0 ? (
              <EmptyState label={doc.noFiles} />
            ) : (
              filteredFiles.map((file, i) => (
                <Fade key={file.id} delay={i * 40} initialY={6} style={styles.gridCell}>
                  <FileGridCard
                    file={file}
                    selected={selected.has(file.id)}
                    onPress={() => toggleSelect(file.id)}
                    extColor={EXT_COLORS[file.ext] ?? '#94a3b8'}
                    pinnedLabel={doc.pinned}
                  />
                </Fade>
              ))
            )}
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FolderPill({ id, name, active, onSelect, icon }: {
  id: string; name: string; active: string; onSelect: (id: string) => void; icon: any;
}) {
  const c = useSemanticTheme();
  const isActive = active === id;
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 14, stiffness: 300 }) }],
  }));
  return (
    <Pressable
      onPressIn={() => { scale.value = 0.96; }}
      onPressOut={() => { scale.value = 1; }}
      onPress={() => onSelect(id)}
    >
      <Animated.View style={[
        styles.folderPill,
        { backgroundColor: isActive ? ACCENT + '18' : 'transparent', borderColor: isActive ? ACCENT + '40' : 'transparent' },
        anim,
      ]}>
        <HugeiconsIcon icon={icon} size={13} color={isActive ? ACCENT : c.muted} strokeWidth={1.8} />
        <Text style={[styles.folderPillText, { color: isActive ? ACCENT : c.muted, fontWeight: isActive ? '600' : '500' }]}>{name}</Text>
      </Animated.View>
    </Pressable>
  );
}

function FolderTreeItem({ node, depth = 0, active, onSelect }: {
  node: FolderNode; depth?: number; active: string; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = !!node.children?.length;
  return (
    <View>
      <FolderPill
        id={node.id}
        name={node.name}
        active={active}
        onSelect={(id) => { onSelect(id); if (hasChildren) setOpen(v => !v); }}
        icon={hasChildren && open ? FolderOpenIcon : Folder02Icon}
      />
      {hasChildren && open && node.children!.map(child => (
        <View key={child.id} style={{ paddingLeft: 14 }}>
          <FolderTreeItem node={child} depth={depth + 1} active={active} onSelect={onSelect} />
        </View>
      ))}
    </View>
  );
}

function ViewBtn({ active, onPress, icon }: { active: boolean; onPress: () => void; icon: any }) {
  const c = useSemanticTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.viewBtnInner, { backgroundColor: active ? ACCENT + '20' : 'transparent' }]}
    >
      <HugeiconsIcon icon={icon} size={14} color={active ? ACCENT : c.muted} strokeWidth={1.8} />
    </Pressable>
  );
}

function FileListRow({ file, selected, onPress, extColor }: {
  file: typeof ALL_FILES[0]; selected: boolean; onPress: () => void; extColor: string;
}) {
  const c = useSemanticTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.listRow, { borderTopColor: c.border, backgroundColor: selected ? extColor + '08' : 'transparent' }]}
    >
      <View style={[styles.extBadge, { backgroundColor: extColor + '20' }]}>
        <Text style={[styles.extText, { color: extColor }]}>{file.ext.toUpperCase()}</Text>
      </View>
      <View style={{ flex: 3, minWidth: 0, gap: 2 }}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={[styles.fileName, { color: c.foreground }]}>{file.name}</Text>
          {file.pinned && <HugeiconsIcon icon={Pin02Icon} size={12} color='#f59e0b' strokeWidth={2} />}
        </View>
        <Text style={[styles.fileSize, { color: c.muted }]}>{file.size}</Text>
      </View>
      <Text style={[styles.fileAuthor, { color: c.muted }]} numberOfLines={1}>{file.author}</Text>
      <Text style={[styles.fileDate, { color: c.muted }]} numberOfLines={1}>{file.updated}</Text>
    </Pressable>
  );
}

function FileGridCard({ file, selected, onPress, extColor, pinnedLabel }: {
  file: typeof ALL_FILES[0]; selected: boolean; onPress: () => void; extColor: string; pinnedLabel: string;
}) {
  const c = useSemanticTheme();
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 14, stiffness: 280 }) }],
  }));
  return (
    <Pressable
      onPressIn={() => { scale.value = 0.95; }}
      onPressOut={() => { scale.value = 1; }}
      onPress={onPress}
    >
      <Animated.View style={[
        styles.gridCard,
        { backgroundColor: c.surface, borderColor: selected ? extColor + '60' : c.border },
        anim,
      ]}>
        {selected && (
          <LinearGradient colors={[extColor + '10', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        )}
        <View style={[styles.gridExt, { backgroundColor: extColor + '20' }]}>
          <Text style={[styles.gridExtText, { color: extColor }]}>{file.ext.toUpperCase()}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.gridName, { color: c.foreground }]}>{file.name}</Text>
        <Text style={[styles.gridMeta, { color: c.muted }]}>{file.author} · {file.updated}</Text>
        {file.pinned && (
          <View style={[styles.pinnedChip, { backgroundColor: '#f59e0b20' }]}>
            <HugeiconsIcon icon={Pin02Icon} size={10} color="#f59e0b" strokeWidth={2} />
            <Text style={[styles.pinnedText, { color: '#f59e0b' }]}>{pinnedLabel}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

function EmptyState({ label }: { label: string }) {
  const c = useSemanticTheme();
  return (
    <View style={styles.emptyState}>
      <HugeiconsIcon icon={File02Icon} size={36} color={c.muted + '80'} strokeWidth={1.4} />
      <Text style={[styles.emptyText, { color: c.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rightBtns: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  iconBtn: {
    width: 34, height: 34, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  toolbarRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, height: 38, borderRadius: SigmaRadius.sm, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: SigmaTypo.bodySmall, fontWeight: '500' },
  viewToggle: {
    flexDirection: 'row', borderRadius: SigmaRadius.sm, borderWidth: 1, padding: 2,
  },
  viewBtnInner: {
    width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },

  storageCard: {
    borderRadius: SigmaRadius.md, borderWidth: 1, padding: 12, gap: 8, overflow: 'hidden',
  },
  storageRow: { flexDirection: 'row', justifyContent: 'space-between' },
  storageLbl: { fontSize: SigmaTypo.caption, fontWeight: '500' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 3 },

  sectionCard: {
    borderRadius: SigmaRadius.md, borderWidth: 1, padding: 12, gap: 8, overflow: 'hidden',
  },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeading: { fontSize: SigmaTypo.captionSmall, fontWeight: '700', letterSpacing: 0.6 },

  folderPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 7, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1,
  },
  folderPillText: { fontSize: SigmaTypo.caption },

  statusBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusText: { fontSize: SigmaTypo.caption, fontWeight: '500' },
  clearBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  clearBtnText: { fontSize: SigmaTypo.captionSmall, fontWeight: '600' },

  listContainer: {
    borderRadius: SigmaRadius.lg, borderWidth: 1, overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8,
    gap: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  colHead: { fontSize: SigmaTypo.captionSmall, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  listRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth,
  },
  extBadge: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  extText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  fileName: { fontSize: SigmaTypo.caption, fontWeight: '600', flex: 1 },
  fileSize: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },
  fileAuthor: { flex: 1, fontSize: SigmaTypo.captionSmall, fontWeight: '500', textAlign: 'right' },
  fileDate: { flex: 1, fontSize: SigmaTypo.captionSmall, fontWeight: '500', textAlign: 'right' },

  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gridCell: { width: '48%' },
  gridCard: {
    borderRadius: SigmaRadius.md, borderWidth: 1, padding: 14, gap: 8, overflow: 'hidden',
  },
  gridExt: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gridExtText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  gridName: { fontSize: SigmaTypo.caption, fontWeight: '600', lineHeight: 17 },
  gridMeta: { fontSize: SigmaTypo.captionSmall, fontWeight: '500' },
  pinnedChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start',
  },
  pinnedText: { fontSize: 10, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyText: { fontSize: SigmaTypo.bodySmall, fontWeight: '500' },
});
