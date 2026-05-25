import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootNavigator';
import { Theme } from '../../app/theme/theme';
import { useAttendanceStore } from './useAttendanceStore';
import dayjs from 'dayjs';

type AttendanceScreenRouteProp = RouteProp<RootStackParamList, 'Attendance'>;
type AttendanceScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Attendance'>;

interface Props {
  route: AttendanceScreenRouteProp;
  navigation: AttendanceScreenNavigationProp;
}

export default function AttendanceScreen({ route, navigation }: Props) {
  const { batch, groupName, subject } = route.params;
  const attendanceStore = useAttendanceStore();

  const [date, setDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [totalStudents, setTotalStudents] = useState<number>(60);
  const [presentCount, setPresentCount] = useState<number>(50);
  const [loadingStrength, setLoadingStrength] = useState<boolean>(true);

  useEffect(() => {
    const loadStrength = async () => {
      setLoadingStrength(true);
      try {
        const count = await attendanceStore.fetchStudentStrength(batch, groupName, subject);
        setTotalStudents(count);
        // Default present count to 90% of total
        setPresentCount(Math.round(count * 0.9));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingStrength(false);
      }
    };
    loadStrength();
  }, [batch, groupName, subject]);

  const handleIncrement = () => {
    if (presentCount < totalStudents) {
      setPresentCount(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (presentCount > 0) {
      setPresentCount(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (presentCount > totalStudents) {
      Alert.alert('Validation Error', 'Present count cannot exceed total student count.');
      return;
    }

    try {
      await attendanceStore.markAttendance(
        batch,
        groupName,
        subject,
        date,
        presentCount,
        totalStudents
      );
      Alert.alert(
        'Record Saved',
        `Successfully marked attendance for ${subject}: ${presentCount}/${totalStudents} present.`,
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (e) {
      Alert.alert('Error', 'Failed to save attendance record.');
    }
  };

  const absentCount = totalStudents - presentCount;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.backText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <View style={{ width: 60 }} />
      </View>

      {loadingStrength ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator color={Theme.colors.secondary} size="large" />
          <Text style={styles.loaderText}>Syncing class metadata...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Class Metadata */}
          <View style={styles.classCard}>
            <Text style={styles.subjectText}>{subject}</Text>
            <Text style={styles.batchText}>
              {batch} {groupName ? `• ${groupName}` : ''}
            </Text>
            <Text style={styles.dateLabel}>Date: {dayjs(date).format('MMMM D, YYYY')}</Text>
          </View>

          {/* Counts Input */}
          <View style={styles.controlCard}>
            <Text style={styles.controlTitle}>Student Headcount</Text>
            
            {/* Total count input */}
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Total Strength</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={totalStudents.toString()}
                onChangeText={(val) => {
                  const num = parseInt(val, 10) || 0;
                  setTotalStudents(num);
                  if (presentCount > num) setPresentCount(num);
                }}
              />
            </View>

            {/* Present count ticker */}
            <Text style={styles.tickerLabel}>Present Students</Text>
            <View style={styles.tickerContainer}>
              <TouchableOpacity 
                style={styles.tickerButton}
                onPress={handleDecrement}
              >
                <Text style={styles.tickerButtonText}>−</Text>
              </TouchableOpacity>
              
              <Text style={styles.tickerValue}>{presentCount}</Text>
              
              <TouchableOpacity 
                style={styles.tickerButton}
                onPress={handleIncrement}
              >
                <Text style={styles.tickerButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Calculated Absentees */}
            <View style={styles.absentRow}>
              <Text style={styles.absentLabel}>Absent Students</Text>
              <Text style={styles.absentValue}>{absentCount}</Text>
            </View>
          </View>

          {/* Statistics Rings */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Marking Summary</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}>
                <Text style={[styles.summaryNum, { color: Theme.colors.success }]}>
                  {totalStudents > 0 ? `${Math.round((presentCount / totalStudents) * 100)}%` : '0%'}
                </Text>
                <Text style={styles.summaryLabel}>Presence Rate</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={[styles.summaryNum, { color: Theme.colors.error }]}>
                  {totalStudents > 0 ? `${Math.round((absentCount / totalStudents) * 100)}%` : '0%'}
                </Text>
                <Text style={styles.summaryLabel}>Absence Rate</Text>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={styles.submitButton}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Submit Attendance Record</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// React Native ScrollView Mock fallback import for compile check
import { ScrollView } from 'react-native';

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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: Theme.colors.textMuted,
    marginTop: 12,
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  classCard: {
    backgroundColor: 'rgba(0, 210, 255, 0.05)',
    borderRadius: Theme.colors.xl,
    padding: 24,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.1)',
  },
  subjectText: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  batchText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  dateLabel: {
    color: Theme.colors.secondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
  },
  controlCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.colors.xl,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  controlTitle: {
    color: Theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  textInput: {
    width: 80,
    height: 40,
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: Theme.colors.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    color: '#ffffff',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '700',
  },
  tickerLabel: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  tickerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: Theme.colors.lg,
    padding: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tickerButton: {
    width: 44,
    height: 44,
    borderRadius: Theme.colors.md,
    backgroundColor: Theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  tickerButtonText: {
    color: Theme.colors.secondary,
    fontSize: 20,
    fontWeight: '700',
  },
  tickerValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  absentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: Theme.colors.border,
  },
  absentLabel: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  absentValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.error,
  },
  summaryCard: {
    backgroundColor: Theme.colors.surfaceVariant,
    borderRadius: Theme.colors.xl,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  summaryTitle: {
    color: Theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.colors.md,
    paddingVertical: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  summaryNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  summaryLabel: {
    color: Theme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: Theme.colors.electricBlue,
    borderRadius: Theme.colors.md,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
});
