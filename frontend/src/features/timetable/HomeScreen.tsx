import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../app/navigation/RootNavigator';
import { Theme } from '../../app/theme/theme';
import { useSettingsStore } from '../settings/useSettingsStore';
import { useTimetableStore } from './useTimetableStore';
import { useAlarmStore } from '../alarms/useAlarmStore';
import { useAttendanceStore } from '../attendance/useAttendanceStore';
import dayjs from 'dayjs';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function HomeScreen({ navigation }: Props) {
  const settingsStore = useSettingsStore();
  const timetableStore = useTimetableStore();
  const alarmStore = useAlarmStore();
  const attendanceStore = useAttendanceStore();

  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

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

  // Filter lectures for selected weekday
  const dailyLectures = timetableStore.entries.filter(e => e.dayOfWeek === selectedDay);

  // Determine if a class is currently ongoing
  const isClassOngoing = (startTime: string, endTime: string): boolean => {
    const today = dayjs().format('dddd');
    if (selectedDay !== today) return false;
    return currentTimeStr >= startTime && currentTimeStr <= endTime;
  };

  const handleExemptBatteryPrompt = () => {
    Alert.alert(
      'Battery Optimization Exemption',
      'To guarantee exact alarms, Clazify needs to run without battery restrictions on this device. Would you like to whitelist Clazify now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settings', onPress: () => settingsStore.requestBatteryOptimizationExemption() }
      ]
    );
  };

  const handleToggleAlarm = (entryId: string) => {
    timetableStore.toggleAlarmEnabled(entryId);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
      
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logoText}>Clazify</Text>
          <Text style={styles.subtext}>
            {settingsStore.settings.trainerName 
              ? `Welcome, Prof. ${settingsStore.settings.trainerName}` 
              : 'Setup trainer configuration'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Battery Optimization Banner (Fallback Warning) */}
        {!settingsStore.settings.batteryOptimizationIgnored && (
          <TouchableOpacity 
            style={styles.warningBanner} 
            activeOpacity={0.8}
            onPress={handleExemptBatteryPrompt}
          >
            <View style={styles.warningIndicator} />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Battery Optimization Active</Text>
              <Text style={styles.warningDesc}>Alarms might be delayed or blocked. Tap to resolve.</Text>
            </View>
            <Text style={styles.warningAction}>➔</Text>
          </TouchableOpacity>
        )}

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

        {/* Timetable Overview Quick Actions */}
        {settingsStore.settings.trainerName && (
          <View style={styles.actionRow}>
            <Text style={styles.sectionTitle}>Schedules</Text>
            <TouchableOpacity 
              style={styles.importLink}
              onPress={() => navigation.navigate('PDFImport')}
            >
              <Text style={styles.importLinkText}>+ Import PDF</Text>
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
              const hasClasses = timetableStore.entries.some(e => e.dayOfWeek === day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[styles.tab, isActive && styles.activeTab]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                    {day.substring(0, 3)}
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
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No classes scheduled for {selectedDay}</Text>
              </View>
            ) : (
              dailyLectures.map((lecture) => {
                const ongoing = isClassOngoing(lecture.startTime, lecture.endTime);
                // Hardcoded hash mapping for mock ringing check
                const isRinging = alarmStore.activeAlarmId === `alarm_${lecture.id}`;

                return (
                  <View 
                    key={lecture.id} 
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
                      <View>
                        <Text style={styles.subjectText}>{lecture.subject}</Text>
                        <Text style={styles.batchText}>
                          {lecture.batch} {lecture.groupName ? `• ${lecture.groupName}` : ''}
                        </Text>
                      </View>
                      
                      {/* Alarm Status Toggle */}
                      <TouchableOpacity 
                        style={styles.alarmToggle}
                        onPress={() => handleToggleAlarm(lecture.id)}
                      >
                        <Text style={[
                          styles.alarmIcon,
                          lecture.alarmEnabled ? styles.alarmIconEnabled : styles.alarmIconDisabled
                        ]}>
                          {lecture.alarmEnabled ? '🔔' : '🔕'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Card Footer Details */}
                    <View style={styles.cardFooter}>
                      <View style={styles.footerItem}>
                        <Text style={styles.footerLabel}>ROOM</Text>
                        <Text style={styles.footerValue}>{lecture.roomCode}</Text>
                      </View>
                      <View style={styles.footerItem}>
                        <Text style={styles.footerLabel}>TIME</Text>
                        <Text style={styles.footerValue}>{lecture.startTime} - {lecture.endTime}</Text>
                      </View>
                      {ongoing && (
                        <View style={styles.ongoingBadge}>
                          <Text style={styles.ongoingBadgeText}>ONGOING</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Daily Stats Summary */}
        {settingsStore.settings.trainerName && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Attendance Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{attendanceStore.records.length}</Text>
                <Text style={styles.statLabel}>Lectures Marked</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>
                  {attendanceStore.records.length > 0 
                    ? `${Math.round((attendanceStore.records.reduce((acc, curr) => acc + (curr.presentCount / curr.totalCount), 0) / attendanceStore.records.length) * 100)}%`
                    : 'N/A'}
                </Text>
                <Text style={styles.statLabel}>Avg Attendance</Text>
              </View>
            </View>
          </View>
        )}
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: Theme.colors.secondary,
    fontFamily: 'Manrope',
    letterSpacing: -0.5,
  },
  subtext: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    marginTop: 2,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Theme.colors.surfaceContainer,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  settingsIcon: {
    fontSize: 20,
    color: Theme.colors.text,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 224, 130, 0.1)',
    borderRadius: Theme.colors.lg,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 224, 130, 0.2)',
  },
  warningIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.warning,
    marginRight: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    color: Theme.colors.warning,
    fontWeight: '700',
    fontSize: 14,
  },
  warningDesc: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  warningAction: {
    color: Theme.colors.warning,
    fontSize: 16,
  },
  onboardingCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.colors.xl,
    padding: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  onboardingTitle: {
    color: Theme.colors.secondary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  onboardingDesc: {
    color: Theme.colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  onboardingButton: {
    backgroundColor: Theme.colors.electricBlue,
    borderRadius: Theme.colors.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  onboardingButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  importLink: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: Theme.colors.sm,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
  },
  importLinkText: {
    color: Theme.colors.secondary,
    fontWeight: '700',
    fontSize: 12,
  },
  tabContainer: {
    marginBottom: 16,
  },
  tabContent: {
    paddingVertical: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Theme.colors.md,
    backgroundColor: Theme.colors.surfaceContainer,
    marginRight: 10,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  activeTab: {
    backgroundColor: Theme.colors.electricBlue,
    borderColor: Theme.colors.electricBlue,
  },
  tabText: {
    color: Theme.colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.textMuted,
    position: 'absolute',
    bottom: 4,
  },
  activeDot: {
    backgroundColor: '#ffffff',
  },
  lectureList: {
    marginBottom: 24,
  },
  emptyCard: {
    backgroundColor: Theme.colors.surfaceVariant,
    padding: 24,
    borderRadius: Theme.colors.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    fontSize: 14,
  },
  lectureCard: {
    backgroundColor: Theme.colors.surfaceVariant,
    borderRadius: Theme.colors.xl,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  ongoingCardBorder: {
    borderColor: Theme.colors.secondary,
    borderWidth: 1.5,
  },
  ringingCardBorder: {
    borderColor: Theme.colors.error,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subjectText: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.text,
  },
  batchText: {
    color: Theme.colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  alarmToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmIcon: {
    fontSize: 16,
  },
  alarmIconEnabled: {
    opacity: 1.0,
  },
  alarmIconDisabled: {
    opacity: 0.3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: Theme.colors.border,
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    color: Theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  footerValue: {
    color: Theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  ongoingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.colors.sm,
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
  },
  ongoingBadgeText: {
    color: Theme.colors.secondary,
    fontSize: 10,
    fontWeight: '800',
  },
  ringingOverlay: {
    backgroundColor: 'rgba(239, 83, 80, 0.15)',
    margin: -20,
    marginBottom: 16,
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.error,
  },
  ringingText: {
    color: Theme.colors.error,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  ringingActions: {
    flexDirection: 'row',
  },
  ringingButtonDismiss: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Theme.colors.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ringingButtonMark: {
    backgroundColor: Theme.colors.error,
    borderRadius: Theme.colors.md,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  ringingButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  statsCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.colors.xl,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statsTitle: {
    color: Theme.colors.text,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainer,
    borderRadius: Theme.colors.md,
    paddingVertical: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statNum: {
    color: Theme.colors.secondary,
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    color: Theme.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
