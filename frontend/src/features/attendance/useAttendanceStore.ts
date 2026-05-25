import { create } from 'zustand';
import { AttendanceRecord, AttendanceRepository } from '../../database/repositories/repositories';
import axios from 'axios';
import { useSettingsStore } from '../settings/useSettingsStore';

// Backend URL is retrieved dynamically from useSettingsStore

interface AttendanceState {
  records: AttendanceRecord[];
  loading: boolean;
  loadRecords: () => Promise<void>;
  fetchStudentStrength: (batch: string, group?: string, subject?: string) => Promise<number>;
  markAttendance: (batch: string, group: string | undefined, subject: string, date: string, presentCount: number, totalCount: number) => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: [],
  loading: false,

  loadRecords: async () => {
    set({ loading: true });
    try {
      const records = await AttendanceRepository.getRecords();
      set({ records, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },

  fetchStudentStrength: async (batch, group, subject) => {
    try {
      const backendUrl = useSettingsStore.getState().settings.backendUrl || 'https://clazify.netlify.app';
      const response = await axios.get(`${backendUrl}/api/v1/student-strength`, {
        params: { batch, group, subject },
      });
      return response.data.totalStudents;
    } catch (e) {
      console.error('Failed to fetch student strength from backend:', e);
      return 60; // Safe default fallback
    }
  },

  markAttendance: async (batch, group, subject, date, presentCount, totalCount) => {
    set({ loading: true });
    try {
      const newRecord: AttendanceRecord = {
        id: `att_${Date.now()}`,
        batch,
        groupName: group || undefined,
        subject,
        date,
        presentCount,
        totalCount,
        createdAt: new Date().toISOString(),
      };
      await AttendanceRepository.addRecord(newRecord);
      await get().loadRecords();
    } catch (e) {
      console.error('Failed to mark attendance:', e);
      set({ loading: false });
    }
  },
}));
