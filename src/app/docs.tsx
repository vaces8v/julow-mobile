import { DocBlockRenderer } from '@/components/docs/doc-block-renderer';
import { Fade } from '@/components/ui/fade';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { useI18n } from '@/i18n/context';
import { getDocs } from '@/lib/docs/content';
import { DOC_SECTION_ICONS } from '@/lib/docs/section-icons';
import type { DocSectionId } from '@/lib/docs/types';
import { DEFAULT_DOC_SECTION } from '@/lib/docs/types';
import { getLightRaisedCardStyle } from '@/lib/theme-surfaces';
import { ArrowLeft01Icon, BookOpen02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { BlurTargetView } from 'expo-blur';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DocsScreen() {
  const insets = useSafeAreaInsets();
  const c = useSemanticTheme();
  const { locale, t } = useI18n();
  const docs = getDocs(locale);
  const [activeId, setActiveId] = useState<DocSectionId>(DEFAULT_DOC_SECTION);
  const contentScrollRef = useRef<ScrollView>(null);

  const section = docs.sections[activeId] ?? docs.sections[DEFAULT_DOC_SECTION];

  const navItems = useMemo(
    () =>
      docs.navGroups.flatMap((g) =>
        g.sections.map((sid) => ({
          group: g.label,
          ...docs.sections[sid],
        })),
      ),
    [docs],
  );

  const onSelectSection = (id: DocSectionId) => {
    setActiveId(id);
    contentScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} style={styles.headerSide} hitSlop={8}>
          <HugeiconsIcon icon={ArrowLeft01Icon} size={22} color={c.foreground} strokeWidth={1.8} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: c.foreground }]} numberOfLines={1}>
            {docs.pageTitle}
          </Text>
          <Text style={[styles.headerSub, { color: c.muted }]} numberOfLines={1}>
            {section.title}
          </Text>
        </View>
        <View style={[styles.headerSide, styles.headerIconWrap, { backgroundColor: c.accent + '18' }]}>
          <HugeiconsIcon icon={BookOpen02Icon} size={18} color={c.accent} strokeWidth={1.8} />
        </View>
      </View>

      <BlurTargetView style={styles.flex1} collapsable={false}>
        <View style={[styles.navPanel, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
          <Text style={[styles.navGroupHint, { color: c.muted }]}>{docs.pageSubtitle}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.navStrip}>
            {navItems.map((item) => {
              const active = item.id === activeId;
              const Icon = DOC_SECTION_ICONS[item.id as DocSectionId];
              return (
                <Pressable
                  key={item.id}
                  onPress={() => onSelectSection(item.id as DocSectionId)}
                  style={[
                    styles.navChip,
                    {
                      backgroundColor: active ? c.accent + '18' : c.surfaceSecondary,
                      borderColor: active ? c.accent + '55' : c.border,
                    },
                  ]}>
                  <HugeiconsIcon
                    icon={Icon}
                    size={14}
                    color={active ? c.accent : c.muted}
                    strokeWidth={1.8}
                  />
                  <Text
                    style={[
                      styles.navChipText,
                      { color: active ? c.accent : c.muted },
                      active && styles.navChipTextActive,
                    ]}
                    numberOfLines={1}>
                    {item.title}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          ref={contentScrollRef}
          style={styles.flex1}
          showsVerticalScrollIndicator
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: insets.bottom + 40,
            flexGrow: 1,
          }}>
          <Fade delay={0} initialY={8}>
            <View style={styles.heroRow}>
              <View style={[styles.heroIcon, { backgroundColor: c.accent + '18' }]}>
                <HugeiconsIcon
                  icon={DOC_SECTION_ICONS[section.id]}
                  size={22}
                  color={c.accent}
                  strokeWidth={1.8}
                />
              </View>
              <View style={styles.flex1}>
                <Text style={[styles.heroKicker, { color: c.accent }]}>
                  {docs.pageTitle.toUpperCase()}
                </Text>
                <Text style={[styles.heroTitle, { color: c.foreground }]}>{section.title}</Text>
                <Text style={[styles.heroDesc, { color: c.muted }]}>{section.description}</Text>
              </View>
            </View>
          </Fade>

          <Fade delay={40} initialY={8} style={styles.panelWrap}>
            <View
              style={[
                styles.panel,
                c.scheme === 'light'
                  ? getLightRaisedCardStyle(c)
                  : { backgroundColor: c.surface, borderColor: c.border },
              ]}>
              <View style={styles.blocks}>
                {section.blocks.map((block, i) => (
                  <DocBlockRenderer key={`${section.id}-${i}`} block={block} />
                ))}
              </View>
            </View>
          </Fade>

          <Fade delay={60} initialY={6} style={styles.footerWrap}>
            <Text style={[styles.footerHint, { color: c.muted }]}>{t.docs.sameOnWeb}</Text>
          </Fade>
        </ScrollView>
      </BlurTargetView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  headerSide: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerIconWrap: { borderRadius: SigmaRadius.lg },
  headerCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  headerTitle: { fontSize: SigmaTypo.headline, fontWeight: '700' },
  headerSub: { fontSize: SigmaTypo.captionSmall, fontWeight: '500', marginTop: 2 },
  navPanel: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: 10,
  },
  navGroupHint: {
    fontSize: SigmaTypo.captionSmall,
    fontWeight: '500',
    lineHeight: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  navStrip: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  navChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 200,
  },
  navChipText: { fontSize: SigmaTypo.captionSmall, fontWeight: '600', maxWidth: 150 },
  navChipTextActive: { fontWeight: '800' },
  heroRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: SigmaRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },
  heroTitle: {
    fontSize: SigmaTypo.title2,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  heroDesc: { fontSize: SigmaTypo.bodySmall, fontWeight: '500', lineHeight: 20, marginTop: 6 },
  panelWrap: { marginTop: 20 },
  panel: { borderRadius: SigmaRadius.xl, borderWidth: 1, overflow: 'hidden' },
  blocks: { padding: 18, gap: 16 },
  footerWrap: { marginTop: 16 },
  footerHint: { fontSize: SigmaTypo.caption, fontWeight: '500', textAlign: 'center', lineHeight: 18 },
});
