import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import { UserMultiple02Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

export const CHAT_PALETTE = ['#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#22c55e', '#ec4899'];

export function chatColorFromId(id: string, override?: string): string {
  if (override) return override;
  return CHAT_PALETTE[id.charCodeAt(0) % CHAT_PALETTE.length];
}

export function chatInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function gradientPair(base: string): [string, string] {
  return [base, `${base}CC`];
}

type ChatAvatarProps = {
  id: string;
  name: string;
  chatType: string;
  color?: string;
  size?: number;
  showRing?: boolean;
  unread?: boolean;
};

export function ChatAvatar({
  id,
  name,
  chatType,
  color,
  size = 52,
  showRing = false,
  unread = false,
}: ChatAvatarProps) {
  const c = useSemanticTheme();
  const isDm = chatType === 'dm';
  const base = chatColorFromId(id, color);
  const [g0, g1] = gradientPair(base);
  const radius = isDm ? size / 2 : size * 0.28;
  const initials = chatInitials(name || '?');

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size + (showRing ? 6 : 0),
          height: size + (showRing ? 6 : 0),
        },
      ]}
    >
      {showRing && unread && (
        <View
          style={[
            styles.ring,
            {
              width: size + 6,
              height: size + 6,
              borderRadius: isDm ? (size + 6) / 2 : size * 0.28 + 3,
              borderColor: c.accent,
            },
          ]}
        />
      )}
      <LinearGradient
        colors={[g0, g1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: radius,
            borderCurve: 'continuous',
          },
        ]}
      >
        {isDm ? (
          <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
        ) : (
          <HugeiconsIcon icon={UserMultiple02Icon} size={size * 0.42} color="#fff" strokeWidth={1.8} />
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  },
  initials: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
