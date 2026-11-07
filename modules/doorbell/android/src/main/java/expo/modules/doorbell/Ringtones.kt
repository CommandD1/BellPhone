package expo.modules.doorbell

import android.content.Context
import android.net.Uri

/**
 * Klingeltöne = alle Dateien in modules/doorbell/android/src/main/res/raw/.
 * Neue Datei dort ablegen (Name nur a-z, 0-9, _), neu bauen – fertig.
 */
object Ringtones {
  private const val PREF_KEY = "ringtone"

  /** Resource-Name -> Resource-ID, alphabetisch sortiert. */
  fun all(): List<Pair<String, Int>> =
    R.raw::class.java.fields
      .mapNotNull { field -> runCatching { field.name to field.getInt(null) }.getOrNull() }
      .sortedBy { it.first }

  fun selected(context: Context): String? {
    val available = all()
    val saved = DoorbellService.prefs(context).getString(PREF_KEY, null)
    return available.firstOrNull { it.first == saved }?.first ?: available.firstOrNull()?.first
  }

  fun select(context: Context, id: String) {
    if (all().none { it.first == id }) throw IllegalArgumentException("Unbekannter Klingelton: $id")
    DoorbellService.prefs(context).edit().putString(PREF_KEY, id).apply()
  }

  fun uri(context: Context, id: String?): Uri? {
    val resId = all().firstOrNull { it.first == id }?.second ?: return null
    return Uri.parse("android.resource://${context.packageName}/$resId")
  }
}
