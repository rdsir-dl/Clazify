import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DocumentPicker, { types } from 'react-native-document-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootNavigator';
import { DarkThemeColors, LightThemeColors } from '../../app/theme/theme';
import { useTimetableStore } from './useTimetableStore';
import { useSettingsStore } from '../settings/useSettingsStore';

type PDFImportScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PDFImport'>;

interface Props {
  navigation: PDFImportScreenNavigationProp;
}

export default function PDFImportScreen({ navigation }: Props) {
  const timetableStore = useTimetableStore();
  const settingsStore = useSettingsStore();

  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handlePickDocument = async () => {
    try {
      setErrorMsg('');
      const res = await DocumentPicker.pickSingle({
        type: [types.pdf],
      });
      setSelectedFile(res);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        console.log('User cancelled picker');
      } else {
        setErrorMsg('Failed to select file. Please try again.');
        console.error(err);
      }
    }
  };

  const handleStartParsing = async () => {
    if (!selectedFile) return;

    try {
      const trainerName = settingsStore.settings.trainerName;
      if (!trainerName) {
        Alert.alert('Configuration Required', 'Please set your Trainer Name in Settings first.');
        navigation.navigate('Settings');
        return;
      }

      console.log(`Starting parsing for file: ${selectedFile.name}`);
      const success = await timetableStore.uploadTimetablePdf(selectedFile.uri, selectedFile.name);

      if (success) {
        Alert.alert(
          'Timetable Imported',
          `Successfully parsed and scheduled alarms for trainer "${trainerName}".`,
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
        );
      } else {
        setErrorMsg(`We couldn't find any lectures matching "${trainerName}" in this PDF. Please check your spelling in Settings.`);
      }
    } catch (err: any) {
      console.error(err);
      let msg = err.message || 'Connection failed. Ensure backend server is running.';
      if (err.response && err.response.data) {
        const data = err.response.data;
        msg = `${data.error || 'Server Error'}: ${data.details || JSON.stringify(data)}`;
      }
      setErrorMsg(msg);
    }
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
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Import Timetable</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.instructionTitle}>Select Timetable PDF</Text>
        <Text style={styles.instructionDesc}>
          Upload your institution's official timetable PDF. Clazify will automatically search the document and extract slots matching your Trainer Name:
        </Text>
        
        {/* Active Trainer Name Indicator */}
        <View style={styles.trainerBadge}>
          <Text style={styles.trainerLabel}>SEARCHING FOR TRAINER:</Text>
          <Text style={styles.trainerName}>
            {settingsStore.settings.trainerName || 'Not Set (Go to Settings)'}
          </Text>
        </View>

        {/* File Picker Target Area */}
        <TouchableOpacity 
          style={[styles.pickerArea, selectedFile && styles.pickerAreaSelected]}
          activeOpacity={0.7}
          onPress={handlePickDocument}
          disabled={timetableStore.loading}
        >
          <Text style={styles.pickerIcon}>{selectedFile ? '📄' : '📤'}</Text>
          <Text style={styles.pickerText}>
            {selectedFile ? selectedFile.name : 'Tap to select PDF file'}
          </Text>
          {selectedFile && (
            <Text style={styles.fileSize}>
              {Math.round(selectedFile.size / 1024)} KB
            </Text>
          )}
        </TouchableOpacity>

        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        {/* Action Button */}
        {selectedFile && (
          <TouchableOpacity 
            style={[styles.submitButton, timetableStore.loading && styles.submitButtonDisabled]}
            onPress={handleStartParsing}
            disabled={timetableStore.loading}
          >
            {timetableStore.loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Upload & Extract Schedules</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  instructionDesc: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  trainerBadge: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  trainerLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  trainerName: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  pickerArea: {
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pickerAreaSelected: {
    borderColor: colors.secondary,
    borderStyle: 'solid',
    backgroundColor: isDark ? 'rgba(0, 210, 255, 0.03)' : 'rgba(0, 123, 181, 0.03)',
  },
  pickerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  pickerText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  fileSize: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: isDark ? 'rgba(239, 83, 80, 0.1)' : 'rgba(186, 26, 26, 0.1)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(239, 83, 80, 0.2)' : 'rgba(186, 26, 26, 0.2)',
    marginBottom: 24,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: colors.electricBlue,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
