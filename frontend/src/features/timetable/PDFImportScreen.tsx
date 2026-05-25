import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import DocumentPicker, { types } from 'react-native-document-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootNavigator';
import { Theme } from '../../app/theme/theme';
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
      setErrorMsg(err.message || 'Connection failed. Ensure backend server is running.');
    }
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  instructionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.text,
    marginBottom: 8,
  },
  instructionDesc: {
    fontSize: 14,
    color: Theme.colors.textMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  trainerBadge: {
    backgroundColor: Theme.colors.surface,
    padding: 16,
    borderRadius: Theme.colors.md,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  trainerLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  trainerName: {
    color: Theme.colors.secondary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  pickerArea: {
    height: 180,
    borderRadius: Theme.colors.xl,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  pickerAreaSelected: {
    borderColor: Theme.colors.secondary,
    borderStyle: 'solid',
    backgroundColor: 'rgba(0, 210, 255, 0.03)',
  },
  pickerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  pickerText: {
    color: Theme.colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  fileSize: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  errorContainer: {
    padding: 16,
    borderRadius: Theme.colors.md,
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.2)',
    marginBottom: 24,
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: 13,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: Theme.colors.electricBlue,
    borderRadius: Theme.colors.md,
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
