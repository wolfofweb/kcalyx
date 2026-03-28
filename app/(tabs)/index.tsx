import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseFoodWithAI } from "../../services/aiService";
import { supabase } from "../../services/supabase";
import useStore from "../../store/useStore";
import { IconSymbol } from "@/components/ui/icon-symbol";
import CustomAlert from "@/components/CustomAlert";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
interface Entry {
  id: string;
  text: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  time: string;
  type: "food" | "activity";
}

// ──────────────────────────────────────────────
// Theme tokens
// ──────────────────────────────────────────────
const COLORS = {
  bg: "#0A0B0D",
  surface: "#13151A",
  surfaceElevated: "#1C1F27",
  border: "#242830",
  accent: "#6EE7B7", // mint green
  accentDim: "#1A3B30",
  accentSecondary: "#818CF8", // soft indigo
  text: "#F1F5F9",
  textMuted: "#64748B",
  textSubtle: "#94A3B8",
  danger: "#F87171",
  dangerDim: "#2D1515",
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
function getTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Naive calorie & protein estimator – replace with real AI call later */
function parseCalories(text: string): {
  calories: number;
  protein: number;
  type: "food" | "activity";
} {
  const lower = text.toLowerCase();
  const isActivity =
    lower.includes("run") ||
    lower.includes("walk") ||
    lower.includes("gym") ||
    lower.includes("workout") ||
    lower.includes("cycle") ||
    lower.includes("swim") ||
    lower.includes("yoga") ||
    lower.includes("exercise");

  // Very rough heuristic until real NLP is wired
  const match = lower.match(/(\d+)\s?(cal|kcal|calories)/);
  let calories = 0;
  if (match) {
    calories = parseInt(match[1], 10) * (isActivity ? -1 : 1);
  }

  const proteinMatch = lower.match(/(\d+)\s?g\s?protein/);
  let protein = proteinMatch ? parseInt(proteinMatch[1], 10) : 0;

  if (isActivity) {
    if (calories === 0) {
      if (lower.includes("30")) calories = -250;
      else if (lower.includes("60") || lower.includes("1 hour"))
        calories = -450;
      else calories = -200;
    }
    return { calories, protein: 0, type: "activity" };
  }

  // Food heuristics if no calorie match was found
  if (calories === 0) {
    if (
      lower.includes("apple") ||
      lower.includes("banana") ||
      lower.includes("orange")
    )
      calories = 90;
    else if (lower.includes("coffee") || lower.includes("tea")) calories = 15;
    else if (lower.includes("pizza")) calories = 280;
    else if (lower.includes("burger")) calories = 500;
    else if (lower.includes("salad")) calories = 150;
    else if (lower.includes("rice")) calories = 200;
    else if (lower.includes("chicken")) calories = 250;
    else if (lower.includes("egg")) calories = 78;
    else if (lower.includes("smoothie") || lower.includes("juice"))
      calories = 160;
    else if (lower.includes("bread") || lower.includes("toast")) calories = 120;
    else if (lower.includes("milk") || lower.includes("latte")) calories = 130;
    else if (lower.includes("protein shake")) calories = 210;
    else calories = 180;
  }

  // Protein heuristics if no protein match found
  if (protein === 0) {
    if (lower.includes("chicken")) protein = 31;
    else if (lower.includes("egg")) protein = 6;
    else if (lower.includes("steak") || lower.includes("beef")) protein = 25;
    else if (lower.includes("fish") || lower.includes("salmon")) protein = 22;
    else if (lower.includes("protein shake")) protein = 25;
    else if (lower.includes("milk") || lower.includes("yogurt")) protein = 8;
    else if (lower.includes("bean") || lower.includes("lentil")) protein = 9;
    else if (lower.includes("rice") || lower.includes("bread")) protein = 4;
    else if (lower.includes("pizza") || lower.includes("burger")) protein = 12;
  }

  return { calories, protein, type: "food" };
}

/** Formats food quantity for display (e.g. 0.15kg -> 150g, 1 piece -> 1 pc) */
function formatQuantity(quantity: number, unit: string): string {
  let u = unit.toLowerCase().trim();

  // 1. Weight conversion: kg < 1 -> g
  if ((u === "kg" || u === "kilogram" || u === "kilograms") && quantity < 1) {
    return `${Math.round(quantity * 1000)} g`;
  }

  // 2. Map piece-like units to pc/pcs
  if (u === "pc" || u === "pcs" || u === "piece" || u === "pieces") {
    u = quantity === 1 ? "pc" : "pcs";
  }
  // 3. Handle other units (cup -> cups, serving -> servings, etc.)
  else {
    const isWeightVolume = ["g", "ml", "oz", "kcal", "cal"].includes(u);
    if (!isWeightVolume) {
      if (quantity === 1 && u.endsWith("s") && u !== "glass") {
        u = u.slice(0, -1); // cups -> cup
      } else if (quantity > 1 && !u.endsWith("s")) {
        u = u + "s"; // cup -> cups
      }
    }
  }

  return `${quantity} ${u}`;
}

/** Formats a string to be title-case for the first word only: trim -> lower -> capitalize */
function formatItemName(str: string): string {
  if (!str) return "";
  const cleaned = str.trim().toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

function CalorieMeter({
  total,
  goal = 2000,
  protein = 0,
  carbs = 0,
  fat = 0,
}: {
  total: number;
  goal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}) {
  const effectiveGoal = goal || 2000;
  const isOver = total > effectiveGoal;
  const pct = Math.min(Math.max(total / effectiveGoal, 0), 1);
  const diff = Math.abs(effectiveGoal - total);

  // Macro goals (example balanced split: 30/40/30)
  const PROTEIN_GOAL = Math.round((effectiveGoal * 0.30) / 4);
  const CARBS_GOAL = Math.round((effectiveGoal * 0.40) / 4);
  const FAT_GOAL = Math.round((effectiveGoal * 0.30) / 9);

  const proteinPct = Math.min(protein / PROTEIN_GOAL, 1);
  const carbsPct = Math.min(carbs / CARBS_GOAL, 1);
  const fatPct = Math.min(fat / FAT_GOAL, 1);

  return (
    <View style={styles.meterCard}>
      {/* Multi-layered glow for Android/Web consistency */}
      <View style={styles.meterGlowOuter}>
        <View style={styles.meterGlowInner}>
          <View style={styles.meterRingOuter}>
            <View style={styles.meterRingInner}>
              <Text style={styles.meterCalNumber}>{total.toLocaleString()}</Text>
              <Text style={styles.meterCalLabel}>kcal today</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${pct * 100}%` as any,
              backgroundColor: isOver ? COLORS.danger : COLORS.accent,
            },
          ]}
        />
      </View>

      <View style={styles.meterFooter}>
        <Text style={styles.meterGoalText}>
          Goal: {effectiveGoal.toLocaleString()} kcal
        </Text>
        <Text
          style={[
            styles.meterRemaining,
            { color: isOver ? COLORS.danger : COLORS.accent },
          ]}
        >
          {isOver
            ? `${diff.toLocaleString()} over`
            : `${diff.toLocaleString()} left`}
        </Text>
      </View>

      {/* Macro summary row */}
      <View style={styles.meterMacroRow}>
        <View style={styles.meterMacroItem}>
          <Text style={styles.meterMacroLabel}>Protein</Text>
          <Text style={styles.meterMacroValue}>{protein}g</Text>
        </View>
        <View style={styles.meterMacroDivider} />
        <View style={styles.meterMacroItem}>
          <Text style={styles.meterMacroLabel}>Carbs</Text>
          <Text style={styles.meterMacroValue}>{carbs}g</Text>
        </View>
        <View style={styles.meterMacroDivider} />
        <View style={styles.meterMacroItem}>
          <Text style={styles.meterMacroLabel}>Fat</Text>
          <Text style={styles.meterMacroValue}>{fat}g</Text>
        </View>
      </View>
    </View>
  );
}

function EntryRow({
  item,
  onDelete,
  onEdit,
}: {
  item: Entry;
  onDelete: (id: string) => void;
  onEdit: (entry: Entry) => void;
}) {
  const isActivity = item.type === "activity";
  const accentColor = isActivity ? COLORS.accent : COLORS.accentSecondary;
  const totalCals = item.items?.reduce((sum, i) => sum + i.calories, 0) ?? 0;

  return (
    <View style={styles.entryCard}>
      {/* ── Title row: raw user input ── */}
      <View style={styles.entryHeader}>
        <View
          style={[
            styles.entryIcon,
            { backgroundColor: isActivity ? COLORS.accentDim : "#1A1F35" },
          ]}
        >
          <Text style={{ fontSize: 16 }}>{isActivity ? "🏃" : "🍽️"}</Text>
        </View>
        <View style={styles.entryInfo}>
          {/* Original typed text as the title */}
          <Text style={styles.entryRawTitle} numberOfLines={2}>
            "{item.text}"
          </Text>
          <Text style={styles.entryTime}>{item.time}</Text>
        </View>
        <View style={styles.entryMeta}>
          <Text style={[styles.entryTotalCals, { color: accentColor }]}>
            {totalCals}
          </Text>
          <Text style={styles.entryTotalLabel}>kcal</Text>
        </View>
        <View style={styles.entryActions}>
          <TouchableOpacity
            onPress={() => {
              console.log('Edit pressed for:', item.id);
              onEdit(item);
            }}
            style={styles.actionBtn}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 10 }}
          >
            <IconSymbol name="pencil" size={16} color={COLORS.textSubtle} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              console.log('Delete pressed for:', item.id);
              onDelete(item.id);
            }}
            style={styles.actionBtn}
            hitSlop={{ top: 20, bottom: 20, left: 10, right: 20 }}
          >
            <Text style={styles.deleteBtnText}>×</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Divider with parsed indicator ── */}
      {item.items && item.items.length > 0 && (
        <View style={styles.parsedDivider}>
          <View style={styles.parsedDividerLine} />
          <Text style={styles.parsedDividerLabel}>Detected items</Text>
          <View style={styles.parsedDividerLine} />
        </View>
      )}

      {/* ── AI-parsed item sub-rows ── */}
      {item.items && item.items.length > 0 && (
        <View style={styles.itemList}>
          {item.items.map((foodItem, idx) => (
            <View key={idx} style={styles.itemRowWrapper}>
              <View style={styles.itemMainLine}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {formatItemName(foodItem.name)}
                  <Text style={styles.itemQty}>
                    {" "}
                    ({formatQuantity(foodItem.quantity, foodItem.unit)})
                  </Text>
                </Text>
                <Text style={[styles.itemCalories, { color: accentColor }]}>
                  {foodItem.calories} kcal
                </Text>
              </View>
              {(foodItem.protein > 0 ||
                foodItem.carbs > 0 ||
                foodItem.fat > 0) && (
                <View style={styles.macroRow}>
                  <View style={styles.macroChip}>
                    <Text style={styles.macroChipLabel}>P</Text>
                    <Text style={styles.macroChipValue}>
                      {foodItem.protein}g
                    </Text>
                  </View>
                  <View style={styles.macroChip}>
                    <Text style={styles.macroChipLabel}>C</Text>
                    <Text style={styles.macroChipValue}>{foodItem.carbs}g</Text>
                  </View>
                  <View style={styles.macroChip}>
                    <Text style={styles.macroChipLabel}>F</Text>
                    <Text style={styles.macroChipValue}>{foodItem.fat}g</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────
// Main screen
// ──────────────────────────────────────────────
export default function HomeScreen() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const entries = useStore((s) => s.entries) as Entry[];
  const totalCalories = useStore((s) => s.totalCalories);
  const totalProtein = useStore((s) => s.totalProtein);
  const totalCarbs = useStore((s) => s.totalCarbs);
  const updateEntry = useStore((s: any) => s.updateEntry);
  const fetchEntries = useStore((s: any) => s.fetchEntries);
  const loadGoalCalories = useStore((s: any) => s.loadGoalCalories);
  const goalCalories = useStore((s: any) => s.goalCalories);
  const removeEntry = useStore((s) => s.removeEntry);
  const user = useStore((s: any) => s.user);
  const totalFat = useStore((s) => s.totalFat);
  const selectedDate = useStore((s: any) => s.selectedDate);
  const setSelectedDate = useStore((s: any) => s.setSelectedDate);
  const addEntry = useStore((s) => s.addEntry);
  const deleteEntry = useStore((s) => s.removeEntry); // Alias just in case it's used elsewhere as deleteEntry

  // ── Edit State ──────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [editText, setEditText] = useState("");
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    confirmColor?: string;
    onConfirm: () => void;
    onCancel?: () => void;
  }>({ visible: false, title: "", message: "", onConfirm: () => {} });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchEntries();
    loadGoalCalories();
  }, [selectedDate]);

  // ── Date Navigation ───────────────────────────────────────
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const getDateLabel = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate === todayStr) return "Today";

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (selectedDate === yesterdayStr) return "Yesterday";

    // Format like "Mar 24"
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const onRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchEntries();
    } catch (err) {
      console.error("Manual refresh failed:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAdd = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. AI Parsing
      const foodItems = await parseFoodWithAI(trimmed);
      if (foodItems.length === 0) throw new Error("Could not analyze, try again");

      // 2. Calculate Totals for DB
      const total_calories = foodItems.reduce((s, i) => s + i.calories, 0);
      const total_protein  = foodItems.reduce((s, i) => s + i.protein, 0);
      const total_carbs    = foodItems.reduce((s, i) => s + i.carbs, 0);
      const total_fat      = foodItems.reduce((s, i) => s + i.fat, 0);

      // 3. Determine type (heuristic for icon etc)
      const { type } = parseCalories(trimmed);

      // 4. Insert into Supabase
      const { error: dbError } = await supabase.from('entries').insert({
        entry_date: selectedDate,
        user_id: user?.id ?? 'unknown',
        text: trimmed,
        items: foodItems,
        total_calories,
        total_protein,
        total_carbs,
        total_fat
      });

      if (dbError) throw new Error("Sync failed, please try again");

      // 5. Success -> Update local store & clear input
      const newEntry: Entry = {
        id: Date.now().toString(), // Note: Supabase ID is better, but this works for local UI update
        text: trimmed,
        items: foodItems,
        time: getTime(),
        type,
      };
      
      // Better to fetch entries from Supabase to get real ID and updated list
      await fetchEntries();
      setInputText("");
    } catch (err: any) {
      console.error("Add failed:", err);
      setError(err.message || "Could not analyze, try again");
      // Auto-clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRequest = (id: string) => {
    setDeletingId(id);
    setAlertConfig({
      visible: true,
      title: "Delete Entry",
      message: "Are you sure you want to delete this entry? This action cannot be undone.",
      confirmText: "Delete",
      confirmColor: COLORS.danger,
      onConfirm: () => handleConfirmDelete(id),
      onCancel: () => setAlertConfig(prev => ({ ...prev, visible: false })),
    });
  };

  const handleConfirmDelete = async (id: string) => {
    setIsDeleteLoading(true);
    try {
      const { error: dbError } = await supabase
        .from('entries')
        .update({ is_deleted: true })
        .eq('id', id);

      if (dbError) throw dbError;

      await fetchEntries();
      setAlertConfig(prev => ({ ...prev, visible: false }));
    } catch (err) {
      console.error("Delete failed:", err);
      setAlertConfig({
        visible: true,
        title: "Error",
        message: "Failed to delete entry. Please try again.",
        onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setIsDeleteLoading(false);
      setDeletingId(null);
    }
  };

  const handleEditPress = (entry: Entry) => {
    setSelectedEntry(entry);
    setEditText(entry.text);
    setIsEditOpen(true);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedEntry || !editText.trim() || isEditLoading) return;

    setIsEditLoading(true);
    setEditError(null);

    try {
      // 1. AI Parsing (re-parse the edited text)
      const foodItems = await parseFoodWithAI(editText.trim());
      if (foodItems.length === 0) throw new Error("Could not analyze, try again");

      // 2. Calculate Totals
      const total_calories = foodItems.reduce((s, i) => s + i.calories, 0);
      const total_protein  = foodItems.reduce((s, i) => s + i.protein, 0);
      const total_carbs    = foodItems.reduce((s, i) => s + i.carbs, 0);
      const total_fat      = foodItems.reduce((s, i) => s + i.fat, 0);

      // 3. Update in Supabase
      const { error: dbError } = await supabase
        .from('entries')
        .update({
          text: editText.trim(),
          items: foodItems,
          total_calories,
          total_protein,
          total_carbs,
          total_fat
        })
        .eq('id', selectedEntry.id);

      if (dbError) throw new Error("Update failed, please try again");

      // 4. Update local state (Option A: Fetch Entries)
      await fetchEntries();
      
      setIsEditOpen(false);
      setSelectedEntry(null);
      setEditText("");
    } catch (err: any) {
      console.error("Edit failed:", err);
      setEditError(err.message || "Update failed, try again");
    } finally {
      setIsEditLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.accent}
              colors={[COLORS.accent]}
              progressBackgroundColor={COLORS.surfaceElevated}
            />
          }
          ListHeaderComponent={
            <>
              {/* ── Header ── */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.appName}>Kcalyx</Text>
                  
                  {/* Date Navigation Header */}
                  <View style={styles.dateNav}>
                    <TouchableOpacity onPress={handlePrevDay} style={styles.dateNavBtn}>
                      <IconSymbol name="chevron.left" size={20} color={COLORS.textMuted} />
                    </TouchableOpacity>
                    
                    <Text style={styles.dateLabel}>{getDateLabel()}</Text>
                    
                    <TouchableOpacity 
                      onPress={handleNextDay} 
                      style={[styles.dateNavBtn, isToday && styles.dateNavBtnDisabled]}
                      disabled={isToday}
                    >
                      <IconSymbol 
                        name="chevron.right" 
                        size={20} 
                        color={isToday ? COLORS.border : COLORS.textMuted} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.avatarBadge}>
                  <Text style={styles.avatarText}>K</Text>
                </View>
              </View>

              {/* ── Calorie meter ── */}
              <CalorieMeter
                total={Math.max(totalCalories, 0)}
                goal={goalCalories}
                protein={totalProtein}
                carbs={totalCarbs}
                fat={totalFat}
              />

              {/* ── Input area ── */}
              <View style={styles.inputCard}>
                <View style={styles.inputHeader}>
                  <Text style={styles.inputLabel}>Log food or activity</Text>
                  <Text style={styles.addingToLabel}>Adding to: {getDateLabel()}</Text>
                </View>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2 eggs and toast, 30 min run…"
                  placeholderTextColor={COLORS.textMuted}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit
                  onSubmitEditing={handleAdd}
                  editable={!isLoading}
                />
                
                {error && (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.addButton,
                    (!inputText.trim() || isLoading) &&
                      styles.addButtonDisabled,
                  ]}
                  onPress={handleAdd}
                  activeOpacity={0.8}
                  disabled={!inputText.trim() || isLoading}
                >
                  {isLoading ? (
                    <View style={styles.addButtonLoading}>
                      <ActivityIndicator size="small" color="#0A0B0D" />
                      <Text style={styles.addButtonText}>Analyzing…</Text>
                    </View>
                  ) : (
                    <Text style={styles.addButtonText}>+ Add Entry</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* ── Section header ── */}
              {entries.length > 0 && (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Today</Text>
                  <Text style={styles.sectionCount}>
                    {entries.length} entries
                  </Text>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => (
            <EntryRow 
              item={item} 
              onDelete={handleDeleteRequest} 
              onEdit={handleEditPress}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🥗</Text>
              <Text style={styles.emptyTitle}>Nothing logged yet</Text>
              <Text style={styles.emptySubtitle}>
                Add your first meal or workout above
              </Text>
            </View>
          }
        />

        {/* ── Edit Modal ── */}
        <Modal
          visible={isEditOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsEditOpen(false)}
        >
          <Pressable 
            style={styles.modalOverlay} 
            onPress={() => !isEditLoading && setIsEditOpen(false)}
          >
            <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Entry</Text>
                <TouchableOpacity 
                  onPress={() => setIsEditOpen(false)}
                  disabled={isEditLoading}
                >
                  <Text style={styles.modalClose}>×</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalInput}
                value={editText}
                onChangeText={setEditText}
                placeholder="Modify your entry..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                autoFocus
                editable={!isEditLoading}
              />

              {editError && (
                <Text style={styles.modalError}>{editError}</Text>
              )}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsEditOpen(false)}
                  disabled={isEditLoading}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSaveBtn,
                    (!editText.trim() || isEditLoading) && styles.modalBtnDisabled
                  ]}
                  onPress={handleSaveEdit}
                  disabled={!editText.trim() || isEditLoading}
                >
                  {isEditLoading ? (
                    <ActivityIndicator size="small" color="#0A0B0D" />
                  ) : (
                    <Text style={styles.modalSaveText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ── Custom Alert ── */}
        <CustomAlert
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          onConfirm={alertConfig.onConfirm}
          onCancel={alertConfig.onCancel}
          confirmText={alertConfig.confirmText}
          confirmColor={alertConfig.confirmColor}
          isLoading={isDeleteLoading && !!deletingId && alertConfig.title.toLowerCase().includes('delete')}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 24,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 12,
  },
  dateNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
    minWidth: 80,
    textAlign: "center",
  },
  dateNavBtnDisabled: {
    opacity: 0,
  },
  avatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentDim,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.accent,
  },

  // Entry Card Updates
  entryActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deleteBtnText: {
    fontSize: 20,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginTop: -2,
    fontWeight: "400",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  modalClose: {
    fontSize: 28,
    color: COLORS.textMuted,
    lineHeight: 28,
  },
  modalInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 16,
    padding: 16,
    color: COLORS.text,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  modalError: {
    color: COLORS.danger,
    fontSize: 13,
    marginBottom: 16,
    textAlign: "center",
  },
  modalSaveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    height: 54,
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtn: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 14,
    height: 54,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalBtnDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    color: "#0A0B0D",
    fontSize: 16,
    fontWeight: "700",
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: "600",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
  },
  modalDeleteMsg: {
    fontSize: 16,
    color: COLORS.textSubtle,
    lineHeight: 24,
    marginBottom: 24,
  },
  modalDeleteBtn: {
    backgroundColor: COLORS.danger,
    borderRadius: 14,
    height: 54,
    flex: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDeleteText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Calorie Meter
  meterCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 16,
  },
  meterGlowOuter: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(110, 231, 183, 0.03)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  meterGlowInner: {
    width: 178,
    height: 178,
    borderRadius: 89,
    backgroundColor: "rgba(110, 231, 183, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  meterRingOuter: {
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 3,
    borderColor: COLORS.accentDim,
    backgroundColor: COLORS.bg, // Important for shadow contrast
    alignItems: "center",
    justifyContent: "center",
    // Premium glow shadow for Web/iOS
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 4,
  },
  meterRingInner: {
    alignItems: "center",
  },
  meterCalNumber: {
    fontSize: 34,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: -1,
  },
  meterCalLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  meterFooter: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  meterGoalText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  meterRemaining: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Meter macro row
  meterMacroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: "100%",
  },
  meterMacroItem: {
    alignItems: "center",
    flex: 1,
  },
  meterMacroLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
    fontWeight: "600",
  },
  meterMacroValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.text,
  },
  meterMacroDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
    marginHorizontal: 12,
  },

  // Input card
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  inputHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  addingToLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: "italic",
    opacity: 0.8,
  },
  textInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  addButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  addButtonDisabled: {
    opacity: 0.35,
  },
  addButtonText: {
    color: "#0A0B0D",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  addButtonLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 13,
    color: COLORS.textMuted,
    backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // Entry card
  entryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  entryInfo: {
    flex: 1,
    marginRight: 8,
  },
  entryRawTitle: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginBottom: 3,
    lineHeight: 18,
  },
  entryMeta: {
    alignItems: "flex-end",
    marginRight: 10,
  },
  entryTotalCals: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  entryTotalLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  entryTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Parsed divider
  parsedDivider: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    gap: 8,
  },
  parsedDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  parsedDividerLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: "500",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Item sub-rows
  itemList: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
    gap: 4,
  },
  itemRowWrapper: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  itemMainLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginRight: 8,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: "400",
    color: COLORS.textMuted,
  },
  itemCalories: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
  },
  itemMacros: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  macroRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  macroChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
  },
  macroChipLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textMuted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  macroChipValue: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSubtle,
  },
  separator: {
    height: 8,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 48,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
  },
  errorContainer: {
    marginTop: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: "600",
  },
});
