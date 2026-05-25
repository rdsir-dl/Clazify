import { create } from 'zustand';
import { AppSettings, SettingsRepository } from '../../database/repositories/repositories';
import { AlarmScheduler } from '../../services/native/AlarmScheduler';

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  checkBatteryOptimization: () => Promise<boolean>;
  requestBatteryOptimizationExemption: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: {
    trainerName: '',
    leadTimeNormal: 10,
    leadTimeConsecutive: 5,
    autoStopSeconds: 30,
    batteryOptimizationIgnored: false,
    backendUrl: 'http://10.0.2.2:3000',
  },
  loading: false,

  loadSettings: async () => {
    set({ loading: true });
    try {
      const settings = await SettingsRepository.getSettings();
      const isIgnoring = await AlarmScheduler.checkBatteryOptimizationExemption();
      if (isIgnoring !== settings.batteryOptimizationIgnored) {
        await SettingsRepository.updateSettings({ batteryOptimizationIgnored: isIgnoring });
        settings.batteryOptimizationIgnored = isIgnoring;
      }
      set({ settings, loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
    }
  },

  updateSettings: async (newSettings) => {
    try {
      await SettingsRepository.updateSettings(newSettings);
      set((state) => ({
        settings: { ...state.settings, ...newSettings },
      }));
    } catch (e) {
      console.error(e);
    }
  },

  checkBatteryOptimization: async () => {
    const isIgnoring = await AlarmScheduler.checkBatteryOptimizationExemption();
    if (isIgnoring !== get().settings.batteryOptimizationIgnored) {
      await get().updateSettings({ batteryOptimizationIgnored: isIgnoring });
    }
    return isIgnoring;
  },

  requestBatteryOptimizationExemption: async () => {
    AlarmScheduler.requestBatteryOptimizationExemption();
  },
}));
