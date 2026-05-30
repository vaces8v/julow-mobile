import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Mode = 'login' | 'register';

type Props = {
  mode: Mode;
  loginTitle: string;
  loginSubtitle: string;
  registerTitle: string;
  registerSubtitle: string;
};

export const AuthTitleBlock = memo(function AuthTitleBlock({
  mode,
  loginTitle,
  loginSubtitle,
  registerTitle,
  registerSubtitle,
}: Props) {
  const title = mode === 'login' ? loginTitle : registerTitle;
  const subtitle = mode === 'login' ? loginSubtitle : registerSubtitle;

  return (
    <View style={styles.block}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    marginBottom: 16,
    gap: 4,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  subtitle: {
    color: 'rgba(226,232,240,0.68)',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
