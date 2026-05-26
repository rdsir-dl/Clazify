import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootNavigator';
import { DarkThemeColors, LightThemeColors } from '../../app/theme/theme';
import { useSettingsStore } from './useSettingsStore';
import { useTimetableStore } from '../timetable/useTimetableStore';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

export default function SettingsScreen({ navigation }: Props) {
  const settingsStore = useSettingsStore();
  const timetableStore = useTimetableStore();

  const [trainerName, setTrainerName] = useState<string>('');
  const [leadTimeNormal, setLeadTimeNormal] = useState<number>(10);
  const [leadTimeConsecutive, setLeadTimeConsecutive] = useState<number>(5);
  const [autoStopSeconds, setAutoStopSeconds] = useState<number>(30);
  const [backendUrl, setBackendUrl] = useState<string>('https://clazify.netlify.app');

  useEffect(() => {
    const load = async () => {
      await settingsStore.loadSettings();
      const s = settingsStore.settings;
      setTrainerName(s.trainerName);
      setLeadTimeNormal(s.leadTimeNormal);
      setLeadTimeConsecutive(s.leadTimeConsecutive);
      setAutoStopSeconds(s.autoStopSeconds);
      setBackendUrl(s.backendUrl || 'https://clazify.netlify.app');
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!trainerName.trim()) {
      Alert.alert('Validation Error', 'Trainer Name cannot be empty.');
      return;
    }

    try {
      await settingsStore.updateSettings({
        trainerName: trainerName.trim(),
        leadTimeNormal,
        leadTimeConsecutive,
        autoStopSeconds,
        backendUrl, // keep backend URL saved under the hood
      });

      Alert.alert('Settings Saved', 'Profile settings updated successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('Home') }
      ]);
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear Timetable Data',
      'Are you sure you want to clear your loaded timetable and cancel all scheduled alarms? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await timetableStore.clearTimetable();
            Alert.alert('Data Cleared', 'All timetable schedules and alarms have been reset.');
            navigation.navigate('Home');
          }
        }
      ]
    );
  };

  const insets = useSafeAreaInsets();
  const isDark = settingsStore.settings.themeMode !== 'light';
  const colors = isDark ? DarkThemeColors : LightThemeColors;
  const styles = createStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile & Configuration</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trainer Profile</Text>
          <Text style={styles.fieldLabel}>Trainer Name (Matches PDF search)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Harrison"
            placeholderTextColor={colors.textMuted}
            value={trainerName}
            onChangeText={setTrainerName}
          />
          <Text style={styles.tipText}>
            Tip: Keep it short (e.g. last name or unique identifier) to match PDF parser heuristics successfully.
          </Text>

          {/* PDF Timetable Import trigger inside Trainer Profile Card */}
          {settingsStore.settings.trainerName ? (
            <TouchableOpacity 
              style={styles.settingsImportButton}
              onPress={() => navigation.navigate('PDFImport')}
            >
              <Text style={styles.settingsImportButtonText}>📅 Import Timetable PDF</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Lead times card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alarm Preferences</Text>
          
          {/* Normal Lead Time */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Lead Time (Normal)</Text>
              <Text style={styles.settingDesc}>Alarm offset before isolated classes</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity 
                style={styles.stepBtn}
                onPress={() => setLeadTimeNormal(prev => Math.max(1, prev - 1))}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{leadTimeNormal}m</Text>
              <TouchableOpacity 
                style={styles.stepBtn}
                onPress={() => setLeadTimeNormal(prev => Math.min(60, prev + 1))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Consecutive Lead Time */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Lead Time (Consecutive)</Text>
              <Text style={styles.settingDesc}>Offset for classes back-to-back (&lt; 20m)</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity 
                style={styles.stepBtn}
                onPress={() => setLeadTimeConsecutive(prev => Math.max(1, prev - 1))}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{leadTimeConsecutive}m</Text>
              <TouchableOpacity 
                style={styles.stepBtn}
                onPress={() => setLeadTimeConsecutive(prev => Math.min(30, prev + 1))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Auto Stop duration */}
          <View style={styles.settingRow}>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingLabel}>Alarm Ring Time</Text>
              <Text style={styles.settingDesc}>Shut off alarms automatically after this</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity 
                style={styles.stepBtn}
                onPress={() => setAutoStopSeconds(prev => Math.max(10, prev - 5))}
              >
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepVal}>{autoStopSeconds}s</Text>
              <TouchableOpacity 
                style={styles.stepBtn}
                onPress={() => setAutoStopSeconds(prev => Math.min(120, prev + 5))}
              >
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data Clearing Section */}
        <TouchableOpacity 
          style={styles.clearCard}
          onPress={handleClearData}
        >
          <Text style={styles.clearText}>⚠️ Clear Timetable Data & Cancel Alarms</Text>
        </TouchableOpacity>

        {/* Save CTA */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save Changes</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const createStyles = (colors: typeof DarkThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    fontFamily: 'Manrope',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.secondary,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 16,
  },
  fieldLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    backgroundColor: colors.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: 14,
  },
  tipText: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  settingsImportButton: {
    marginTop: 16,
    height: 44,
    backgroundColor: isDark ? 'rgba(0, 210, 255, 0.12)' : 'rgba(0, 123, 181, 0.12)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsImportButtonText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingTextCol: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  settingDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnText: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  stepVal: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 10,
    minWidth: 44,
    textAlign: 'center',
  },
  clearCard: {
    backgroundColor: isDark ? 'rgba(239, 83, 80, 0.08)' : 'rgba(186, 26, 26, 0.08)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 83, 80, 0.15)' : 'rgba(186, 26, 26, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  clearText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: colors.electricBlue,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
