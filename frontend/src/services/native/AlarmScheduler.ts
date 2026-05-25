import { NativeModules, Platform } from 'react-native';

const { AlarmSchedulerModule } = NativeModules;

export interface IAlarmScheduler {
  scheduleAlarm(id: string, timestamp: number): Promise<boolean>;
  cancelAlarm(id: string): Promise<boolean>;
  stopAlarm(): Promise<boolean>;
  checkExactAlarmPermission(): Promise<boolean>;
  requestExactAlarmPermission(): void;
  checkBatteryOptimizationExemption(): Promise<boolean>;
  requestBatteryOptimizationExemption(): void;
  getInitialAlarmTrigger(): Promise<{ ringing: boolean; alarmId: string } | null>;
}

const mockAlarmScheduler: IAlarmScheduler = {
  scheduleAlarm: async (id, timestamp) => {
    console.log(`[MOCK] Schedule alarm ID: ${id} at ${new Date(timestamp).toLocaleString()}`);
    return true;
  },
  cancelAlarm: async (id) => {
    console.log(`[MOCK] Cancel alarm ID: ${id}`);
    return true;
  },
  stopAlarm: async () => {
    console.log(`[MOCK] Stop alarm`);
    return true;
  },
  checkExactAlarmPermission: async () => {
    console.log('[MOCK] Check exact alarm permission: true');
    return true;
  },
  requestExactAlarmPermission: () => {
    console.log('[MOCK] Request exact alarm permission');
  },
  checkBatteryOptimizationExemption: async () => {
    console.log('[MOCK] Check battery optimization: true');
    return true;
  },
  requestBatteryOptimizationExemption: () => {
    console.log('[MOCK] Request battery optimization exemption');
  },
  getInitialAlarmTrigger: async () => {
    console.log('[MOCK] Get initial alarm trigger: null');
    return null;
  },
};

export const AlarmScheduler: IAlarmScheduler = 
  Platform.OS === 'android' && AlarmSchedulerModule
    ? AlarmSchedulerModule
    : mockAlarmScheduler;
