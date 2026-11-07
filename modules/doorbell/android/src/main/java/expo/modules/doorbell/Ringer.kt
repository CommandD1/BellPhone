package expo.modules.doorbell

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Plays the doorbell as loud as possible: alarm audio stream (ignores silent mode),
 * volume forced to maximum, vibration, and a full-screen notification that turns
 * the screen on above the lock screen. All state changes run on the main thread.
 */
object Ringer {
  private const val TAG = "Doorbell"
  const val RING_CHANNEL_ID = "doorbell_ring"
  const val RING_NOTIFICATION_ID = 4445

  /** How long one ring lasts if nobody presses "Stopp". */
  private const val RING_DURATION_MS = 30_000L

  /** Further signals right after a ring ended are ignored (the ESP32 may repeat its packet). */
  private const val COOLDOWN_MS = 10_000L

  private val handler = Handler(Looper.getMainLooper())
  private var appContext: Context? = null
  private var player: MediaPlayer? = null
  private var vibrator: Vibrator? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var previousAlarmVolume: Int? = null
  private var lastStopAt = 0L

  @Volatile
  var isRinging = false
    private set

  /** Set by the JS module to forward events ("onRing", "onRingStop"). */
  @Volatile
  var listener: ((String, Map<String, Any?>) -> Unit)? = null

  private val autoStop = Runnable { appContext?.let { stopInternal(it) } }

  fun ring(context: Context, source: String, force: Boolean = false) {
    val app = context.applicationContext
    handler.post { startInternal(app, source, force) }
  }

  fun stop(context: Context) {
    val app = context.applicationContext
    handler.post { stopInternal(app) }
  }

  private fun startInternal(app: Context, source: String, force: Boolean) {
    if (isRinging) return
    if (!force && lastStopAt != 0L && SystemClock.elapsedRealtime() - lastStopAt < COOLDOWN_MS) return

    Log.i(TAG, "Ringing (source=$source)")
    appContext = app
    isRinging = true

    acquireWakeLock(app)
    maximizeAlarmVolume(app)
    startSound(app)
    startVibration(app)
    showRingNotification(app)

    handler.postDelayed(autoStop, RING_DURATION_MS)
    listener?.invoke("onRing", mapOf("source" to source))
  }

  private fun stopInternal(app: Context) {
    if (!isRinging) return
    Log.i(TAG, "Ring stopped")
    isRinging = false
    lastStopAt = SystemClock.elapsedRealtime()
    handler.removeCallbacks(autoStop)

    player?.let {
      try { it.stop() } catch (_: Exception) {}
      it.release()
    }
    player = null

    vibrator?.cancel()
    vibrator = null

    restoreAlarmVolume(app)
    app.getSystemService(NotificationManager::class.java)?.cancel(RING_NOTIFICATION_ID)
    RingActivity.finishIfShowing()

    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null

    listener?.invoke("onRingStop", emptyMap())
  }

  private fun acquireWakeLock(app: Context) {
    val pm = app.getSystemService(PowerManager::class.java) ?: return
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Klingelspiel:ring").apply {
      setReferenceCounted(false)
      acquire(RING_DURATION_MS + 5_000L)
    }
  }

  private fun maximizeAlarmVolume(app: Context) {
    val am = app.getSystemService(AudioManager::class.java) ?: return
    try {
      previousAlarmVolume = am.getStreamVolume(AudioManager.STREAM_ALARM)
      am.setStreamVolume(AudioManager.STREAM_ALARM, am.getStreamMaxVolume(AudioManager.STREAM_ALARM), 0)
    } catch (e: Exception) {
      Log.w(TAG, "Could not raise alarm volume", e)
    }
  }

  private fun restoreAlarmVolume(app: Context) {
    val volume = previousAlarmVolume ?: return
    previousAlarmVolume = null
    try {
      app.getSystemService(AudioManager::class.java)?.setStreamVolume(AudioManager.STREAM_ALARM, volume, 0)
    } catch (e: Exception) {
      Log.w(TAG, "Could not restore alarm volume", e)
    }
  }

  private fun startSound(app: Context) {
    val candidates = listOfNotNull(
      Uri.parse("android.resource://${app.packageName}/${R.raw.doorbell}"),
      RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
      RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE),
    )
    val attributes = AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

    for (uri in candidates) {
      val mp = MediaPlayer()
      try {
        mp.setAudioAttributes(attributes)
        mp.setDataSource(app, uri)
        mp.isLooping = true
        mp.prepare()
        mp.start()
        player = mp
        return
      } catch (e: Exception) {
        Log.w(TAG, "Could not play $uri", e)
        mp.release()
      }
    }
  }

  @Suppress("DEPRECATION")
  private fun startVibration(app: Context) {
    val vib = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      app.getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
      app.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    } ?: return
    if (!vib.hasVibrator()) return

    val pattern = longArrayOf(0, 800, 400)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
      vib.vibrate(VibrationEffect.createWaveform(pattern, 0), attrs)
    } else {
      vib.vibrate(pattern, 0)
    }
    vibrator = vib
  }

  fun ensureRingChannel(app: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = app.getSystemService(NotificationManager::class.java) ?: return
    if (nm.getNotificationChannel(RING_CHANNEL_ID) != null) return
    val channel = NotificationChannel(RING_CHANNEL_ID, "Klingel", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "Wird angezeigt, wenn es an der Tür klingelt"
      setSound(null, null) // the sound is played by the MediaPlayer on the alarm stream
      enableVibration(false)
      lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
      setBypassDnd(true)
    }
    nm.createNotificationChannel(channel)
  }

  private fun showRingNotification(app: Context) {
    ensureRingChannel(app)
    val flags = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    val fullScreen = PendingIntent.getActivity(
      app,
      0,
      Intent(app, RingActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_USER_ACTION),
      flags,
    )
    val stop = PendingIntent.getBroadcast(app, 1, Intent(app, StopRingReceiver::class.java), flags)

    val notification = NotificationCompat.Builder(app, RING_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Es klingelt!")
      .setContentText("Jemand steht an der Tür.")
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setAutoCancel(false)
      .setFullScreenIntent(fullScreen, true)
      .setContentIntent(fullScreen)
      .setDeleteIntent(stop)
      .addAction(0, "Stopp", stop)
      .build()

    try {
      app.getSystemService(NotificationManager::class.java)?.notify(RING_NOTIFICATION_ID, notification)
    } catch (e: SecurityException) {
      Log.w(TAG, "Notification permission missing", e)
    }
  }
}
