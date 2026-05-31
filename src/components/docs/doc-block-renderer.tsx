import {
  Alert02Icon,
  BulbIcon,
  InformationCircleIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { DocInlineText } from '@/components/docs/doc-inline-text';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import type { DocBlock } from '@/lib/docs/types';

function CalloutIcon({ variant }: { variant: 'info' | 'tip' | 'warning' }) {
  const c = useSemanticTheme();
  if (variant === 'tip') {
    return <HugeiconsIcon icon={BulbIcon} size={18} color={c.success} strokeWidth={1.8} />;
  }
  if (variant === 'warning') {
    return <HugeiconsIcon icon={Alert02Icon} size={18} color="#f59e0b" strokeWidth={1.8} />;
  }
  return <HugeiconsIcon icon={InformationCircleIcon} size={18} color={c.accent} strokeWidth={1.8} />;
}

export function DocBlockRenderer({ block }: { block: DocBlock }) {
  const c = useSemanticTheme();

  switch (block.type) {
    case 'p':
      return <DocInlineText text={block.text} />;
    case 'h2':
      return (
        <View style={[styles.h2Wrap, { borderBottomColor: c.border }]}>
          <Text style={[styles.h2, { color: c.foreground }]}>{block.text}</Text>
        </View>
      );
    case 'h3':
      return <Text style={[styles.h3, { color: c.foreground }]}>{block.text}</Text>;
    case 'ul':
      return (
        <View style={styles.list}>
          {block.items.map((item) => (
            <View key={item} style={styles.listRow}>
              <View style={[styles.dot, { backgroundColor: c.accent }]} />
              <View style={styles.listTextWrap}>
                <DocInlineText text={item} />
              </View>
            </View>
          ))}
        </View>
      );
    case 'ol':
      return (
        <View style={styles.list}>
          {block.items.map((item, i) => (
            <View key={item} style={styles.listRow}>
              <View style={[styles.olBadge, { backgroundColor: c.surfaceSecondary }]}>
                <Text style={[styles.olNum, { color: c.accent }]}>{i + 1}</Text>
              </View>
              <View style={styles.listTextWrap}>
                <DocInlineText text={item} />
              </View>
            </View>
          ))}
        </View>
      );
    case 'steps':
      return (
        <View style={styles.list}>
          {block.items.map((step, i) => (
            <View
              key={step.title}
              style={[styles.stepCard, { borderColor: c.border, backgroundColor: c.surfaceSecondary + '80' }]}>
              <View style={[styles.stepNum, { backgroundColor: c.accent + '18' }]}>
                <Text style={[styles.stepNumText, { color: c.accent }]}>{i + 1}</Text>
              </View>
              <View style={styles.listTextWrap}>
                <Text style={[styles.stepTitle, { color: c.foreground }]}>{step.title}</Text>
                <DocInlineText text={step.body} style={styles.stepBody} />
              </View>
            </View>
          ))}
        </View>
      );
    case 'card':
      return (
        <View
          style={[
            styles.card,
            {
              borderColor: block.variant === 'tip' ? c.success + '40' : c.border,
              backgroundColor: block.variant === 'tip' ? c.success + '10' : c.surfaceSecondary + '90',
            },
          ]}>
          <HugeiconsIcon
            icon={Tick02Icon}
            size={18}
            color={block.variant === 'tip' ? c.success : c.accent}
            strokeWidth={1.8}
          />
          <View style={styles.listTextWrap}>
            <Text style={[styles.stepTitle, { color: c.foreground }]}>{block.title}</Text>
            <DocInlineText text={block.body} style={styles.stepBody} />
          </View>
        </View>
      );
    case 'code':
      return (
        <View style={[styles.code, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Text style={[styles.codeText, { color: c.foreground }]}>{block.text}</Text>
        </View>
      );
    case 'callout':
      return (
        <View
          style={[
            styles.callout,
            {
              borderColor:
                block.variant === 'tip'
                  ? c.success + '40'
                  : block.variant === 'warning'
                    ? '#f59e0b40'
                    : c.accent + '40',
              backgroundColor:
                block.variant === 'tip'
                  ? c.success + '12'
                  : block.variant === 'warning'
                    ? '#f59e0b12'
                    : c.accent + '10',
            },
          ]}>
          <CalloutIcon variant={block.variant} />
          <View style={styles.listTextWrap}>
            {block.title ? (
              <Text style={[styles.stepTitle, { color: c.foreground }]}>{block.title}</Text>
            ) : null}
            <DocInlineText text={block.text} style={block.title ? styles.stepBody : undefined} />
          </View>
        </View>
      );
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  h2Wrap: { borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 10, marginTop: 4 },
  h2: { fontSize: SigmaTypo.title3, fontWeight: '800', letterSpacing: -0.2 },
  h3: { fontSize: SigmaTypo.headline, fontWeight: '700', marginTop: 4 },
  list: { gap: 10 },
  listRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  listTextWrap: { flex: 1, minWidth: 0 },
  dot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  olBadge: {
    width: 24,
    height: 24,
    borderRadius: SigmaRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  olNum: { fontSize: 12, fontWeight: '800' },
  stepCard: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: SigmaRadius.lg,
    padding: 14,
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: SigmaRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: 14, fontWeight: '800' },
  stepTitle: { fontSize: SigmaTypo.bodySmall, fontWeight: '700', marginBottom: 4 },
  stepBody: { marginTop: 2 },
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: SigmaRadius.lg,
    padding: 14,
    alignItems: 'flex-start',
  },
  code: {
    borderWidth: 1,
    borderRadius: SigmaRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  codeText: {
    fontSize: SigmaTypo.caption,
    fontWeight: '500',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  callout: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: SigmaRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
});
