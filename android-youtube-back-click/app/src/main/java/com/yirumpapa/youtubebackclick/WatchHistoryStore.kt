package com.yirumpapa.youtubebackclick

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

class WatchHistoryStore(context: Context) {
    private val prefs = context.getSharedPreferences("yt_back_click_history", Context.MODE_PRIVATE)

    fun addRecord(url: String, title: String, subtitle: String) {
        val current = JSONArray(prefs.getString(KEY_HISTORY, "[]"))

        val item = JSONObject().apply {
            put("id", System.currentTimeMillis())
            put("url", url.trim())
            put("title", title.trim())
            put("subtitle", subtitle.trim())
            put("savedAt", System.currentTimeMillis())
        }

        val next = JSONArray().apply {
            put(item)
            for (i in 0 until current.length()) {
                put(current.getJSONObject(i))
            }
        }

        prefs.edit().putString(KEY_HISTORY, next.toString()).apply()
    }

    fun getRecords(limit: Int = 50): List<WatchRecord> {
        val arr = JSONArray(prefs.getString(KEY_HISTORY, "[]"))
        val result = mutableListOf<WatchRecord>()
        val count = minOf(arr.length(), limit)

        for (i in 0 until count) {
            val obj = arr.getJSONObject(i)
            result += WatchRecord(
                id = obj.optLong("id"),
                url = obj.optString("url"),
                title = obj.optString("title"),
                subtitle = obj.optString("subtitle"),
                savedAt = obj.optLong("savedAt")
            )
        }
        return result
    }

    fun clearAll() {
        prefs.edit().putString(KEY_HISTORY, "[]").apply()
    }

    companion object {
        private const val KEY_HISTORY = "records"
    }
}

data class WatchRecord(
    val id: Long,
    val url: String,
    val title: String,
    val subtitle: String,
    val savedAt: Long
)
