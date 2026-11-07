package expo.modules.doorbell

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetSocketAddress
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Foreground service that listens for the UDP doorbell packet, independent of the
 * React Native JS runtime, so it keeps working with the screen off or the app closed.
 */
class DoorbellService : Service() {
  companion object {
    private const val TAG = "Doorbell"
    private const val CHANNEL_ID = "doorbell_service"
    private const val NOTIFICATION_ID = 4444
    private const val PREFS = "doorbell"
    const val DEFAULT_PORT = 4444
    const val DEFAULT_MESSAGE = "ESP32_ALERT"

    @Volatile
    var isRunning = false
      private set

    fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun start(context: Context, port: Int, message: String) {
      prefs(context).edit()
        .putBoolean("enabled", true)
        .putInt("port", port)
        .putString("message", message)
        .apply()
      ContextCompat.startForegroundService(context, Intent(context, DoorbellService::class.java))
    }

    fun stop(context: Context) {
      prefs(context).edit().putBoolean("enabled", false).apply()
      context.stopService(Intent(context, DoorbellService::class.java))
    }

    fun isEnabled(context: Context) = prefs(context).getBoolean("enabled", false)
  }

  private var listener: Listener? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var wifiLock: WifiManager.WifiLock? = null
  private var multicastLock: WifiManager.MulticastLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val prefs = prefs(this)
    val port = prefs.getInt("port", DEFAULT_PORT)
    val message = prefs.getString("message", DEFAULT_MESSAGE) ?: DEFAULT_MESSAGE

    try {
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        buildNotification(port),
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE else 0,
      )
    } catch (e: Exception) {
      Log.e(TAG, "Could not start foreground service", e)
      stopSelf()
      return START_NOT_STICKY
    }

    Ringer.ensureRingChannel(this)
    acquireLocks()

    val current = listener
    if (current == null || current.port != port || current.message != message) {
      current?.stop()
      listener = Listener(port, message).also { it.start() }
    }
    isRunning = true
    return START_STICKY
  }

  override fun onDestroy() {
    isRunning = false
    listener?.stop()
    listener = null
    releaseLocks()
    super.onDestroy()
  }

  /** Keeps CPU and Wi-Fi awake and lets broadcast packets through while the screen is off. */
  @Suppress("DEPRECATION")
  private fun acquireLocks() {
    if (wakeLock == null) {
      wakeLock = getSystemService(PowerManager::class.java)
        ?.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BellPhone:listener")
        ?.apply { setReferenceCounted(false); acquire() }
    }
    val wifi = applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager ?: return
    if (wifiLock == null) {
      wifiLock = wifi.createWifiLock(WifiManager.WIFI_MODE_FULL_HIGH_PERF, "BellPhone:wifi")
        .apply { setReferenceCounted(false); acquire() }
    }
    if (multicastLock == null) {
      multicastLock = wifi.createMulticastLock("BellPhone:multicast")
        .apply { setReferenceCounted(false); acquire() }
    }
  }

  private fun releaseLocks() {
    wakeLock?.let { if (it.isHeld) it.release() }
    wifiLock?.let { if (it.isHeld) it.release() }
    multicastLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    wifiLock = null
    multicastLock = null
  }

  private fun buildNotification(port: Int): android.app.Notification {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(NotificationManager::class.java)
      if (nm?.getNotificationChannel(CHANNEL_ID) == null) {
        nm?.createNotificationChannel(
          NotificationChannel(CHANNEL_ID, "Klingel-Empfang", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Hält den Klingel-Empfang im Hintergrund aktiv"
            setShowBadge(false)
          }
        )
      }
    }
    val openApp = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 2, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Klingel ist aktiv")
      .setContentText("Wartet auf das Klingelsignal (UDP-Port $port)")
      .setOngoing(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setContentIntent(openApp)
      .build()
  }

  private inner class Listener(val port: Int, val message: String) {
    private val running = AtomicBoolean(true)
    @Volatile private var socket: DatagramSocket? = null
    private val thread = Thread(::loop, "DoorbellUdp").apply { isDaemon = true }

    fun start() = thread.start()

    fun stop() {
      running.set(false)
      socket?.close()
      thread.interrupt()
    }

    private fun loop() {
      while (running.get()) {
        try {
          DatagramSocket(null).use { s ->
            socket = s
            s.reuseAddress = true
            s.broadcast = true
            s.bind(InetSocketAddress(port))
            Log.i(TAG, "Listening on UDP port $port")
            val buffer = ByteArray(1024)
            while (running.get()) {
              val packet = DatagramPacket(buffer, buffer.size)
              s.receive(packet)
              val text = String(packet.data, packet.offset, packet.length, Charsets.UTF_8).trim()
              if (text == message) {
                Ringer.ring(this@DoorbellService, packet.address?.hostAddress ?: "unknown")
              }
            }
          }
        } catch (e: Exception) {
          if (!running.get()) break
          Log.w(TAG, "UDP socket error, retrying in 2s", e)
          try { Thread.sleep(2_000) } catch (_: InterruptedException) { break }
        }
      }
    }
  }
}
