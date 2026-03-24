import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  rose: '#FB7185',
  roseDim: '#2D1520',
  google: '#4285F4',
  googleDim: '#0F1E3A',
  text: '#F1F5F9',
  textMuted: '#64748B',
  textSubtle: '#94A3B8',
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const kgToLbs = (kg: number) => +(kg * 2.20462).toFixed(1);
const lbsToKg = (lbs: number) => +(lbs / 2.20462).toFixed(1);

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Divider() {
  return <View style={styles.divider} />;
}

/** Avatar with initials */
function AvatarSection({ name, email }: { name: string; email: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.avatarSection}>
      <View style={styles.avatarRing}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitials}>{initials}</Text>
        </View>
      </View>
      <Text style={styles.profileName}>{name}</Text>
      <Text style={styles.profileEmail}>{email}</Text>
      <View style={styles.memberBadge}>
        <Text style={styles.memberBadgeText}>✦ Pro Member</Text>
      </View>
    </View>
  );
}

/** Editable weight row */
function WeightRow({
  label,
  value,
  onChange,
  unit,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  accent: string;
}) {
  return (
    <View style={styles.weightRow}>
      <View style={styles.weightLeft}>
        <Text style={styles.weightLabel}>{label}</Text>
        <Text style={[styles.weightUnit, { color: accent }]}>{unit}</Text>
      </View>
      <View style={[styles.weightInputWrap, { borderColor: accent + '50' }]}>
        <TextInput
          style={[styles.weightInput, { color: accent }]}
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
          maxLength={6}
        />
      </View>
    </View>
  );
}

/** Unit toggle — kg / lbs */
function UnitToggle({
  isKg,
  onToggle,
}: {
  isKg: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.unitToggleRow}>
      <Text style={styles.settingLabel}>Unit system</Text>
      <View style={styles.unitToggleRight}>
        <Text style={[styles.unitLabel, !isKg && styles.unitLabelActive]}>lbs</Text>
        <Switch
          value={isKg}
          onValueChange={onToggle}
          trackColor={{ false: C.surfaceElevated, true: C.accentDim }}
          thumbColor={isKg ? C.accent : C.textMuted}
          ios_backgroundColor={C.surfaceElevated}
        />
        <Text style={[styles.unitLabel, isKg && styles.unitLabelActive]}>kg</Text>
      </View>
    </View>
  );
}

/** Generic settings row */
function SettingRow({
  icon,
  label,
  value,
  onPress,
  accent,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  accent?: string;
}) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.settingIconWrap, { backgroundColor: C.surfaceElevated }]}>
        <Text style={styles.settingIcon}>{icon}</Text>
      </View>
      <Text style={[styles.settingLabel, { flex: 1 }]}>{label}</Text>
      {value ? (
        <Text style={[styles.settingValue, accent && { color: accent }]}>{value}</Text>
      ) : (
        <Text style={styles.settingChevron}>›</Text>
      )}
    </TouchableOpacity>
  );
}

