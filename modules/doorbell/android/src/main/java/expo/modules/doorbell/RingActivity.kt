package expo.modules.doorbell

import android.app.Activity
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import java.lang.ref.WeakReference

/** Full-screen "Es klingelt!" screen that appears above the lock screen. */
class RingActivity : Activity() {
  companion object {
    private var current: WeakReference<RingActivity>? = null

    fun finishIfShowing() {
      current?.get()?.finish()
    }
  }

  @Suppress("DEPRECATION")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    } else {
      window.addFlags(
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
      )
    }
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

    if (!Ringer.isRinging) {
      finish()
      return
    }
    current = WeakReference(this)

    val dp = { v: Float -> TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, resources.displayMetrics).toInt() }
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER
      setBackgroundColor(Color.rgb(0xC6, 0x28, 0x28))
      setPadding(dp(24f), dp(24f), dp(24f), dp(24f))
    }
    root.addView(TextView(this).apply {
      text = "🔔"
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 96f)
      gravity = Gravity.CENTER
    })
    root.addView(TextView(this).apply {
      text = "Es klingelt!"
      setTextColor(Color.WHITE)
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 44f)
      gravity = Gravity.CENTER
      setTypeface(typeface, android.graphics.Typeface.BOLD)
    })
    root.addView(Button(this).apply {
      text = "Stopp"
      setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
      setOnClickListener {
        Ringer.stop(this@RingActivity)
        finish()
      }
    }, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(96f)).apply { topMargin = dp(48f) })
    setContentView(root)
  }

  override fun onDestroy() {
    if (current?.get() === this) current = null
    super.onDestroy()
  }
}
