import { getDBConnection } from '../sqlite/db';

export interface TimetableEntry {
  id: string;
  subject: string;
  roomCode: string;
  batch: string;
  groupName?: string;
  dayOfWeek: string; // e.g., 'Monday'
  startTime: string; // 'HH:mm'
  endTime: string; // 'HH:mm'
  lectureNumber?: number;
  alarmEnabled: boolean;
}

export interface AttendanceRecord {
  id: string;
  batch: string;
  groupName?: string;
  subject: string;
  date: string; // 'YYYY-MM-DD'
  presentCount: number;
  totalCount: number;
  createdAt: string;
}

export interface AppSettings {
  trainerName: string;
  leadTimeNormal: number;
  leadTimeConsecutive: number;
  autoStopSeconds: number;
  batteryOptimizationIgnored: boolean;
  backendUrl: string;
  lastSyncAt?: string;
}

export interface ScheduledAlarm {
  id: string;
  lectureId: string;
  triggerTimestamp: number; // unix epoch millis
  status: 'scheduled' | 'fired' | 'cancelled';
  nativeAlarmId: number;
  createdAt: string;
}

export class TimetableRepository {
  static async saveEntries(entries: Omit<TimetableEntry, 'alarmEnabled'>[]): Promise<void> {
    const db = await getDBConnection();
    await db.transaction((tx: any) => {
      tx.executeSql('DELETE FROM timetable_entries;');
      const now = new Date().toISOString();
      entries.forEach(entry => {
        tx.executeSql(
          `INSERT INTO timetable_entries (id, subject, room_code, batch, group_name, day_of_week, start_time, end_time, lecture_number, alarm_enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
          [
            entry.id,
            entry.subject,
            entry.roomCode,
            entry.batch,
            entry.groupName || null,
            entry.dayOfWeek,
            entry.startTime,
            entry.endTime,
            entry.lectureNumber || null,
            now,
            now,
          ]
        );
      });
    });
  }

  static async getEntries(): Promise<TimetableEntry[]> {
    const db = await getDBConnection();
    const results = await db.executeSql('SELECT * FROM timetable_entries ORDER BY day_of_week, start_time;');
    const entries: TimetableEntry[] = [];
    const len = results[0].rows.length;
    for (let i = 0; i < len; i++) {
      const row = results[0].rows.item(i);
      entries.push({
        id: row.id,
        subject: row.subject,
        roomCode: row.room_code,
        batch: row.batch,
        groupName: row.group_name || undefined,
        dayOfWeek: row.day_of_week,
        startTime: row.start_time,
        endTime: row.end_time,
        lectureNumber: row.lecture_number || undefined,
        alarmEnabled: row.alarm_enabled === 1,
      });
    }
    return entries;
  }

  static async updateAlarmStatus(id: string, enabled: boolean): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('UPDATE timetable_entries SET alarm_enabled = ?, updated_at = ? WHERE id = ?;', [
      enabled ? 1 : 0,
      new Date().toISOString(),
      id,
    ]);
  }
}

export class AttendanceRepository {
  static async addRecord(record: AttendanceRecord): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      `INSERT INTO attendance_records (id, batch, group_name, subject, date, present_count, total_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        record.id,
        record.batch,
        record.groupName || null,
        record.subject,
        record.date,
        record.presentCount,
        record.totalCount,
        record.createdAt,
      ]
    );
  }

  static async getRecords(): Promise<AttendanceRecord[]> {
    const db = await getDBConnection();
    const results = await db.executeSql('SELECT * FROM attendance_records ORDER BY date DESC, created_at DESC;');
    const records: AttendanceRecord[] = [];
    const len = results[0].rows.length;
    for (let i = 0; i < len; i++) {
      const row = results[0].rows.item(i);
      records.push({
        id: row.id,
        batch: row.batch,
        groupName: row.group_name || undefined,
        subject: row.subject,
        date: row.date,
        presentCount: row.present_count,
        totalCount: row.total_count,
        createdAt: row.created_at,
      });
    }
    return records;
  }
}

export class SettingsRepository {
  static async getSettings(): Promise<AppSettings> {
    const db = await getDBConnection();
    const results = await db.executeSql('SELECT * FROM app_settings WHERE id = 1;');
    if (results[0].rows.length > 0) {
      const row = results[0].rows.item(0);
      return {
        trainerName: row.trainer_name,
        leadTimeNormal: row.lead_time_normal,
        leadTimeConsecutive: row.lead_time_consecutive,
        autoStopSeconds: row.auto_stop_seconds,
        batteryOptimizationIgnored: row.battery_optimization_ignored === 1,
        backendUrl: row.backend_url || 'https://clazify.netlify.app',
        lastSyncAt: row.last_sync_at || undefined,
      };
    }
    return {
      trainerName: '',
      leadTimeNormal: 10,
      leadTimeConsecutive: 5,
      autoStopSeconds: 30,
      batteryOptimizationIgnored: false,
      backendUrl: 'https://clazify.netlify.app',
    };
  }

  static async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    const db = await getDBConnection();
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await db.executeSql(
      `UPDATE app_settings 
       SET trainer_name = ?, lead_time_normal = ?, lead_time_consecutive = ?, auto_stop_seconds = ?, battery_optimization_ignored = ?, backend_url = ?, last_sync_at = ?
       WHERE id = 1;`,
      [
        updated.trainerName,
        updated.leadTimeNormal,
        updated.leadTimeConsecutive,
        updated.autoStopSeconds,
        updated.batteryOptimizationIgnored ? 1 : 0,
        updated.backendUrl,
        updated.lastSyncAt || null,
      ]
    );
  }
}

export class AlarmRepository {
  static async saveAlarm(alarm: ScheduledAlarm): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql(
      `INSERT OR REPLACE INTO scheduled_alarms (id, lecture_id, trigger_timestamp, status, native_alarm_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        alarm.id,
        alarm.lectureId,
        alarm.triggerTimestamp,
        alarm.status,
        alarm.nativeAlarmId,
        alarm.createdAt,
      ]
    );
  }

  static async getScheduledAlarms(): Promise<ScheduledAlarm[]> {
    const db = await getDBConnection();
    const results = await db.executeSql('SELECT * FROM scheduled_alarms ORDER BY trigger_timestamp ASC;');
    const alarms: ScheduledAlarm[] = [];
    const len = results[0].rows.length;
    for (let i = 0; i < len; i++) {
      const row = results[0].rows.item(i);
      alarms.push({
        id: row.id,
        lectureId: row.lecture_id,
        triggerTimestamp: row.trigger_timestamp,
        status: row.status as any,
        nativeAlarmId: row.native_alarm_id,
        createdAt: row.created_at,
      });
    }
    return alarms;
  }

  static async updateAlarmStatus(id: string, status: 'scheduled' | 'fired' | 'cancelled'): Promise<void> {
    const db = await getDBConnection();
    await db.executeSql('UPDATE scheduled_alarms SET status = ? WHERE id = ?;', [status, id]);
  }
}
