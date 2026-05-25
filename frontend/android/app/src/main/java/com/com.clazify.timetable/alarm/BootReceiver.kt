package com.clazify.timetable.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.database.sqlite.SQLiteDatabase
import android.util.Log
import com.clazify.timetable.MainActivity
import java.io.File

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.d("BootReceiver", "Device reboot detected. Rescheduling alarms...")
            rescheduleAllAlarms(context)
        }
    }

    private fun rescheduleAllAlarms(context: Context) {
        // Path to the React Native sqlite storage database
        val dbFile = context.getDatabasePath("clazify.db")
        if (!dbFile.exists()) {
            Log.d("BootReceiver", "Database file clazify.db does not exist yet. No alarms to reschedule.")
            return
        }

        var database: SQLiteDatabase? = null
        try {
            database = SQLiteDatabase.openDatabase(dbFile.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
            
            // Query scheduled alarms that are in the future
            val currentTime = System.currentTimeMillis()
            val cursor = database.rawQuery(
                "SELECT id, trigger_timestamp FROM scheduled_alarms WHERE status = 'scheduled' AND trigger_timestamp > ?",
                arrayOf(currentTime.toString())
            )

            val idIndex = cursor.getColumnIndex("id")
            val timestampIndex = cursor.getColumnIndex("trigger_timestamp")

            val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            var count = 0

            while (cursor.moveToNext()) {
                if (idIndex != -1 && timestampIndex != -1) {
                    val id = cursor.getString(idIndex)
                    val timestamp = cursor.getDouble(timestampIndex) // trigger_timestamp in milliseconds
                    
                    // Reschedule using exact alarm manager clock
                    val alarmIntent = Intent(context, AlarmReceiver::class.java).apply {
                        action = "com.clazify.timetable.alarm.ACTION_TRIGGER"
                        putExtra("ALARM_ID", id)
                    }
                    val pendingIntent = PendingIntent.getBroadcast(
                        context,
                        id.hashCode(),
                        alarmIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    val showIntent = Intent(context, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    }
                    val showPendingIntent = PendingIntent.getActivity(
                        context,
                        id.hashCode(),
                        showIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    val alarmClockInfo = AlarmManager.AlarmClockInfo(timestamp.toLong(), showPendingIntent)
                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)
                    
                    Log.d("BootReceiver", "Rescheduled alarm ID: $id at $timestamp")
                    count++
                }
            }
            cursor.close()
            Log.d("BootReceiver", "Successfully rescheduled $count alarms after reboot.")
        } catch (e: Exception) {
            Log.e("BootReceiver", "Error while rescheduling alarms: ${e.message}")
        } finally {
            database?.close()
        }
    }
}
