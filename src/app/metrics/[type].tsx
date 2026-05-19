import { MiniBarChart } from '@/components/charts/MiniBarChart';
import { SigmaRadius, SigmaTypo } from '@/constants/sigma';
import { useSemanticTheme } from '@/hooks/use-semantic-theme';
import type { SemanticTheme } from '@/hooks/use-semantic-theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowDownRight, ArrowUpRight, Calendar, ChevronLeft, Flame, Target, TrendingUp, Trophy } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

export default function MetricsModalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const c = useSemanticTheme();
  const styles = useMemo(() => createStyles(c), [c]);

  const isTasks = type === 'tasks';

  const chartData = isTasks
    ? [{ value: 20 }, { value: 45 }, { value: 30 }, { value: 70 }, { value: 65 }, { value: 80 }, { value: 50 }, { value: 90 }, { value: 60 }, { value: 40 }]
    : [{ value: 40 }, { value: 60 }, { value: 45 }, { value: 70 }, { value: 90 }, { value: 65 }, { value: 80 }, { value: 30 }, { value: 50 }, { value: 25 }];

  const color = isTasks ? c.warning : c.accent;
  const title = isTasks ? '128' : '46 ч';
  const subtitle = isTasks ? 'Задач завершено' : 'Затрекано времени';
  const headerTitle = isTasks ? 'Статистика задач' : 'Статистика времени';

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const weekValues = isTasks
    ? [12, 18, 24, 16, 22, 8, 4]
    : [7.5, 8, 9, 6.5, 8.5, 3, 1.5];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={15}>
          <View style={[styles.backBtnBg, { backgroundColor: c.default }]}>
            <ChevronLeft size={22} color={c.foreground} strokeWidth={2.5} />
          </View>
        </Pressable>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={{ width: 44 }} />
      </Animated.View>

      <Animated.ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <MiniBarChart
          data={chartData}
          width={SCREEN_W - 40}
          height={240}
          color={color}
          title={title}
          subtitle={subtitle}
          sharedTransitionTag={`metrics-chart-${type}`}
        />

        <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.quickStatsRow}>
          <View style={[styles.quickStat, { borderColor: color + '30' }]}>
            <View style={[styles.quickStatIcon, { backgroundColor: color + '20' }]}>
              <TrendingUp size={16} color={color} strokeWidth={2.5} />
            </View>
            <Text style={styles.quickStatValue}>{isTasks ? '+18%' : '+12%'}</Text>
            <Text style={styles.quickStatLabel}>vs прошл.</Text>
          </View>
          <View style={[styles.quickStat, { borderColor: color + '30' }]}>
            <View style={[styles.quickStatIcon, { backgroundColor: color + '20' }]}>
              <Flame size={16} color={color} strokeWidth={2.5} />
            </View>
            <Text style={styles.quickStatValue}>{isTasks ? '7' : '5'}</Text>
            <Text style={styles.quickStatLabel}>дней подряд</Text>
          </View>
          <View style={[styles.quickStat, { borderColor: color + '30' }]}>
            <View style={[styles.quickStatIcon, { backgroundColor: color + '20' }]}>
              <Trophy size={16} color={color} strokeWidth={2.5} />
            </View>
            <Text style={styles.quickStatValue}>{isTasks ? 'Ср' : 'Вт'}</Text>
            <Text style={styles.quickStatLabel}>лучший</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color={color} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Эта неделя</Text>
          </View>
          <View style={styles.statsCard}>
            {weekDays.map((day, i) => {
              const val = weekValues[i];
              const maxVal = Math.max(...weekValues);
              const pct = (val / maxVal) * 100;
              const isToday = i === new Date().getDay() - 1;
              return (
                <View key={day} style={styles.weekRow}>
                  <Text style={[styles.weekDay, isToday && styles.weekDayToday]}>{day}</Text>
                  <View style={styles.weekBarBg}>
                    <View style={[styles.weekBarFill, { width: `${pct}%`, backgroundColor: isToday ? color : color + '80' }]} />
                  </View>
                  <Text style={[styles.weekValue, isToday && styles.weekValueToday]}>
                    {isTasks ? val : `${val}ч`}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).springify()} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={18} color={color} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Подробности</Text>
          </View>
          <View style={styles.statsCard}>
            <StatRow styles={styles} label="За эту неделю" value={isTasks ? '+24' : '+12 ч'} valueColor={color} trend="up" c={c} />
            <View style={styles.divider} />
            <StatRow styles={styles} label="В среднем за день" value={isTasks ? '18' : '6.5 ч'} valueColor={color} c={c} />
            <View style={styles.divider} />
            <StatRow styles={styles} label="Лучший результат" value={isTasks ? '24 (Ср)' : '9 ч (Ср)'} valueColor={color} trend="up" c={c} />
            <View style={styles.divider} />
            <StatRow styles={styles} label="Прошлая неделя" value={isTasks ? '104' : '38 ч'} valueColor={c.muted} trend="down" c={c} />
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

function StatRow({
  styles,
  label,
  value,
  valueColor,
  trend,
  c,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
  valueColor: string;
  trend?: 'up' | 'down';
  c: SemanticTheme;
}) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {trend === 'up' && <ArrowUpRight size={14} color={c.success} strokeWidth={2.5} />}
        {trend === 'down' && <ArrowDownRight size={14} color={c.muted} strokeWidth={2.5} />}
        <Text style={[styles.statValue, { color: valueColor }]}>{value}</Text>
      </View>
    </View>
  );
}

