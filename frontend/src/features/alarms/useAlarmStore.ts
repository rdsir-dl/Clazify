import { create } from 'zustand';
import { AlarmRepository, ScheduledAlarm, TimetableEntry } from '../../database/repositories/repositories';
import { AlarmScheduler } from '../../services/native/AlarmScheduler';
import { useSettingsStore } from '../settings/useSettingsStore';
import dayjs from 'dayjs';

interface AlarmState {
  alarms: ScheduledAlarm[];
  loading: boolean;
  activeAlarmId: string | null; // Alarm ID currently ringing
  loadAlarms: () => Promise<void>;
  scheduleAlarmForEntry: (entry: TimetableEntry, allEntries: TimetableEntry[]) => Promise<void>;
  cancelAlarmForEntry: (entry: TimetableEntry) => Promise<void>;
  rescheduleAllAlarms: (allEntries: TimetableEntry[]) => Promise<void>;
  dismissRingingAlarm: () => Promise<void>;
  setActiveAlarm: (id: string | null) => void;
}

export const useAlarmStore = create<AlarmState>((set, get) => ({
  alarms: [],
  loading: false,
  activeAlarmId: null,

  loadAlarms: async () => {
    set({ loading: true });
    try {
      const alarms = await AlarmRepository.getScheduledAlarms();
      set({ alarms, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },

  setActiveAlarm: (id) => {
    set({ activeAlarmId: id });
  },

  dismissRingingAlarm: async () => {
    await AlarmScheduler.stopAlarm();
    const activeId = get().activeAlarmId;
    if (activeId) {
      await AlarmRepository.updateAlarmStatus(activeId, 'fired');
      set({ activeAlarmId: null });
      await get().loadAlarms();
    }
  },

  scheduleAlarmForEntry: async (entry, allEntries) => {
    try {
      const settings = useSettingsStore.getState().settings;

      // 1. Calculate lead time
      const isConsecutive = checkIfConsecutive(entry, allEntries);
      const leadTime = isConsecutive ? settings.leadTimeConsecutive : settings.leadTimeNormal;

      // 2. Compute trigger timestamp
      const triggerTimestamp = calculateNextTriggerTime(entry.dayOfWeek, entry.startTime, leadTime, entry.extraDate);

      // If it is an extra lecture and the alarm time has already passed, skip scheduling
      if (entry.isExtra && triggerTimestamp < Date.now()) {
        console.log('Skipping alarm for extra lecture in the past:', entry.id);
        return;
      }

      // 3. Cancel existing alarm first to prevent duplicates
      const alarmId = `alarm_${entry.id}`;
      await AlarmScheduler.cancelAlarm(alarmId);

      // 4. Schedule via native module
      await AlarmScheduler.scheduleAlarm(alarmId, triggerTimestamp);

      // 5. Save to local SQLite
      const alarm: ScheduledAlarm = {
        id: alarmId,
        lectureId: entry.id,
        triggerTimestamp,
        status: 'scheduled',
        nativeAlarmId: alarmId.hashCode(), // Integer helper
        createdAt: new Date().toISOString(),
      };
      await AlarmRepository.saveAlarm(alarm);
      await get().loadAlarms();
    } catch (e) {
      console.error('Failed to schedule alarm for entry:', entry.id, e);
    }
  },

  cancelAlarmForEntry: async (entry) => {
    try {
      const alarmId = `alarm_${entry.id}`;
      await AlarmScheduler.cancelAlarm(alarmId);
      await AlarmRepository.updateAlarmStatus(alarmId, 'cancelled');
      await get().loadAlarms();
    } catch (e) {
      console.error('Failed to cancel alarm for entry:', entry.id, e);
    }
  },

  rescheduleAllAlarms: async (allEntries) => {
    set({ loading: true });
    try {
      const activeEntries = allEntries.filter(e => e.alarmEnabled);
      for (const entry of activeEntries) {
        await get().scheduleAlarmForEntry(entry, allEntries);
      }
      set({ loading: false });
    } catch (e) {
      console.error('Rescheduling error:', e);
      set({ loading: false });
    }
  },
}));

// Helper to hash string to Int for android pending intent request codes
declare global {
  interface String {
    hashCode(): number;
  }
}
String.prototype.hashCode = function(): number {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    const character = this.charCodeAt(i);
    hash = (hash << 5) - hash + character;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

// Check if Class starts < 20 minutes after another class ends on same day
function checkIfConsecutive(target: TimetableEntry, allEntries: TimetableEntry[]): boolean {
  const sameDay = allEntries.filter(e => e.dayOfWeek === target.dayOfWeek && e.id !== target.id);
  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const targetStart = toMins(target.startTime);
  return sameDay.some(e => {
    const end = toMins(e.endTime);
    const gap = targetStart - end;
    return gap >= 0 && gap < 20;
  });
}

// Calculate upcoming timestamp in ms representing: DayOfWeek at (StartTime - LeadTime) or specific extraDate
function calculateNextTriggerTime(dayOfWeek: string, startTime: string, leadTimeMinutes: number, extraDate?: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);

  if (extraDate) {
    // Parse the extraDate 'YYYY-MM-DD'
    const triggerDate = dayjs(extraDate)
      .hour(startHour)
      .minute(startMin)
      .second(0)
      .millisecond(0)
      .subtract(leadTimeMinutes, 'minute');
    return triggerDate.valueOf();
  }

  const daysMap: { [key: string]: number } = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6
  };
  const targetDayNum = daysMap[dayOfWeek];

  let triggerDate = dayjs()
    .hour(startHour)
    .minute(startMin)
    .second(0)
    .millisecond(0)
    .subtract(leadTimeMinutes, 'minute');

  const todayNum = dayjs().day();
  let dayDiff = targetDayNum - todayNum;

  // Adjust days if target day is in the past, or is today but time already passed
  if (dayDiff < 0 || (dayDiff === 0 && dayjs().isAfter(triggerDate))) {
    dayDiff += 7;
  }

  triggerDate = triggerDate.add(dayDiff, 'day');
  return triggerDate.valueOf();
}
