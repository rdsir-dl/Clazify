import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootNavigator';
import { Theme } from '../../app/theme/theme';
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
  const [backendUrl, setBackendUrl] = useState<string>('http://10.0.2.2:3000');

  useEffect(() => {
    const load = async () => {
      await settingsStore.loadSettings();
      const s = settingsStore.settings;
      setTrainerName(s.trainerName);
      setLeadTimeNormal(s.leadTimeNormal);
      setLeadTimeConsecutive(s.leadTimeConsecutive);
      setAutoStopSeconds(s.autoStopSeconds);
      setBackendUrl(s.backendUrl || 'http://10.0.2.2:3000');
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!trainerName.trim()) {
      Alert.alert('Validation Error', 'Trainer Name cannot be empty.');
      return;
    }
    if (!backendUrl.trim()) {
      Alert.alert('Validation Error', 'Backend URL cannot be empty.');
      return;
    }

    try {
      await settingsStore.updateSettings({
        trainerName: trainerName.trim(),
        leadTimeNormal,
        leadTimeConsecutive,
        autoStopSeconds,
        backendUrl: backendUrl.trim(),
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
      
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
          <Text style={styles.cardTitle}>Trainer Profile & Server</Text>
          <Text style={styles.fieldLabel}>Trainer Name (Matches PDF search)</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. Harrison"
            placeholderTextColor={Theme.colors.textMuted}
            value={trainerName}
            onChangeText={setTrainerName}
          />
          <Text style={styles.tipText}>
            Tip: Keep it short (e.g. last name or unique identifier) to match PDF parser heuristics successfully.
          </Text>

          <View style={{ height: 16 }} />

          <Text style={styles.fieldLabel}>Backend Server URL</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. http://10.0.2.2:3000"
            placeholderTextColor={Theme.colors.textMuted}
            value={backendUrl}
            onChangeText={setBackendUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.tipText}>
            Use http://10.0.2.2:3000 for emulator. For physical device, run 'adb reverse tcp:3000 tcp:3000' and use http://localhost:3000, or enter your PC's local Wi-Fi IP (e.g., http://192.168.1.10:3000).
          </Text>
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

        {/* Battery Optimization Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Background Reliability</Text>
          <Text style={styles.descText}>
            OEM devices shut down alarms to save battery. Giving Clazify permission to ignore battery optimizations resolves this issues.
          </Text>
          
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>STATUS:</Text>
            <Text style={[
              styles.statusValue,
              settingsStore.settings.batteryOptimizationIgnored ? styles.statusGreen : styles.statusRed
            ]}>
              {settingsStore.settings.batteryOptimizationIgnored ? 'Whitelisted (Protected)' : 'Restricted (Not Protected)'}
            </Text>
          </View>

          {!settingsStore.settings.batteryOptimizationIgnored && (
            <TouchableOpacity 
              style={styles.exemptionButton}
              onPress={() => settingsStore.requestBatteryOptimizationExemption()}
            >
              <Text style={styles.exemptionButtonText}>Ignore Battery Optimization</Text>
            </TouchableOpacity>
          )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
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
    borderRadius: Theme.colors.sm,
    backgroundColor: Theme.colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  backText: {
    color: Theme.colors.text,
    fontWeight: '700',
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
    fontFamily: 'Manrope',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.colors.xl,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  cardTitle: {
    color: Theme.colors.secondary,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 16,
  },
  fieldLabel: {
    color: Theme.colors.text,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: Theme.colors.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 14,
  },
  tipText: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
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
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  settingDesc: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: Theme.colors.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 4,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  stepBtnText: {
    color: Theme.colors.secondary,
    fontSize: 16,
    fontWeight: '700',
  },
  stepVal: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    paddingHorizontal: 10,
    minWidth: 44,
    textAlign: 'center',
  },
  descText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    color: Theme.colors.text,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  statusValue: {
    fontWeight: '700',
    fontSize: 13,
  },
  statusGreen: {
    color: Theme.colors.success,
  },
  statusRed: {
    color: Theme.colors.error,
  },
  exemptionButton: {
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
    borderRadius: Theme.colors.md,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
  },
  exemptionButtonText: {
    color: Theme.colors.secondary,
    fontWeight: '700',
    fontSize: 13,
  },
  clearCard: {
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.2)',
    borderRadius: Theme.colors.xl,
    padding: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  clearText: {
    color: Theme.colors.error,
    fontWeight: '700',
    fontSize: 13,
  },
  saveButton: {
    backgroundColor: Theme.colors.electricBlue,
    borderRadius: Theme.colors.md,
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
