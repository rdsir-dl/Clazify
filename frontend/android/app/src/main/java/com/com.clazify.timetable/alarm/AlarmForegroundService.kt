package com.clazify.timetable.alarm

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.*
import android.util.Log
import androidx.core.app.NotificationCompat
import com.clazify.timetable.MainActivity

class AlarmForegroundService : Service() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val handler = Handler(Looper.getMainLooper())

    private val CHANNEL_ID = "clazify_alarm_channel"
    private val NOTIFICATION_ID = 2026

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }

    override fun onCreate() {
        super.onCreate()
        Log.d("AlarmForegroundService", "Service onCreate")
        
        // 1. Acquire WakeLock to keep CPU awake
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Clazify::AlarmWakeLock").apply {
            acquire(35000) // Acquire with timeout of 35 seconds to prevent leak
        }

        // 2. Register Notification Channel for Oreo+
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val alarmId = intent?.getStringExtra("ALARM_ID") ?: "UNKNOWN"
        Log.d("AlarmForegroundService", "Service onStartCommand for Alarm ID: $alarmId")

        // 3. Build Full-Screen Intent to display over lock screen
        val fullScreenIntent = Intent(this, MainActivity::class.java).apply {
            this.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("RINGING", true)
            putExtra("ALARM_ID", alarmId)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            alarmId.hashCode(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 4. Build Dismiss Intent
        val dismissIntent = Intent(this, AlarmDismissReceiver::class.java)
        val dismissPendingIntent = PendingIntent.getBroadcast(
            this,
            alarmId.hashCode(),
            dismissIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // 5. Create Notification Builder
        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("Clazify Class Reminder")
            .setContentText("Your scheduled class starts soon!")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Dismiss", dismissPendingIntent)
            .setAutoCancel(false)
            .setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)

        // 6. Start Foreground Service
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notificationBuilder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notificationBuilder.build())
        }

        // 7. Start playing sound
        playRingtone()

        // 8. Start vibration
        startVibration()

        // 9. Auto-stop after 30 seconds to prevent battery drain
        handler.postDelayed({
            Log.d("AlarmForegroundService", "Auto-stopping alarm after 30 seconds")
            stopSelf()
        }, 30000)

        return START_NOT_STICKY
    }

    private fun playRingtone() {
        try {
            val alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            mediaPlayer = MediaPlayer().apply {
                setDataSource(this@AlarmForegroundService, alarmUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }
            Log.d("AlarmForegroundService", "Ringtone playing started")
        } catch (e: Exception) {
            Log.e("AlarmForegroundService", "Failed to play ringtone: ${e.message}")
        }
    }

    private fun startVibration() {
        try {
            val pattern = longArrayOf(0, 500, 500, 500)
            vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
            Log.d("AlarmForegroundService", "Vibration started")
        } catch (e: Exception) {
            Log.e("AlarmForegroundService", "Failed to start vibration: ${e.message}")
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Class Alarm Notifications"
            val descriptionText = "Channel for ringing timetable alarms"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                enableVibration(true)
                setBypassDnd(true)
            }
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onCreate()
        handler.removeCallbacksAndMessages(null)

        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
        } catch (e: Exception) {
            Log.e("AlarmForegroundService", "Error stopping media player: ${e.message}")
        }

        try {
            vibrator?.cancel()
        } catch (e: Exception) {
            Log.e("AlarmForegroundService", "Error stopping vibrator: ${e.message}")
        }

        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }

        Log.d("AlarmForegroundService", "Service onDestroy completed")
    }
}
