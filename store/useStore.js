import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import dayjs from 'dayjs';

/**
 * useStore — global Zustand store for Kcalyx
 * 
 * Each entry shape:
 * {
 *   id: string,
 *   text: string,
 *   items: Array<{
 *     name: string,
 *     quantity: number,
 *     unit: string,
 *     calories: number,
 *     protein: number,
 *     carbs: number,
 *     fat: number
 *   }>,
 *   time: string,
 *   type: 'food' | 'activity'
 * }
 */
const useStore = create((set) => ({
  // ── Auth state ────────────────────────────────────────────
  user: null,
  isLoading: true,
  apiKey: null,
  isApiKeyLoading: true,
  isWeeklyLoading: false,
  weeklyError: null,

  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setApiKey: async (key) => {
    set({ apiKey: key });
    if (key) {
      await AsyncStorage.setItem('openrouter_api_key', key);
    } else {
      await AsyncStorage.removeItem('openrouter_api_key');
    }
  },
  loadApiKey: async () => {
    try {
      const userId = useStore.getState().user?.id;
      if (!userId) {
        set({ isApiKeyLoading: false });
        return;
      }

      const { getApiKey } = require('../services/apiEncryption');
      const key = await getApiKey(userId);
      set({ apiKey: key, isApiKeyLoading: false });
    } catch (e) {
      console.error('Failed to load API key', e);
      set({ isApiKeyLoading: false });
    }
  },

  // ── Onboarding state ──────────────────────────────────────
  hasOnboarded: false,
  isProfileLoading: true,
  profile: null,
  height: '',
  weight: '',
  targetWeight: '',

  setProfile: (profile) => set({ profile }),

  setHasOnboarded: async (value) => {
    set({ hasOnboarded: value });
    await AsyncStorage.setItem('hasOnboarded', value ? '1' : '0');
  },

  /**
   * calculateAndSetGoal(weight, targetWeight)
   * Computes goalCalories = weight * 22, minus 350 if losing weight.
   */
  calculateAndSetGoal: async (weight, targetWeight) => {
    const w = parseFloat(weight) || 0;
    const tw = parseFloat(targetWeight) || 0;
    if (w <= 0) return;

    let goal = w * 22;
    if (tw < w) {
      goal -= 350; // Diet deficit
    }
    
    await useStore.getState().setGoalCalories(Math.round(goal));
  },

  setBodyMetrics: async ({ height, weight, targetWeight }) => {
    const profile = { height, weight, targetWeight };
    set({ height, weight, targetWeight, profile });
    await AsyncStorage.setItem('bodyMetrics', JSON.stringify(profile));
    await useStore.getState().calculateAndSetGoal(weight, targetWeight);
  },

  loadOnboardingState: async () => {
    try {
      set({ isProfileLoading: true });
      const onboarded = await AsyncStorage.getItem('hasOnboarded');
      const metricsRaw = await AsyncStorage.getItem('bodyMetrics');
      const metrics = metricsRaw ? JSON.parse(metricsRaw) : {};
      set({
        hasOnboarded: onboarded === '1',
        height: metrics.height || '',
        weight: metrics.weight || '',
        targetWeight: metrics.targetWeight || '',
        profile: metrics.height ? metrics : null,
        isProfileLoading: false,
      });
    } catch (e) {
      console.error('Failed to load onboarding state', e);
      set({ isProfileLoading: false });
    }
  },

  fetchProfile: async () => {
    const userId = useStore.getState().user?.id;
    if (!userId) return;

    try {
      set({ isProfileLoading: true });
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; 

      if (data) {
        const profile = {
          height: String(data.height || ''),
          weight: String(data.weight || ''),
          targetWeight: String(data.target_weight || ''),
        };
        set({
          hasOnboarded: true,
          height: profile.height,
          weight: profile.weight,
          targetWeight: profile.targetWeight,
          profile,
        });
        await AsyncStorage.setItem('hasOnboarded', '1');
        await AsyncStorage.setItem('bodyMetrics', JSON.stringify(profile));
        await useStore.getState().calculateAndSetGoal(profile.weight, profile.targetWeight);
      } else {
        set({ hasOnboarded: false });
        await AsyncStorage.setItem('hasOnboarded', '0');
      }
    } catch (err) {
      console.error('Store fetchProfile failed:', err);
    } finally {
      set({ isProfileLoading: false });
    }
  },
  entries: [],
  goalCalories: 1800,
  totalCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFat: 0,
  selectedDate: new Date().toISOString().split('T')[0],
  weeklyData: [],
  weeklyTotalCalories: 0,
  avgCaloriesPerDay: 0,
  daysTracked: 0,
  trendMessage: "",
  trendStatus: "neutral",
  streak: 0,
  statsToday: {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0
  },

  /**
   * setSelectedDate(date)
   * Updates the global selected date and triggers a refresh.
   */
  setSelectedDate: async (date) => {
    set({ selectedDate: date });
    await useStore.getState().fetchEntries();
    // We don't refresh weekly data here because Dashboard stays on 'today'
  },

  /**
   * fetchWeeklyData(userId, referenceDate)
   * Aggregates total calories for the 7 days ending at referenceDate.
   */
  fetchWeeklyData: async (passedUserId, passedReferenceDate) => {
    const userId = passedUserId || useStore.getState().user?.id;
    // For Dashboard, we almost always want this focused on current date
    const referenceDate = passedReferenceDate || dayjs().format('YYYY-MM-DD');

    if (!userId) return;

    set({ isWeeklyLoading: true, weeklyError: null });

    try {
      const endDate = dayjs(referenceDate);
      const startDate = endDate.subtract(6, 'day').format('YYYY-MM-DD');
      const endDateStr = endDate.format('YYYY-MM-DD');

      const { data, error } = await supabase
        .from('entries')
        .select('entry_date, total_calories')
        .gte('entry_date', startDate)
        .lte('entry_date', endDateStr)
        .eq('is_deleted', false)
        .eq('user_id', userId);

      if (error) throw error;

      // Grouping and Normalization
      const grouped = (data || []).reduce((acc, curr) => {
        const dateKey = dayjs(curr.entry_date).format('YYYY-MM-DD');
        acc[dateKey] = (acc[dateKey] || 0) + (parseFloat(curr.total_calories) || 0);
        return acc;
      }, {});

      const last7Days = [];
      let weeklyTotalCalories = 0;
      let daysTracked = 0;

      const baseDate = dayjs(startDate);
      for (let i = 0; i < 7; i++) {
        const d = baseDate.add(i, 'day');
        const dateStr = d.format('YYYY-MM-DD');
        const cals = Math.max(grouped[dateStr] || 0, 0); 
        
        last7Days.push({
          date: dateStr,
          day: d.format('ddd'), 
          calories: Math.round(cals)
        });

        weeklyTotalCalories += cals;
        if (cals > 0) daysTracked++;
      }

      // Trend Calculation
      const last3Avg = (last7Days[4].calories + last7Days[5].calories + last7Days[6].calories) / 3;
      const prev3Avg = (last7Days[1].calories + last7Days[2].calories + last7Days[3].calories) / 3;
      
      let trendMessage = "Your intake is stable";
      let trendStatus = "neutral";
      if (last3Avg < prev3Avg - 50) {
        trendMessage = "You are improving 🔥";
        trendStatus = "improving";
      } else if (last3Avg > prev3Avg + 50) {
        trendMessage = "Watch your intake";
        trendStatus = "warning";
      }

      let streak = 0;
      for (let i = 6; i >= 0; i--) {
        if (last7Days[i].calories > 0) streak++;
        else if (i !== 6) break;
      }

      set({ 
        weeklyData: last7Days,
        weeklyTotalCalories,
        avgCaloriesPerDay: Math.round(weeklyTotalCalories / 7),
        daysTracked,
        trendMessage,
        trendStatus,
        streak,
        isWeeklyLoading: false
      });
    } catch (err) {
      console.error('Weekly fetch failed:', err);
      set({ weeklyError: err.message, isWeeklyLoading: false });
    }
  },

  /**
   * fetchTodayStats()
   * Specifically fetches data for 'today' regardless of selectedDate.
   */
  fetchTodayStats: async () => {
    const userId = useStore.getState().user?.id;
    if (!userId) return;

    const today = dayjs().format('YYYY-MM-DD');
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('items')
        .eq('entry_date', today)
        .eq('is_deleted', false)
        .eq('user_id', userId);

      if (error) throw error;

      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      data?.forEach(entry => {
        entry.items?.forEach(item => {
          totals.calories += (parseFloat(item.calories) || 0);
          totals.protein += (parseFloat(item.protein) || 0);
          totals.carbs += (parseFloat(item.carbs) || 0);
          totals.fat += (parseFloat(item.fat) || 0);
        });
      });

      // Cap at 2 decimal places to avoid float precision issues
      const roundedTotals = {
        calories: Math.round(totals.calories),
        protein: Number(totals.protein.toFixed(2)),
        carbs: Number(totals.carbs.toFixed(2)),
        fat: Number(totals.fat.toFixed(2)),
      };

      set({ statsToday: roundedTotals });
    } catch (err) {
      console.error('Today stats fetch failed:', err);
    }
  },

  /**
   * addEntry(entry)
   * Adds a new entry and recalculates all totals from the full list.
   */
  addEntry: (entry) => {
    set((state) => {
      const newEntries = [entry, ...state.entries];
      const totals = calculateAllTotals(newEntries);
      return {
        entries: newEntries,
        ...totals
      };
    });
  },

  /**
   * removeEntry(id)
   * Removes an entry and recalculates all totals from the full list.
   */
  removeEntry: (id) => {
    set((state) => {
      const newEntries = state.entries.filter((e) => e.id !== id);
      const totals = calculateAllTotals(newEntries);
      return {
        entries: newEntries,
        ...totals
      };
    });
  },

  /**
   * setEntries(entries)
   * Replaces the entire list and recalculates totals.
   */
  setEntries: (newEntries) => {
    const totals = calculateAllTotals(newEntries);
    set({
      entries: newEntries,
      ...totals
    });
  },

  /**
   * fetchEntries()
   * Retrieves active entries for the store's selectedDate from Supabase.
   */
  fetchEntries: async () => {
    try {
      const dateToFetch = useStore.getState().selectedDate;
      const userId = useStore.getState().user?.id;
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('entry_date', dateToFetch)
        .eq('is_deleted', false)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formatted = data.map((d) => ({
          id: d.id.toString(),
          text: d.text,
          items: d.items,
          time: new Date(d.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          type: d.total_calories < 0 ? 'activity' : 'food',
        }));

        const totals = calculateAllTotals(formatted);
        set({ entries: formatted, ...totals });
      }
    } catch (err) {
      console.error('Store fetch failed:', err);
      throw err;
    }
  },

  /**
   * setGoalCalories(goal)
   * Updates the daily goal and persists to AsyncStorage.
   */
  setGoalCalories: async (goal) => {
    try {
      set({ goalCalories: goal });
      await AsyncStorage.setItem('goalCalories', goal.toString());
    } catch (e) {
      console.error('Failed to save goalCalories', e);
    }
  },

  /**
   * loadGoalCalories()
   * Loads the persisted goal on app start.
   */
  loadGoalCalories: async () => {
    try {
      const stored = await AsyncStorage.getItem('goalCalories');
      if (stored) {
        set({ goalCalories: Number(stored) });
      }
    } catch (e) {
      console.error('Failed to load goalCalories', e);
    }
  },
}));

/**
 * calculateAllTotals(entries)
 * Helper to sum all macros from all items in all entries.
 */
function calculateAllTotals(entries) {
  const totals = entries.reduce(
    (acc, entry) => {
      entry.items?.forEach((item) => {
        acc.totalCalories += (Number(item.calories) || 0);
        acc.totalProtein  += (Number(item.protein)  || 0);
        acc.totalCarbs    += (Number(item.carbs)    || 0);
        acc.totalFat      += (Number(item.fat)      || 0);
      });
      return acc;
    },
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );

  return {
    totalCalories: Math.round(totals.totalCalories),
    totalProtein: Number(totals.totalProtein.toFixed(2)),
    totalCarbs: Number(totals.totalCarbs.toFixed(2)),
    totalFat: Number(totals.totalFat.toFixed(2)),
  };
}

export default useStore;
