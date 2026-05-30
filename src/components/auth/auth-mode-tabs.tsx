import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type AuthMode = 'login' | 'register';

type Props = {
  mode: AuthMode;
  loginLabel: string;
  registerLabel: string;
  onModeChange: (mode: AuthMode) => void;
};

export const AuthModeTabs = memo(function AuthModeTabs({
  mode,
  loginLabel,
  registerLabel,
  onModeChange,
}: Props) {
  return (
    <View style={styles.track}>
      <Pressable
        onPress={() => onModeChange('login')}
        style={styles.tab}
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'login' }}
      >
        <Text style={[styles.tabText, mode === 'login' ? styles.tabTextActive : styles.tabTextInactive]}>
          {loginLabel}
        </Text>
        {mode === 'login' ? <View style={styles.underline} /> : <View style={styles.underlinePlaceholder} />}
      </Pressable>

      <Pressable
        onPress={() => onModeChange('register')}
        style={styles.tab}
        accessibilityRole="tab"
        accessibilityState={{ selected: mode === 'register' }}
      >
        <Text style={[styles.tabText, mode === 'register' ? styles.tabTextActive : styles.tabTextInactive]}>
          {registerLabel}
        </Text>
        {mode === 'register' ? <View style={styles.underline} /> : <View style={styles.underlinePlaceholder} />}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 14,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minWidth: 72,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextInactive: {
    color: 'rgba(255,255,255,0.42)',
  },
  underline: {
    marginTop: 4,
    height: 2,
    width: '100%',
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  underlinePlaceholder: {
    marginTop: 4,
    height: 2,
    width: '100%',
  },
});
