import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  RefreshControl,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStore from '@/store/useStore';

// ─────────────────────────────────────────────
// Theme
// ─────────────────────────────────────────────
const C = {
  bg: '#0A0B0D',
  surface: '#13151A',
  surfaceElevated: '#1C1F27',
  border: '#242830',
  accent: '#6EE7B7',
  accentDim: '#1A3B30',
  indigo: '#818CF8',
  indigoDim: '#1E1F3A',
  amber: '#FCD34D',
  amberDim: '#2D2510',
  text: '#F1F5F9',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
};

// ─────────────────────────────────────────────
// Placeholder data
// ─────────────────────────────────────────────
const WEEKLY_BARS = [
  { day: 'Mon', value: 0.72 },
  { day: 'Tue', value: 0.88 },
  { day: 'Wed', value: 0.55 },
  { day: 'Thu', value: 0.95 },
  { day: 'Fri', value: 0.60 },
  { day: 'Sat', value: 0.40 },
  { day: 'Sun', value: 0.78 },
];
const TODAY_IDX = 6; // Sunday = today

// const TOTAL_CALORIES = 1475; // Replaced by useStore
// const CALORIE_GOAL = 2000; // Replaced by useStore
const STEPS = 6_842;
const STEPS_GOAL = 10_000;
const CONSISTENCY = 78; // percent

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