/** Google Fit connection button */
function GoogleFitButton({ connected }: { connected: boolean }) {
  return (
    <TouchableOpacity
      style={[
        styles.googleFitBtn,
        connected && styles.googleFitBtnConnected,
      ]}
      activeOpacity={0.8}
      onPress={() =>
        Alert.alert(
          connected ? 'Disconnect Google Fit?' : 'Connect Google Fit',
          connected
            ? 'This will remove access to your fitness data.'
            : 'Google Fit integration coming soon. Stay tuned!',
          [{ text: 'OK' }]
        )
      }
    >
      {/* Google "G" logo placeholder */}
      <View style={styles.googleLogoWrap}>
        <Text style={styles.googleLogoText}>G</Text>
      </View>
      <View style={styles.googleFitTextWrap}>
        <Text style={styles.googleFitTitle}>
          {connected ? 'Google Fit Connected' : 'Connect Google Fit'}
        </Text>
        <Text style={styles.googleFitSub}>
          {connected
            ? 'Steps & workouts syncing'
            : 'Sync steps, workouts & heart rate'}
        </Text>
      </View>
      <View
        style={[
          styles.googleFitStatusDot,
          { backgroundColor: connected ? C.accent : C.textMuted },
        ]}
      />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────
export default function ProfileScreen() {
  const [isKg, setIsKg] = useState(true);
  const [currentWeight, setCurrentWeight] = useState('76.5');
  const [targetWeight, setTargetWeight] = useState('70.0');
  const [googleFitConnected] = useState(false);

  // Convert display values when unit switches
  const handleUnitToggle = (val: boolean) => {
    if (val) {
      // switching to kg
      setCurrentWeight(String(lbsToKg(parseFloat(currentWeight) || 0)));
      setTargetWeight(String(lbsToKg(parseFloat(targetWeight) || 0)));
    } else {
      // switching to lbs
      setCurrentWeight(String(kgToLbs(parseFloat(currentWeight) || 0)));
      setTargetWeight(String(kgToLbs(parseFloat(targetWeight) || 0)));
    }
    setIsKg(val);
  };

  const unit = isKg ? 'kg' : 'lbs';
  const diff = (parseFloat(targetWeight) || 0) - (parseFloat(currentWeight) || 0);
  const diffLabel = diff === 0
    ? 'At goal weight 🎯'
    : diff < 0
      ? `${Math.abs(diff).toFixed(1)} ${unit} to lose`
      : `${Math.abs(diff).toFixed(1)} ${unit} to gain`;
  const diffColor = diff === 0 ? C.accent : diff < 0 ? C.amber : C.indigo;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <AvatarSection name="Alex Johnson" email="alex@example.com" />

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          {[
            { label: 'Streak', value: '6d', color: C.amber },
            { label: 'Entries', value: '142', color: C.accent },
            { label: 'Goal', value: '-8%', color: C.indigo },
          ].map(s => (
            <View key={s.label} style={styles.statCell}>
              <Text style={[styles.statCellNum, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statCellLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Weight ── */}
        <SectionLabel label="WEIGHT" />
        <View style={styles.card}>
          <UnitToggle isKg={isKg} onToggle={handleUnitToggle} />
          <Divider />
          <WeightRow
            label="Current weight"
            value={currentWeight}
            onChange={setCurrentWeight}
            unit={unit}
            accent={C.textSubtle}
          />
          <Divider />
          <WeightRow
            label="Target weight"
            value={targetWeight}
            onChange={setTargetWeight}
            unit={unit}
            accent={C.accent}
          />
          <Divider />
          {/* Progress toward goal */}
          <View style={styles.diffRow}>
            <Text style={styles.settingLabel}>Progress to goal</Text>
            <Text style={[styles.diffLabel, { color: diffColor }]}>{diffLabel}</Text>
          </View>
        </View>

        {/* ── Integrations ── */}
        <SectionLabel label="INTEGRATIONS" />
        <View style={styles.card}>
          <GoogleFitButton connected={googleFitConnected} />
        </View>

        {/* ── Goals ── */}
        <SectionLabel label="GOALS" />
        <View style={styles.card}>
          <SettingRow icon="🎯" label="Daily calorie goal" value="2,000 kcal" />
          <Divider />
          <SettingRow icon="🥩" label="Protein target" value="120 g" />
          <Divider />
          <SettingRow icon="👟" label="Daily steps goal" value="10,000" />
          <Divider />
          <SettingRow icon="🔥" label="Activity level" value="Moderate" />
        </View>

        {/* ── Preferences ── */}
        <SectionLabel label="PREFERENCES" />
        <View style={styles.card}>
          <SettingRow icon="🌙" label="Dark mode" value="Always on" />
          <Divider />
          <SettingRow icon="🔔" label="Reminders" value="On" />
          <Divider />
          <SettingRow icon="🌏" label="Language" value="English" />
        </View>

        {/* ── Account ── */}
        <SectionLabel label="ACCOUNT" />
        <View style={styles.card}>
          <SettingRow
            icon="📤"
            label="Export data"
            onPress={() => Alert.alert('Export', 'CSV export coming soon.')}
          />
          <Divider />
          <SettingRow
            icon="🔒"
            label="Privacy & data"
            onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon.')}
          />
          <Divider />
          <SettingRow
            icon="🚪"
            label="Sign out"
            accent={C.rose}
            onPress={() => Alert.alert('Sign out', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Sign out', style: 'destructive' }])}
          />
        </View>

        <Text style={styles.versionText}>Kcalyx v1.0.0 · Made with ❤️</Text>
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

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: C.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '800',
    color: C.accent,
    letterSpacing: -0.5,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: C.text,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 4,
    marginBottom: 10,
  },
  memberBadge: {
    backgroundColor: C.indigoDim,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: C.indigo + '50',
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.indigo,
    letterSpacing: 0.4,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
    overflow: 'hidden',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statCellNum: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statCellLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 3,
    fontWeight: '500',
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

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginHorizontal: 16,
  },

  // Unit toggle
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  unitToggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitLabel: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '600',
    width: 24,
    textAlign: 'center',
  },
  unitLabelActive: {
    color: C.accent,
  },

  // Weight row
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  weightLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weightLabel: {
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  weightUnit: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weightInputWrap: {
    backgroundColor: C.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 80,
    alignItems: 'flex-end',
  },
  weightInput: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'right',
    letterSpacing: -0.3,
    padding: 0,
    margin: 0,
  },

  // Diff row
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  diffLabel: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIcon: {
    fontSize: 17,
  },
  settingLabel: {
    fontSize: 15,
    color: C.text,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: C.textMuted,
    fontWeight: '500',
  },
  settingChevron: {
    fontSize: 20,
    color: C.textMuted,
    lineHeight: 24,
  },

  // Google Fit
  googleFitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
    backgroundColor: C.googleDim,
  },
  googleFitBtnConnected: {
    backgroundColor: C.accentDim,
  },
  googleLogoWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.google,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLogoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  googleFitTextWrap: {
    flex: 1,
  },
  googleFitTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginBottom: 2,
  },
  googleFitSub: {
    fontSize: 12,
    color: C.textMuted,
  },
  googleFitStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: C.textMuted,
    marginTop: 16,
    marginBottom: 8,
  },
});
