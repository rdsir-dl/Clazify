import SQLite from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDBConnection(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  
  const db = await SQLite.openDatabase({
    name: 'clazify.db',
    location: 'default',
  });
  
  dbInstance = db;
  return db;
}

export async function initDatabase(): Promise<void> {
  const db = await getDBConnection();
  
  // 1. Create timetable_entries table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS timetable_entries (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      room_code TEXT NOT NULL,
      batch TEXT NOT NULL,
      group_name TEXT,
      day_of_week TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      lecture_number INTEGER,
      alarm_enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  
  // 2. Create attendance_records table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      batch TEXT NOT NULL,
      group_name TEXT,
      subject TEXT NOT NULL,
      date TEXT NOT NULL,
      present_count INTEGER NOT NULL,
      total_count INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  
  // 3. Create app_settings table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      trainer_name TEXT NOT NULL,
      lead_time_normal INTEGER DEFAULT 10,
      lead_time_consecutive INTEGER DEFAULT 5,
      auto_stop_seconds INTEGER DEFAULT 30,
      battery_optimization_ignored INTEGER DEFAULT 0,
      last_sync_at TEXT,
      backend_url TEXT DEFAULT 'https://clazify.netlify.app',
      theme_mode TEXT DEFAULT 'dark'
    );
  `);
  
  try {
    await db.executeSql("ALTER TABLE app_settings ADD COLUMN backend_url TEXT DEFAULT 'https://clazify.netlify.app';");
  } catch (e) {
    // Column might already exist, ignore error
  }

  try {
    await db.executeSql("ALTER TABLE app_settings ADD COLUMN theme_mode TEXT DEFAULT 'dark';");
  } catch (e) {
    // Column might already exist, ignore error
  }

  // Migration: Add total_students, is_extra, and extra_date to timetable_entries
  try {
    await db.executeSql("ALTER TABLE timetable_entries ADD COLUMN total_students INTEGER DEFAULT 60;");
  } catch (e) {
    // ignore
  }

  try {
    await db.executeSql("ALTER TABLE timetable_entries ADD COLUMN is_extra INTEGER DEFAULT 0;");
  } catch (e) {
    // ignore
  }

  try {
    await db.executeSql("ALTER TABLE timetable_entries ADD COLUMN extra_date TEXT;");
  } catch (e) {
    // ignore
  }
  
  // Seed default app_settings if not exists
  const settingsCountResult = await db.executeSql('SELECT COUNT(*) as count FROM app_settings;');
  if (settingsCountResult[0].rows.item(0).count === 0) {
    await db.executeSql(`
      INSERT INTO app_settings (id, trainer_name, lead_time_normal, lead_time_consecutive, auto_stop_seconds, battery_optimization_ignored, backend_url, theme_mode)
      VALUES (1, '', 10, 5, 30, 0, 'https://clazify.netlify.app', 'dark');
    `);
  }

  // 4. Create scheduled_alarms table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS scheduled_alarms (
      id TEXT PRIMARY KEY,
      lecture_id TEXT NOT NULL,
      trigger_timestamp REAL NOT NULL,
      status TEXT NOT NULL, -- 'scheduled', 'fired', 'cancelled'
      native_alarm_id INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}
