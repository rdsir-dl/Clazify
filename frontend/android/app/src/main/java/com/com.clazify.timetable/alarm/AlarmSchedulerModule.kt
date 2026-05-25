package com.clazify.timetable.alarm

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import com.clazify.timetable.MainActivity
import com.facebook.react.bridge.*

class AlarmSchedulerModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AlarmSchedulerModule"
    }

    @ReactMethod
    fun scheduleAlarm(id: String, timestamp: Double, promise: Promise) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager

            // Check if exact alarm permission is granted (for Android 12+)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (!alarmManager.canScheduleExactAlarms()) {
                    promise.reject("PERMISSION_DENIED", "Exact alarm permission not granted")
                    return
                }
            }

            // Intent triggered when alarm goes off
            val alarmIntent = Intent(reactContext, AlarmReceiver::class.java).apply {
                action = "com.clazify.timetable.alarm.ACTION_TRIGGER"
                putExtra("ALARM_ID", id)
            }

            val pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                id.hashCode(),
                alarmIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Intent triggered when user clicks the alarm icon in status bar
            val showIntent = Intent(reactContext, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            }
            val showPendingIntent = PendingIntent.getActivity(
                reactContext,
                id.hashCode(),
                showIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            // Use setAlarmClock for maximum native reliability and visual status indicator
            val alarmClockInfo = AlarmManager.AlarmClockInfo(timestamp.toLong(), showPendingIntent)
            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent)

            Log.d("AlarmSchedulerModule", "Successfully scheduled alarm clock for ID: $id at timestamp: $timestamp")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("AlarmSchedulerModule", "Failed to schedule alarm: ${e.message}")
            promise.reject("SCHEDULING_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun cancelAlarm(id: String, promise: Promise) {
        try {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            val alarmIntent = Intent(reactContext, AlarmReceiver::class.java).apply {
                action = "com.clazify.timetable.alarm.ACTION_TRIGGER"
            }

            val pendingIntent = PendingIntent.getBroadcast(
                reactContext,
                id.hashCode(),
                alarmIntent,
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )

            if (pendingIntent != null) {
                alarmManager.cancel(pendingIntent)
                pendingIntent.cancel()
                Log.d("AlarmSchedulerModule", "Cancelled alarm ID: $id")
            } else {
                Log.d("AlarmSchedulerModule", "No pending alarm found to cancel for ID: $id")
            }

            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("AlarmSchedulerModule", "Failed to cancel alarm: ${e.message}")
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopAlarm(promise: Promise) {
        try {
            val serviceIntent = Intent(reactContext, AlarmForegroundService::class.java)
            reactContext.stopService(serviceIntent)
            Log.d("AlarmSchedulerModule", "Stopped alarm service")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e("AlarmSchedulerModule", "Failed to stop alarm service: ${e.message}")
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun checkExactAlarmPermission(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            promise.resolve(alarmManager.canScheduleExactAlarms())
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestExactAlarmPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun checkBatteryOptimizationExemption(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val powerManager = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            promise.resolve(powerManager.isIgnoringBatteryOptimizations(reactContext.packageName))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                data = Uri.parse("package:${reactContext.packageName}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            reactContext.startActivity(intent)
        }
    }

    @ReactMethod
    fun getInitialAlarmTrigger(promise: Promise) {
        val activity = reactContext.currentActivity
        if (activity != null && activity.intent != null) {
            val ringing = activity.intent.getBooleanExtra("RINGING", false)
            val alarmId = activity.intent.getStringExtra("ALARM_ID")
            if (ringing && alarmId != null) {
                val map = Arguments.createMap().apply {
                    putBoolean("ringing", true)
                    putString("alarmId", alarmId)
                }
                promise.resolve(map)
                return
            }
        }
        promise.resolve(null)
    }
}
