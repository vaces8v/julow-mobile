import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';

export function DocInlineText({ text, style }: { text: string; style?: object }) {
  const c = useSemanticTheme();
  const parts = text.split(/\s*(?:→|➜|➔|->)\s*/);
  if (parts.length === 1) {
    return <Text style={[styles.body, { color: c.foreground }, style]}>{text}</Text>;
  }
  return (
    <View style={styles.inlineRow}>
      {parts.map((part, i) => (
        <View key={`${i}-${part.slice(0, 8)}`} style={styles.inlineRow}>
          {i > 0 ? (
            <HugeiconsIcon icon={ArrowRight01Icon} size={14} color={c.muted} strokeWidth={2} />
          ) : null}
          <Text style={[styles.body, { color: c.foreground }, style]}>{part}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: SigmaTypo.bodySmall, fontWeight: '500', lineHeight: 22 },
  inlineRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
});
