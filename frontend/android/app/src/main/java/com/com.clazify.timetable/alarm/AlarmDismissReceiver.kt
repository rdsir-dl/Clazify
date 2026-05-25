package com.clazify.timetable.alarm

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class AlarmDismissReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        Log.d("AlarmDismissReceiver", "Dismissing alarm service via user notification click")
        val serviceIntent = Intent(context, AlarmForegroundService::class.java)
        context.stopService(serviceIntent)
    }
}
