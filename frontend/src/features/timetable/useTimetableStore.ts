import { create } from 'zustand';
import { TimetableEntry, TimetableRepository } from '../../database/repositories/repositories';
import { useAlarmStore } from '../alarms/useAlarmStore';
import { useSettingsStore } from '../settings/useSettingsStore';
import axios from 'axios';

// Backend URL is retrieved dynamically from useSettingsStore

interface TimetableState {
  entries: TimetableEntry[];
  loading: boolean;
  loadTimetable: () => Promise<void>;
  toggleAlarmEnabled: (entryId: string) => Promise<void>;
  uploadTimetablePdf: (fileUri: string, fileName: string) => Promise<boolean>;
  clearTimetable: () => Promise<void>;
  updateTotalStudents: (subject: string, batch: string, groupName: string | undefined, totalStudents: number) => Promise<void>;
  addExtraLecture: (entry: Omit<TimetableEntry, 'alarmEnabled'>) => Promise<boolean>;
}

export const useTimetableStore = create<TimetableState>((set, get) => ({
  entries: [],
  loading: false,

  loadTimetable: async () => {
    set({ loading: true });
    try {
      const entries = await TimetableRepository.getEntries();
      set({ entries, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },

  toggleAlarmEnabled: async (entryId) => {
    try {
      const entryIndex = get().entries.findIndex((e) => e.id === entryId);
      if (entryIndex === -1) return;

      const entry = get().entries[entryIndex];
      const newEnabledState = !entry.alarmEnabled;

      // Update database
      await TimetableRepository.updateAlarmStatus(entryId, newEnabledState);

      // Mutate local state
      const updatedEntries = [...get().entries];
      updatedEntries[entryIndex] = { ...entry, alarmEnabled: newEnabledState };
      set({ entries: updatedEntries });

      // Native module update: Schedule or cancel
      const alarmStore = useAlarmStore.getState();
      if (newEnabledState) {
        await alarmStore.scheduleAlarmForEntry(updatedEntries[entryIndex], updatedEntries);
      } else {
        await alarmStore.cancelAlarmForEntry(entry);
      }
    } catch (e) {
      console.error('Failed to toggle alarm status:', e);
    }
  },

  uploadTimetablePdf: async (fileUri, fileName) => {
    set({ loading: true });
    try {
      const settings = useSettingsStore.getState().settings;
      const trainerName = settings.trainerName;
      const backendUrl = settings.backendUrl || 'https://clazify.netlify.app';
      if (!trainerName) {
        throw new Error('Trainer name is required in settings before uploading.');
      }

      // Build Multipart FormData
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'application/pdf',
        name: fileName || 'timetable.pdf',
      } as any);
      formData.append('trainerName', trainerName);

      console.log(`Uploading PDF to ${backendUrl}/api/v1/timetable/upload for trainer: ${trainerName}`);
      const response = await axios.post(`${backendUrl}/api/v1/timetable/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const parsedLectures = response.data.lectures;
      
      if (!parsedLectures || parsedLectures.length === 0) {
        console.warn('No matching lectures found for this trainer on the uploaded PDF');
        set({ loading: false });
        return false;
      }

      // Map parsed response to SQLite entries
      const mappedEntries = parsedLectures.map((lecture: any, index: number) => ({
        id: `lecture_${Date.now()}_${index}`,
        subject: lecture.subject,
        roomCode: lecture.room,
        batch: lecture.batch,
        groupName: lecture.group || undefined,
        dayOfWeek: lecture.day,
        startTime: lecture.startTime,
        endTime: lecture.endTime,
        lectureNumber: index + 1,
      }));

      // Save to SQLite
      await TimetableRepository.saveEntries(mappedEntries);
      await get().loadTimetable();

      // Trigger automatic alarm rescheduling for new entries
      const alarmStore = useAlarmStore.getState();
      await alarmStore.rescheduleAllAlarms(get().entries);

      set({ loading: false });
      return true;
    } catch (e) {
      console.error('Failed to upload/parse PDF:', e);
      set({ loading: false });
      throw e;
    }
  },

  clearTimetable: async () => {
    set({ loading: true });
    try {
      // Cancel all scheduled alarms
      const alarmStore = useAlarmStore.getState();
      for (const entry of get().entries) {
        await alarmStore.cancelAlarmForEntry(entry);
      }

      await TimetableRepository.saveEntries([]);
      set({ entries: [], loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },

  updateTotalStudents: async (subject, batch, groupName, totalStudents) => {
    try {
      await TimetableRepository.updateTotalStudents(subject, batch, groupName, totalStudents);
      await get().loadTimetable();
    } catch (e) {
      console.error('Failed to update total students:', e);
    }
  },

  addExtraLecture: async (lecture) => {
    set({ loading: true });
    try {
      const newEntry: TimetableEntry = {
        ...lecture,
        alarmEnabled: true,
      };
      await TimetableRepository.addExtraLecture(newEntry);
      await get().loadTimetable();
      
      // Schedule alarm for the extra lecture
      const alarmStore = useAlarmStore.getState();
      await alarmStore.scheduleAlarmForEntry(newEntry, get().entries);
      
      set({ loading: false });
      return true;
    } catch (e) {
      console.error('Failed to add extra lecture:', e);
      set({ loading: false });
      return false;
    }
  },
}));
