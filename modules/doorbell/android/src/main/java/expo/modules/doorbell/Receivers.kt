package expo.modules.doorbell

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

/** "Stopp" button / swipe-away of the ring notification. */
class StopRingReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    Ringer.stop(context)
  }
}

/** Restarts the listener after a reboot or app update if it was switched on. */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
    if (!DoorbellService.isEnabled(context)) return
    try {
      ContextCompat.startForegroundService(context, Intent(context, DoorbellService::class.java))
    } catch (e: Exception) {
      Log.w("Doorbell", "Could not restart listener after boot", e)
    }
  }
}
