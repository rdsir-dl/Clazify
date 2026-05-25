package com.clazify.timetable.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val alarmId = intent.getStringExtra("ALARM_ID") ?: return
        Log.d("AlarmReceiver", "Received alarm trigger broadcast for ID: $alarmId")

        val serviceIntent = Intent(context, AlarmForegroundService::class.java).apply {
            putExtra("ALARM_ID", alarmId)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent)
        } else {
            context.startService(serviceIntent)
        }
    }
}
