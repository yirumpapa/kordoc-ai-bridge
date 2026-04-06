package com.yirumpapa.youtubebackclick

import android.content.Context

class SettingsStore(context: Context) {
    private val prefs = context.getSharedPreferences("yt_back_click", Context.MODE_PRIVATE)

    fun setTapCount(value: Int) {
        prefs.edit().putInt(KEY_TAP_COUNT, value.coerceIn(1, 3)).apply()
    }

    fun getTapCount(): Int = prefs.getInt(KEY_TAP_COUNT, 1)

    fun setXRatio(value: Float) {
        prefs.edit().putFloat(KEY_X_RATIO, value.coerceIn(0.05f, 0.95f)).apply()
    }

    fun getXRatio(): Float = prefs.getFloat(KEY_X_RATIO, 0.2f)

    fun setYRatio(value: Float) {
        prefs.edit().putFloat(KEY_Y_RATIO, value.coerceIn(0.05f, 0.95f)).apply()
    }

    fun getYRatio(): Float = prefs.getFloat(KEY_Y_RATIO, 0.5f)

    companion object {
        const val ACTION_TRIGGER_BACK = "com.yirumpapa.youtubebackclick.TRIGGER_BACK"
        private const val KEY_TAP_COUNT = "tap_count"
        private const val KEY_X_RATIO = "x_ratio"
        private const val KEY_Y_RATIO = "y_ratio"
    }
}
