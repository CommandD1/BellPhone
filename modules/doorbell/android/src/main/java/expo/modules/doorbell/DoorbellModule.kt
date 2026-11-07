package expo.modules.doorbell

import android.annotation.SuppressLint
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DoorbellModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("Doorbell")

    Events("onRing", "onRingStop", "onPreviewEnd")

    OnCreate {
      Ringer.listener = { name, body -> sendEvent(name, body) }
    }

    OnDestroy {
      Ringer.listener = null
    }

    AsyncFunction("startListening") { port: Int, message: String ->
      DoorbellService.start(context, port, message)
    }

    AsyncFunction("stopListening") {
      DoorbellService.stop(context)
    }

    Function("isListening") {
      DoorbellService.isRunning
    }

    Function("isEnabled") {
      DoorbellService.isEnabled(context)
    }

    Function("isRinging") {
      Ringer.isRinging
    }

    AsyncFunction("testRing") {
      Ringer.ring(context, "test", force = true)
    }

    AsyncFunction("stopRinging") {
      Ringer.stop(context)
    }

    Function("getRingtones") {
      Ringtones.all().map { it.first }
    }

    Function("getSelectedRingtone") {
      Ringtones.selected(context)
    }

    Function("setSelectedRingtone") { id: String ->
      Ringtones.select(context, id)
    }

    AsyncFunction("previewRingtone") { id: String ->
      Ringer.preview(context, id)
    }

    AsyncFunction("stopPreview") {
      Ringer.stopPreview(context)
    }

    Function("isOnboarded") {
      DoorbellService.prefs(context).getBoolean("onboarded", false)
    }

    Function("setOnboarded") { done: Boolean ->
      DoorbellService.prefs(context).edit().putBoolean("onboarded", done).apply()
    }

    Function("isIgnoringBatteryOptimizations") {
      context.getSystemService(PowerManager::class.java)?.isIgnoringBatteryOptimizations(context.packageName) ?: true
    }

    AsyncFunction("requestIgnoreBatteryOptimizations") {
      @SuppressLint("BatteryLife")
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
        .setData(Uri.parse("package:${context.packageName}"))
      openSettings(intent)
    }

    Function("canUseFullScreenIntent") {
      if (Build.VERSION.SDK_INT >= 34) {
        context.getSystemService(NotificationManager::class.java)?.canUseFullScreenIntent() ?: true
      } else {
        true
      }
    }

    AsyncFunction("openFullScreenIntentSettings") {
      if (Build.VERSION.SDK_INT >= 34) {
        openSettings(
          Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT)
            .setData(Uri.parse("package:${context.packageName}"))
        )
      }
    }
  }

  private fun openSettings(intent: Intent) {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    try {
      context.startActivity(intent)
    } catch (_: Exception) {
      context.startActivity(
        Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
          .setData(Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      )
    }
  }
}