function createStyles(c: SemanticTheme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      height: 54,
    },
    backBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: -8,
    },
    backBtnBg: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerTitle: {
      color: c.foreground,
      fontSize: SigmaTypo.headline,
      fontWeight: '600',
    },
    scrollContent: {
      padding: 20,
      paddingTop: 10,
    },
    quickStatsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    quickStat: {
      flex: 1,
      backgroundColor: c.surfaceSecondary,
      borderRadius: SigmaRadius.lg,
      padding: 14,
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
    },
    quickStatIcon: {
      width: 32,
      height: 32,
      borderRadius: SigmaRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    quickStatValue: {
      color: c.foreground,
      fontSize: SigmaTypo.headline,
      fontWeight: '700',
    },
    quickStatLabel: {
      color: c.muted,
      fontSize: SigmaTypo.captionSmall,
      fontWeight: '500',
    },
    section: {
      marginTop: 28,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
    },
    sectionTitle: {
      color: c.foreground,
      fontSize: SigmaTypo.headline,
      fontWeight: '700',
    },
    statsCard: {
      backgroundColor: c.surfaceSecondary,
      borderRadius: SigmaRadius.xl,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
    },
    weekRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 7,
      gap: 12,
    },
    weekDay: {
      color: c.muted,
      fontSize: SigmaTypo.caption,
      fontWeight: '600',
      width: 22,
    },
    weekDayToday: {
      color: c.foreground,
      fontWeight: '700',
    },
    weekBarBg: {
      flex: 1,
      height: 8,
      borderRadius: SigmaRadius.xs,
      backgroundColor: c.default,
      overflow: 'hidden',
    },
    weekBarFill: {
      height: '100%',
      borderRadius: SigmaRadius.xs,
    },
    weekValue: {
      color: c.muted,
      fontSize: SigmaTypo.caption,
      fontWeight: '600',
      width: 32,
      textAlign: 'right',
    },
    weekValueToday: {
      color: c.foreground,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    statLabel: {
      color: c.muted,
      fontSize: SigmaTypo.bodySmall,
      fontWeight: '500',
    },
    statValue: {
      fontSize: SigmaTypo.body,
      fontWeight: '700',
    },
    divider: {
      height: 1,
      backgroundColor: c.separator,
      marginVertical: 10,
    },
  });
}
