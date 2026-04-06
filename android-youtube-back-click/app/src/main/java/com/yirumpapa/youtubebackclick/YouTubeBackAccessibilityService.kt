package com.yirumpapa.youtubebackclick

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Path
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent

class YouTubeBackAccessibilityService : AccessibilityService() {
    private lateinit var settingsStore: SettingsStore
    private val handler = Handler(Looper.getMainLooper())

    private val triggerReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == SettingsStore.ACTION_TRIGGER_BACK) {
                triggerBackGesture()
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        settingsStore = SettingsStore(this)
        registerReceiverCompat()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit
    override fun onInterrupt() = Unit

    override fun onDestroy() {
        super.onDestroy()
        unregisterReceiver(triggerReceiver)
    }

    private fun registerReceiverCompat() {
        val filter = IntentFilter(SettingsStore.ACTION_TRIGGER_BACK)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(triggerReceiver, filter, RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(triggerReceiver, filter)
        }
    }

    private fun triggerBackGesture() {
        val metrics = resources.displayMetrics
        val x = (metrics.widthPixels * settingsStore.getXRatio()).toFloat()
        val y = (metrics.heightPixels * settingsStore.getYRatio()).toFloat()
        val tapCount = settingsStore.getTapCount()

        repeat(tapCount) { index ->
            handler.postDelayed(
                {
                    performSingleTap(x, y)
                    handler.postDelayed({ performSingleTap(x, y) }, 120)
                },
                (index * 350).toLong()
            )
        }
    }

    private fun performSingleTap(x: Float, y: Float) {
        val path = Path().apply { moveTo(x, y) }
        val stroke = GestureDescription.StrokeDescription(path, 0, 40)
        val gesture = GestureDescription.Builder().addStroke(stroke).build()
        dispatchGesture(gesture, null, null)
    }
}
