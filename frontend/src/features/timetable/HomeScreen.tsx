import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootNavigator';
import { DarkThemeColors, LightThemeColors } from '../../app/theme/theme';
import { useSettingsStore } from '../settings/useSettingsStore';
import { useTimetableStore } from './useTimetableStore';
import { useAlarmStore } from '../alarms/useAlarmStore';
import { useAttendanceStore } from '../attendance/useAttendanceStore';
import dayjs from 'dayjs';
import { TimetableEntry } from '../../database/repositories/repositories';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface LectureCardProps {
  lecture: TimetableEntry;
  colors: typeof DarkThemeColors;
  isDark: boolean;
  styles: any;
  ongoing: boolean;
  isRinging: boolean;
  alarmStore: any;
  attendanceStore: any;
  timetableStore: any;
  dateStr: string;
  navigation: any;
}

function LectureCard({
  lecture,
  colors,
  isDark,
  styles,
  ongoing,
  isRinging,
  alarmStore,
  attendanceStore,
  timetableStore,
  dateStr,
  navigation,
}: LectureCardProps) {
  const attRecord = attendanceStore.records.find(
    (r: any) =>
      r.date === dateStr &&
      r.subject === lecture.subject &&
      r.batch === lecture.batch &&
      (r.groupName === lecture.groupName || (!r.groupName && !lecture.groupName))
  );

  const initialTotal = attRecord ? attRecord.totalCount.toString() : (lecture.totalStudents?.toString() || '60');
  const initialPresent = attRecord ? attRecord.presentCount.toString() : '';

  const [totalStudentsInput, setTotalStudentsInput] = useState<string>(initialTotal);
  const [presentStudentsInput, setPresentStudentsInput] = useState<string>(initialPresent);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  useEffect(() => {
    setTotalStudentsInput(initialTotal);
    setPresentStudentsInput(initialPresent);
  }, [initialTotal, initialPresent, dateStr]);

  const handleSaveTotalStudents = async () => {
    const val = parseInt(totalStudentsInput, 10);
    if (isNaN(val) || val <= 0) {
      setTotalStudentsInput(initialTotal);
      return;
    }

    // Save to SQLite for all repeating slots
    await timetableStore.updateTotalStudents(lecture.subject, lecture.batch, lecture.groupName, val);

    // Also update attendance record for today if present is already marked
    const currentPresentVal = parseInt(presentStudentsInput, 10);
    if (!isNaN(currentPresentVal)) {
      await attendanceStore.markAttendance(
        lecture.batch,
        lecture.groupName,
        lecture.subject,
        dateStr,
        currentPresentVal,
        val
      );
    } else if (attRecord) {
      await attendanceStore.markAttendance(
        lecture.batch,
        lecture.groupName,
        lecture.subject,
        dateStr,
        attRecord.presentCount,
        val
      );
    }
  };

  const handleSavePresentStudents = async () => {
    if (presentStudentsInput.trim() === '') {
      return;
    }

    const val = parseInt(presentStudentsInput, 10);
    const tot = parseInt(totalStudentsInput, 10) || lecture.totalStudents || 60;

    if (isNaN(val) || val < 0) {
      setPresentStudentsInput(initialPresent);
      return;
    }

    if (val > tot) {
      Alert.alert('Validation Error', 'Present count cannot exceed total student count.');
      setPresentStudentsInput(initialPresent);
      return;
    }

    await attendanceStore.markAttendance(
      lecture.batch,
      lecture.groupName,
      lecture.subject,
      dateStr,
      val,
      tot
    );
  };

  const handleRefreshStrength = async () => {
    setRefreshing(true);
    try {
      const count = await attendanceStore.fetchStudentStrength(
        lecture.batch,
        lecture.groupName,
        lecture.subject
      );

      await timetableStore.updateTotalStudents(lecture.subject, lecture.batch, lecture.groupName, count);
      setTotalStudentsInput(count.toString());

      if (attRecord) {
        await attendanceStore.markAttendance(
          lecture.batch,
          lecture.groupName,
          lecture.subject,
          dateStr,
          attRecord.presentCount,
          count
        );
      }
      Alert.alert('Sync Complete', `Updated total students to ${count} from Google Sheets.`);
    } catch (e) {
      Alert.alert('Sync Failed', 'Could not fetch student strength from Google Sheet.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleAlarm = () => {
    timetableStore.toggleAlarmEnabled(lecture.id);
  };

  const formatTo12Hour = (time24: string): string => {
    if (!time24) return '';
    const [hourStr, minStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minStr} ${ampm}`;
  };

  return (
    <View 
      style={[
        styles.lectureCard, 
        ongoing && styles.ongoingCardBorder,
        isRinging && styles.ringingCardBorder
      ]}
    >
      {/* Ringing Alarm Overlay */}
      {isRinging && (
        <View style={styles.ringingOverlay}>
          <Text style={styles.ringingText}>🚨 Alarm Ringing! 🚨</Text>
          <View style={styles.ringingActions}>
            <TouchableOpacity 
              style={styles.ringingButtonDismiss}
              onPress={() => alarmStore.dismissRingingAlarm()}
            >
              <Text style={styles.ringingButtonText}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.ringingButtonMark}
              onPress={async () => {
                await alarmStore.dismissRingingAlarm();
                navigation.navigate('Attendance', {
                  batch: lecture.batch,
                  groupName: lecture.groupName,
                  subject: lecture.subject
                });
              }}
            >
              <Text style={styles.ringingButtonText}>Mark Attendance</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.cardHeader}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.subjectText} numberOfLines={1} ellipsizeMode="tail">
            {lecture.subject}{'  '}
            <Text style={styles.headerRoomText}>📍 {lecture.roomCode}</Text>
          </Text>
          <Text style={styles.batchText} numberOfLines={1} ellipsizeMode="tail">
            {lecture.batch} {lecture.groupName ? `• ${lecture.groupName}` : ''}
            {lecture.isExtra && <Text style={styles.extraBadgeText}> • EXTRA</Text>}
          </Text>
        </View>
        
        {/* Alarm Status Toggle */}
        <TouchableOpacity 
          style={styles.alarmToggle}
          onPress={handleToggleAlarm}
        >
          <Text style={[
            styles.alarmIcon,
            lecture.alarmEnabled ? styles.alarmIconEnabled : styles.alarmIconDisabled
          ]}>
            {lecture.alarmEnabled ? '🔔' : '🔕'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card Details (Time only) */}
      <View style={styles.cardDetailsRow}>
        <View style={styles.footerDetails}>
          <Text style={styles.footerDetailText}>
            ⏰ {formatTo12Hour(lecture.startTime)} - {formatTo12Hour(lecture.endTime)}
          </Text>
        </View>
        {ongoing && (
          <View style={styles.ongoingBadge}>
            <Text style={styles.ongoingBadgeText}>ONGOING</Text>
          </View>
        )}
      </View>

      {/* Student count boxes (for Total & Present students) - Flush bottom! */}
      <View style={styles.studentStatsRow}>
        <View style={styles.studentStatBox}>
          <Text style={styles.studentStatLabel}>Total Students</Text>
          <TextInput
            style={styles.studentStatInput}
            value={totalStudentsInput}
            onChangeText={setTotalStudentsInput}
            onBlur={handleSaveTotalStudents}
            onSubmitEditing={handleSaveTotalStudents}
            keyboardType="numeric"
            placeholder="--"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
          />
        </View>
        <View style={styles.studentStatDivider} />
        <View style={styles.studentStatBox}>
          <Text style={styles.studentStatLabel}>Present Students</Text>
          <TextInput
            style={styles.studentStatInput}
            value={presentStudentsInput}
            onChangeText={setPresentStudentsInput}
            onBlur={handleSavePresentStudents}
            onSubmitEditing={handleSavePresentStudents}
            keyboardType="numeric"
            placeholder="--"
            placeholderTextColor={colors.textMuted}
            selectTextOnFocus
          />
        </View>
        <View style={styles.studentStatDivider} />
        <TouchableOpacity 
          style={styles.studentRefreshButton} 
          onPress={handleRefreshStrength}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color={colors.electricBlue} />
          ) : (
            <Text style={styles.refreshIcon}>🔄</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function HomeScreen({ navigation }: Props) {
  const settingsStore = useSettingsStore();
  const timetableStore = useTimetableStore();
  const alarmStore = useAlarmStore();
  const attendanceStore = useAttendanceStore();

  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  // Extra Lecture Modal states
  const [addExtraModalVisible, setAddExtraModalVisible] = useState<boolean>(false);
  const [extraSubject, setExtraSubject] = useState<string>('');
  const [extraRoom, setExtraRoom] = useState<string>('');
  const [extraBatch, setExtraBatch] = useState<string>('');
  const [extraGroup, setExtraGroup] = useState<string>('');
  const [extraStartTime, setExtraStartTime] = useState<string>('09:00');
  const [extraEndTime, setExtraEndTime] = useState<string>('10:00');
  const [extraTotalStudents, setExtraTotalStudents] = useState<string>('60');

  useEffect(() => {
    // 1. Initial setups
    settingsStore.loadSettings();
    timetableStore.loadTimetable();
    alarmStore.loadAlarms();
    attendanceStore.loadRecords();

    // 2. Set current day as default selected tab
    const currentDayOfWeek = dayjs().format('dddd');
    if (WEEKDAYS.includes(currentDayOfWeek)) {
      setSelectedDay(currentDayOfWeek);
    }

    // 3. Current time ticker (to highlight ongoing class)
    const updateTime = () => {
      setCurrentTimeStr(dayjs().format('HH:mm'));
    };
    updateTime();
    const interval = setInterval(updateTime, 10000); // check time every 10s
    return () => clearInterval(interval);
  }, []);

  // Helper to get date Str for YYYY-MM-DD
  const getTargetDateStr = (dayName: string): string => {
    const currentDayOfWeek = dayjs().day(); // 0 (Sun) to 6 (Sat)
    const currentNorm = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const targetIndex = WEEKDAYS.indexOf(dayName);
    const diffDays = targetIndex - currentNorm;
    return dayjs().add(diffDays, 'day').format('YYYY-MM-DD');
  };

  // Filter lectures for selected weekday and date (if extra)
  const targetDateStr = getTargetDateStr(selectedDay);
  const dailyLectures = timetableStore.entries.filter(e => {
    if (e.isExtra) {
      return e.extraDate === targetDateStr;
    } else {
      return e.dayOfWeek === selectedDay;
    }
  });

  // Determine if a class is currently ongoing
  const isClassOngoing = (startTime: string, endTime: string): boolean => {
    const today = dayjs().format('dddd');
    if (selectedDay !== today) return false;
    return currentTimeStr >= startTime && currentTimeStr <= endTime;
  };

  // Helper to get date for each weekday (e.g. "25 May")
  const getDayDate = (dayName: string): string => {
    const currentDayOfWeek = dayjs().day(); // 0 (Sun) to 6 (Sat)
    const currentNorm = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const targetIndex = WEEKDAYS.indexOf(dayName);
    const diffDays = targetIndex - currentNorm;
    return dayjs().add(diffDays, 'day').format('D MMM');
  };

  const handleAddExtraLecture = async () => {
    if (!extraSubject.trim() || !extraRoom.trim() || !extraBatch.trim() || !extraStartTime.trim() || !extraEndTime.trim()) {
      Alert.alert('Required Fields', 'Please fill in all required fields (Subject, Room, Batch, Start Time, End Time).');
      return;
    }

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(extraStartTime.trim()) || !timeRegex.test(extraEndTime.trim())) {
      Alert.alert('Invalid Time Format', 'Please enter start and end times in HH:MM format (24-hour style, e.g. 09:30 or 14:15).');
      return;
    }

    const totalNum = parseInt(extraTotalStudents, 10);
    if (isNaN(totalNum) || totalNum <= 0) {
      Alert.alert('Invalid Total Students', 'Please enter a valid positive number for total student strength.');
      return;
    }

    const success = await timetableStore.addExtraLecture({
      id: `extra_lecture_${Date.now()}`,
      subject: extraSubject.trim(),
      roomCode: extraRoom.trim(),
      batch: extraBatch.trim(),
      groupName: extraGroup.trim() || undefined,
      dayOfWeek: selectedDay,
      startTime: extraStartTime.trim(),
      endTime: extraEndTime.trim(),
      totalStudents: totalNum,
      isExtra: true,
      extraDate: targetDateStr,
    });

    if (success) {
      Alert.alert('Success', 'Extra lecture scheduled successfully for this date only.');
      setAddExtraModalVisible(false);
      // Reset fields
      setExtraSubject('');
      setExtraRoom('');
      setExtraBatch('');
      setExtraGroup('');
      setExtraStartTime('09:00');
      setExtraEndTime('10:00');
      setExtraTotalStudents('60');
    } else {
      Alert.alert('Error', 'Failed to schedule extra lecture.');
    }
  };

  const insets = useSafeAreaInsets();
  const isDark = settingsStore.settings.themeMode !== 'light';
  const colors = isDark ? DarkThemeColors : LightThemeColors;
  const styles = createStyles(colors, isDark);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.logoText}>Clazify</Text>
          <Text style={styles.subtext}>
            {settingsStore.settings.trainerName 
              ? `Welcome, ${settingsStore.settings.trainerName}` 
              : 'Setup trainer configuration'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.themeToggle}
            onPress={() => settingsStore.updateSettings({ themeMode: isDark ? 'light' : 'dark' })}
          >
            <Text style={styles.themeIcon}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Empty Settings Onboarding */}
        {!settingsStore.settings.trainerName && (
          <View style={styles.onboardingCard}>
            <Text style={styles.onboardingTitle}>Get Started with Clazify</Text>
            <Text style={styles.onboardingDesc}>
              Before importing your timetable PDF, please configure your profile and alarm lead times.
            </Text>
            <TouchableOpacity 
              style={styles.onboardingButton}
              onPress={() => navigation.navigate('Settings')}
            >
              <Text style={styles.onboardingButtonText}>Configure Settings</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Weekday Tabs */}
        {settingsStore.settings.trainerName && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.tabContainer}
            contentContainerStyle={styles.tabContent}
          >
            {WEEKDAYS.map((day) => {
              const isActive = selectedDay === day;
              const hasClasses = timetableStore.entries.some(e => {
                if (e.isExtra) {
                  return e.extraDate === getTargetDateStr(day);
                }
                return e.dayOfWeek === day;
              });
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.tab, isActive && styles.activeTab]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {day.substring(0, 3)}
                  </Text>
                  <Text style={[styles.tabDateText, isActive && styles.activeTabDateText]}>
                    {getDayDate(day)}
                  </Text>
                  {hasClasses && <View style={[styles.dot, isActive && styles.activeDot]} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Lectures List */}
        {settingsStore.settings.trainerName && (
          <View style={styles.lectureList}>
            {dailyLectures.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No classes scheduled for {selectedDay}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.addExtraButton}
                  onPress={() => setAddExtraModalVisible(true)}
                >
                  <Text style={styles.addExtraButtonText}>+ Add Extra Lecture</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                {dailyLectures.map((lecture) => {
                  const ongoing = isClassOngoing(lecture.startTime, lecture.endTime);
                  const isRinging = alarmStore.activeAlarmId === `alarm_${lecture.id}`;

                  return (
                    <LectureCard
                      key={lecture.id}
                      lecture={lecture}
                      colors={colors}
                      isDark={isDark}
                      styles={styles}
                      ongoing={ongoing}
                      isRinging={isRinging}
                      alarmStore={alarmStore}
                      attendanceStore={attendanceStore}
                      timetableStore={timetableStore}
                      dateStr={targetDateStr}
                      navigation={navigation}
                    />
                  );
                })}
                <TouchableOpacity 
                  style={styles.addExtraButton}
                  onPress={() => setAddExtraModalVisible(true)}
                >
                  <Text style={styles.addExtraButtonText}>+ Add Extra Lecture</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Extra Lecture Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={addExtraModalVisible}
        onRequestClose={() => setAddExtraModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add Extra Lecture</Text>
            <Text style={styles.modalSubtitle}>
              For {dayjs(targetDateStr).format('dddd, D MMM YYYY')}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.modalInputLabel}>Subject Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={extraSubject}
                onChangeText={setExtraSubject}
                placeholder="e.g. Mobile Application Development"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.modalInputLabel}>Room Code *</Text>
              <TextInput
                style={styles.modalInput}
                value={extraRoom}
                onChangeText={setExtraRoom}
                placeholder="e.g. Lab 3 / Room 302"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.modalInputLabel}>Batch Name *</Text>
              <TextInput
                style={styles.modalInput}
                value={extraBatch}
                onChangeText={setExtraBatch}
                placeholder="e.g. BE-CSE-5D"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.modalInputLabel}>Group Name (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={extraGroup}
                onChangeText={setExtraGroup}
                placeholder="e.g. Group 1"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.modalRow}>
                <View style={styles.modalCol}>
                  <Text style={styles.modalInputLabel}>Start Time *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={extraStartTime}
                    onChangeText={setExtraStartTime}
                    placeholder="HH:MM (24h format)"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ width: 16 }} />
                <View style={styles.modalCol}>
                  <Text style={styles.modalInputLabel}>End Time *</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={extraEndTime}
                    onChangeText={setExtraEndTime}
                    placeholder="HH:MM (24h format)"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={styles.modalInputLabel}>Total Students *</Text>
              <TextInput
                style={styles.modalInput}
                value={extraTotalStudents}
                onChangeText={setExtraTotalStudents}
                keyboardType="numeric"
                placeholder="e.g. 60"
                placeholderTextColor={colors.textMuted}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setAddExtraModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleAddExtraLecture}
              >
                <Text style={styles.modalSubmitButtonText}>Add Lecture</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.secondary,
    fontFamily: 'Manrope',
    letterSpacing: -0.5,
  },
  subtext: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  themeIcon: {
    fontSize: 16,
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsIcon: {
    fontSize: 16,
    color: colors.text,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  onboardingCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  onboardingTitle: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  onboardingDesc: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  onboardingButton: {
    backgroundColor: colors.electricBlue,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  onboardingButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  tabContainer: {
    marginBottom: 12,
  },
  tabContent: {
    paddingVertical: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 70,
    height: 52,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: isDark ? 'rgba(45, 91, 255, 0.2)' : 'rgba(0, 123, 181, 0.15)',
    borderColor: colors.electricBlue,
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  activeTabText: {
    color: colors.secondary,
    fontWeight: '800',
  },
  tabDateText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    opacity: 0.8,
  },
  activeTabDateText: {
    color: colors.secondary,
    fontWeight: '700',
    opacity: 1.0,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    position: 'absolute',
    bottom: 3,
  },
  activeDot: {
    backgroundColor: colors.secondary,
  },
  lectureList: {
    marginBottom: 16,
  },
  emptyContainer: {
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  lectureCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  ongoingCardBorder: {
    borderColor: colors.secondary,
    borderWidth: 1.5,
    backgroundColor: isDark ? 'rgba(0, 210, 255, 0.04)' : 'rgba(0, 123, 181, 0.04)',
  },
  ringingCardBorder: {
    borderColor: colors.error,
    borderWidth: 1.5,
    backgroundColor: isDark ? 'rgba(255, 180, 171, 0.04)' : 'rgba(186, 26, 26, 0.04)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  headerRoomText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  batchText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  alarmToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmIcon: {
    fontSize: 14,
  },
  alarmIconEnabled: {
    opacity: 1.0,
  },
  alarmIconDisabled: {
    opacity: 0.3,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 10,
  },
  footerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerDetailText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  ongoingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: isDark ? 'rgba(0, 210, 255, 0.15)' : 'rgba(0, 123, 181, 0.15)',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(0, 210, 255, 0.25)' : 'rgba(0, 123, 181, 0.25)',
  },
  ongoingBadgeText: {
    color: colors.secondary,
    fontSize: 9,
    fontWeight: '800',
  },
  ringingOverlay: {
    backgroundColor: isDark ? 'rgba(239, 83, 80, 0.15)' : 'rgba(186, 26, 26, 0.1)',
    marginHorizontal: -16,
    marginTop: -12,
    marginBottom: 12,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.error,
  },
  ringingText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  ringingActions: {
    flexDirection: 'row',
  },
  ringingButtonDismiss: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ringingButtonMark: {
    backgroundColor: colors.error,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  ringingButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 11,
  },
  studentStatsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 12,
    marginHorizontal: -16,
    marginBottom: -12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.015)' : 'rgba(0, 0, 0, 0.015)',
  },
  studentStatBox: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentStatDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  studentRefreshButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentStatLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  studentStatInput: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
    padding: 0,
    textAlign: 'center',
    minWidth: 50,
  },
  refreshIcon: {
    fontSize: 16,
  },
  extraBadgeText: {
    color: colors.electricBlue,
    fontWeight: '800',
    fontSize: 11,
  },
  addExtraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.electricBlue,
    marginTop: 10,
    backgroundColor: isDark ? 'rgba(45, 91, 255, 0.05)' : 'rgba(0, 123, 181, 0.05)',
  },
  addExtraButtonText: {
    color: colors.electricBlue,
    fontSize: 14,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 14,
  },
  modalRow: {
    flexDirection: 'row',
  },
  modalCol: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
  },
  modalCancelButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.electricBlue,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalSubmitButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