/** Top hero card – today's calories */
function CalorieCard() {
  const totalCalories = useStore((state) => state.totalCalories);
  const totalProtein = useStore((state) => state.totalProtein);
  const totalCarbs = useStore((state) => state.totalCarbs);
  const totalFat = useStore((state) => state.totalFat);
  
  const goalCalories = useStore((state: any) => state.goalCalories);
  
  const isOver = totalCalories > goalCalories;
  const pct = Math.min(totalCalories / goalCalories, 1.2); // allow slightly over for visualization
  const diff = Math.abs(goalCalories - totalCalories);

  // Macro goals (example balanced split: 30/40/30)
  const PROTEIN_GOAL = Math.round((goalCalories * 0.30) / 4);
  const CARBS_GOAL = Math.round((goalCalories * 0.40) / 4);
  const FAT_GOAL = Math.round((goalCalories * 0.30) / 9);

  const proteinPct = Math.min(totalProtein / PROTEIN_GOAL, 1);
  const carbsPct = Math.min(totalCarbs / CARBS_GOAL, 1);
  const fatPct = Math.min(totalFat / FAT_GOAL, 1);

  return (
    <View style={[styles.card, styles.heroCard, isOver && { borderColor: '#F87171' }]}>
      {/* Top row */}
      <View style={styles.heroTop}>
        <View>
          <Text style={styles.heroLabel}>Total Calories Today</Text>
          <Text style={styles.heroNumber}>
            {totalCalories.toLocaleString()}
            <Text style={styles.heroUnit}> kcal</Text>
          </Text>
        </View>
        <View style={[styles.heroBadge, isOver && { backgroundColor: '#450A0A' }]}>
          <Text style={styles.heroBadgeText}>{isOver ? '⚠️' : '🔥'}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(pct,1) * 100}%` as any, backgroundColor: isOver ? '#F87171' : C.accent }]} />
      </View>

      {/* Footer row */}
      <View style={styles.heroFooter}>
        <Text style={styles.heroFooterText}>Goal: {goalCalories.toLocaleString()} kcal</Text>
        <Text style={[styles.heroFooterText, { color: isOver ? '#F87171' : C.accent }]}>
          {diff.toLocaleString()} {isOver ? 'over limit' : 'remaining'}
        </Text>
      </View>

      {/* Macro chips */}
      <View style={styles.macroRow}>
        {[
          { label: 'Protein', value: `${totalProtein}g`, pct: proteinPct, color: C.indigo },
          { label: 'Carbs', value: `${totalCarbs}g`, pct: carbsPct, color: C.amber },
          { label: 'Fat', value: `${totalFat}g`, pct: fatPct, color: C.accent },
        ].map(m => (
          <View key={m.label} style={styles.macroChip}>
            <View style={styles.macroChipTrack}>
              <View
                style={[
                  styles.macroChipFill,
                  { 
                    width: `${m.pct * 100}%` as any,
                    backgroundColor: m.color || C.accent 
                  },
                ]}
              />
            </View>
            <Text style={styles.macroLabel}>{m.label}</Text>
            <Text style={styles.macroValue}>{m.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Weekly bar chart (placeholder) */
function WeeklyChart() {
  const weeklyData = useStore((state: any) => state.weeklyData);
  const goalCalories = useStore((state: any) => state.goalCalories);
  const totalCalories = useStore((state: any) => state.totalCalories);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Weekly Overview</Text>
        <View style={styles.chipPill}>
          <Text style={styles.chipPillText}>This week</Text>
        </View>
      </View>
      <Text style={styles.cardSubtitle}>Calorie intake vs. goal</Text>

      {/* Bars */}
      <View style={styles.chartArea}>
        {weeklyData.map((day: any, i: number) => {
          const isToday = i === (weeklyData.length - 1);
          // Use real calories for today from daily total if it's the current date
          const barValue = Math.min(day.calories / goalCalories, 1.2);

          return (
            <View key={day.date} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: `${barValue * 100}%` as any,
                      backgroundColor: isToday ? C.accent : C.surfaceElevated,
                      borderColor: isToday ? C.accent : C.border,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barDay, isToday && { color: C.accent }]}>
                {day.dayName}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: C.accent }]} />
          <Text style={styles.legendText}>Today</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: C.surfaceElevated, borderWidth: 1, borderColor: C.border }]} />
          <Text style={styles.legendText}>Other days</Text>
        </View>
      </View>
    </View>
  );
}

/** Steps card */
function StepsCard() {
  const pct = Math.min(STEPS / STEPS_GOAL, 1);

  return (
    <View style={[styles.card, styles.halfCard]}>
      <View style={styles.statIconWrap}>
        <Text style={styles.statIcon}>👟</Text>
      </View>
      <Text style={styles.statNumber}>{STEPS.toLocaleString()}</Text>
      <Text style={styles.statLabel}>Steps walked</Text>

      {/* Ring-style progress */}
      <View style={styles.miniProgressTrack}>
        <View
          style={[
            styles.miniProgressFill,
            {
              width: `${pct * 100}%` as any,
              backgroundColor: C.indigo,
            },
          ]}
        />
      </View>
      <Text style={styles.statGoalText}>{STEPS_GOAL.toLocaleString()} goal</Text>
    </View>
  );
}

/** Consistency card */
function ConsistencyCard() {
  const daysTracked = useStore((s: any) => s.daysTracked);
  const weeklyData = useStore((s: any) => s.weeklyData);
  const consistencyPct = Math.round((daysTracked / 7) * 100);

  return (
    <View style={[styles.card, styles.halfCard]}>
      <View style={styles.statIconWrap}>
        <Text style={styles.statIcon}>⚡</Text>
      </View>
      <Text style={[styles.statNumber, { color: C.amber }]}>{consistencyPct}%</Text>
      <Text style={styles.statLabel}>Consistency score</Text>

      {/* Dot grid for last 7 days */}
      <View style={styles.dotGrid}>
        {weeklyData.map((day: any) => (
          <View
            key={day.date}
            style={[
              styles.dot,
              { backgroundColor: day.calories > 0 ? C.amber : C.surfaceElevated },
            ]}
          />
        ))}
      </View>
      <Text style={styles.statGoalText}>Last 7 days</Text>
    </View>
  );
}

/** Last 7 Days Summary Card */
function WeeklySummaryCard() {
  const weeklyTotalCalories = useStore((s: any) => s.weeklyTotalCalories);
  const avgCaloriesPerDay = useStore((s: any) => s.avgCaloriesPerDay);
  const daysTracked = useStore((s: any) => s.daysTracked);
  const streak = useStore((s: any) => s.streak);
  const trendMessage = useStore((s: any) => s.trendMessage);
  const trendStatus = useStore((s: any) => s.trendStatus);

  const trendColor = trendStatus === 'improving' ? C.accent : (trendStatus === 'warning' ? '#F87171' : C.textMuted);

  return (
    <View style={styles.card}>
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{avgCaloriesPerDay.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Avg kcal/day</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{weeklyTotalCalories.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>Total kcal</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{daysTracked}/7</Text>
          <Text style={styles.summaryLabel}>Days tracked</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: C.accent }]}>{streak}</Text>
          <Text style={styles.summaryLabel}>Streak</Text>
        </View>
      </View>

      {/* Trend message */}
      <View style={styles.trendContainer}>
        <View style={[styles.trendDot, { backgroundColor: trendColor }]} />
        <Text style={[styles.trendText, { color: trendColor }]}>{trendMessage}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────
export default function DashboardScreen() {
  const fetchEntries = useStore((s: any) => s.fetchEntries);
  const fetchWeeklyData = useStore((s: any) => s.fetchWeeklyData);
  const weeklyData = useStore((s: any) => s.weeklyData);
  const totalCalories = useStore((s: any) => s.totalCalories);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh data when user navigates to this tab
  useFocusEffect(
    useCallback(() => {
      fetchEntries().catch(console.error);
      fetchWeeklyData().catch(console.error);
    }, [fetchEntries, fetchWeeklyData])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchEntries(),
        fetchWeeklyData()
      ]);
    } catch (err) {
      console.error("Dashboard refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={C.accent}
            colors={[C.accent]}
            progressBackgroundColor={C.surfaceElevated}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Dashboard</Text>
          <Text style={styles.screenSub}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Hero */}
        <SectionLabel label="TODAY" />
        <CalorieCard />

        {/* Last 7 Days Summary */}
        <SectionLabel label="LAST 7 DAYS" />
        <WeeklySummaryCard />

        {/* Weekly chart */}
        <WeeklyChart />

        {/* Steps + Consistency side by side */}
        <SectionLabel label="ACTIVITY" />
        <View style={styles.halfRow}>
          <StepsCard />
          <ConsistencyCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 100 },

  // Summary Card
  summaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: C.border,
    opacity: 0.6,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 8,
  },
  trendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Header
  header: { paddingTop: 16, paddingBottom: 20 },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },

  // Card base
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    marginBottom: 16,
  },

  // Pill chip
  chipPill: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipPillText: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: '500',
  },

  // Hero card
  heroCard: { paddingBottom: 16 },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroLabel: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  heroNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -1,
  },
  heroUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: C.textMuted,
    letterSpacing: 0,
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: { fontSize: 22 },

  // Progress bar
  progressTrack: {
    height: 6,
    backgroundColor: C.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.accent,
    borderRadius: 3,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  heroFooterText: {
    fontSize: 13,
    color: C.textMuted,
  },

  // Macro chips
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroChip: {
    flex: 1,
    backgroundColor: C.surfaceElevated,
    borderRadius: 12,
    padding: 10,
  },
  macroChipTrack: {
    height: 3,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  macroChipFill: {
    height: '100%',
    backgroundColor: C.accent,
    opacity: 0.7,
    borderRadius: 2,
  },
  macroLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 2,
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },

  // Quick stats
  quickRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  quickValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  quickUnit: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },
  quickLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  // Chart
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 100,
    marginBottom: 12,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barTrack: {
    flex: 1,
    width: '60%',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 6,
    borderWidth: 1,
  },
  barDay: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '500',
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: C.textMuted,
  },

  // Half cards
  halfRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statIcon: { fontSize: 22 },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 4,
    marginBottom: 12,
    textAlign: 'center',
  },

  // Mini progress (steps)
  miniProgressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: C.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statGoalText: {
    fontSize: 11,
    color: C.textMuted,
  },

  // Dot grid (consistency)
  dotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
});
