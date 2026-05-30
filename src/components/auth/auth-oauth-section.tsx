import {
  GitHubBrandIcon,
  GoogleBrandIcon,
  YandexBrandIcon,
} from '@/components/auth/oauth-brand-icons';
import { Separator } from 'heroui-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type OAuthProvider = 'google' | 'yandex' | 'github';

type Props = {
  dividerLabel: string;
  googleLabel: string;
  yandexLabel: string;
  githubLabel: string;
  onOAuth: (provider: OAuthProvider) => void;
  foreground: string;
  muted: string;
  border: string;
  surface: string;
};

function OAuthButton({
  label,
  icon,
  onPress,
  border,
  surface,
  foreground,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  border: string;
  surface: string;
  foreground: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.oauthBtn,
        { borderColor: border, backgroundColor: surface },
        pressed && styles.oauthBtnPressed,
      ]}
    >
      {icon}
      <Text style={[styles.oauthLabel, { color: foreground }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AuthOAuthSection({
  dividerLabel,
  googleLabel,
  yandexLabel,
  githubLabel,
  onOAuth,
  foreground,
  muted,
  border,
  surface,
}: Props) {
  return (
    <>
      <View style={styles.dividerRow}>
        <Separator className="flex-1" />
        <Text style={[styles.dividerText, { color: muted }]}>{dividerLabel}</Text>
        <Separator className="flex-1" />
      </View>
      <View style={styles.grid}>
        <OAuthButton
          label={googleLabel}
          icon={<GoogleBrandIcon size={18} />}
          onPress={() => onOAuth('google')}
          border={border}
          surface={surface}
          foreground={foreground}
        />
        <OAuthButton
          label={yandexLabel}
          icon={<YandexBrandIcon size={18} />}
          onPress={() => onOAuth('yandex')}
          border={border}
          surface={surface}
          foreground={foreground}
        />
        <OAuthButton
          label={githubLabel}
          icon={<GitHubBrandIcon size={18} color={foreground} />}
          onPress={() => onOAuth('github')}
          border={border}
          surface={surface}
          foreground={foreground}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 12,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  oauthBtn: {
    flexBasis: '47%',
    flexGrow: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  oauthBtnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  oauthLabel: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
});
