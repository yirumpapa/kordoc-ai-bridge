package com.yirumpapa.youtubebackclick

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.method.LinkMovementMethod
import android.text.style.URLSpan
import android.widget.Button
import android.widget.EditText
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : AppCompatActivity() {
    private lateinit var settingsStore: SettingsStore
    private lateinit var historyStore: WatchHistoryStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        settingsStore = SettingsStore(this)
        historyStore = WatchHistoryStore(this)

        val overlayBtn = findViewById<Button>(R.id.btnGrantOverlay)
        val accessibilityBtn = findViewById<Button>(R.id.btnOpenAccessibility)
        val startOverlayBtn = findViewById<Button>(R.id.btnStartOverlay)
        val stopOverlayBtn = findViewById<Button>(R.id.btnStopOverlay)

        val tapCountSeek = findViewById<SeekBar>(R.id.seekTapCount)
        val xSeek = findViewById<SeekBar>(R.id.seekX)
        val ySeek = findViewById<SeekBar>(R.id.seekY)

        val tapText = findViewById<TextView>(R.id.txtTapCount)
        val xText = findViewById<TextView>(R.id.txtX)
        val yText = findViewById<TextView>(R.id.txtY)
        val historyText = findViewById<TextView>(R.id.txtHistory)
        historyText.movementMethod = LinkMovementMethod.getInstance()

        val urlEdit = findViewById<EditText>(R.id.etVideoUrl)
        val titleEdit = findViewById<EditText>(R.id.etVideoTitle)
        val subtitleEdit = findViewById<EditText>(R.id.etSubtitles)
        val saveHistoryBtn = findViewById<Button>(R.id.btnSaveHistory)
        val clearHistoryBtn = findViewById<Button>(R.id.btnClearHistory)

        tapCountSeek.max = 2
        tapCountSeek.progress = settingsStore.getTapCount() - 1
        xSeek.max = 90
        xSeek.progress = (settingsStore.getXRatio() * 100).toInt().coerceIn(5, 95) - 5
        ySeek.max = 90
        ySeek.progress = (settingsStore.getYRatio() * 100).toInt().coerceIn(5, 95) - 5

        renderTexts(tapText, xText, yText, tapCountSeek.progress + 1, xSeek.progress + 5, ySeek.progress + 5)

        tapCountSeek.setOnSeekBarChangeListener(simpleSeek { value ->
            val count = value + 1
            settingsStore.setTapCount(count)
            renderTexts(tapText, xText, yText, count, xSeek.progress + 5, ySeek.progress + 5)
        })

        xSeek.setOnSeekBarChangeListener(simpleSeek { value ->
            val pct = value + 5
            settingsStore.setXRatio(pct / 100f)
            renderTexts(tapText, xText, yText, tapCountSeek.progress + 1, pct, ySeek.progress + 5)
        })

        ySeek.setOnSeekBarChangeListener(simpleSeek { value ->
            val pct = value + 5
            settingsStore.setYRatio(pct / 100f)
            renderTexts(tapText, xText, yText, tapCountSeek.progress + 1, xSeek.progress + 5, pct)
        })

        overlayBtn.setOnClickListener {
            if (!Settings.canDrawOverlays(this)) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
            }
        }

        accessibilityBtn.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        startOverlayBtn.setOnClickListener {
            val intent = Intent(this, OverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(intent)
            } else {
                startService(intent)
            }
        }

        stopOverlayBtn.setOnClickListener {
            stopService(Intent(this, OverlayService::class.java))
        }

        if (intent?.action == Intent.ACTION_SEND) {
            val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
            if (sharedText.contains("youtube.com") || sharedText.contains("youtu.be")) {
                urlEdit.setText(sharedText)
            }
        }

        saveHistoryBtn.setOnClickListener {
            val url = urlEdit.text.toString().trim()
            val title = titleEdit.text.toString().trim()
            val subtitle = subtitleEdit.text.toString().trim()

            if (url.isEmpty() || title.isEmpty() || subtitle.isEmpty()) {
                Toast.makeText(this, getString(R.string.history_required_fields), Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            historyStore.addRecord(url, title, subtitle)
            subtitleEdit.setText("")
            renderHistory(historyText)
            Toast.makeText(this, getString(R.string.history_saved), Toast.LENGTH_SHORT).show()
        }

        clearHistoryBtn.setOnClickListener {
            historyStore.clearAll()
            renderHistory(historyText)
            Toast.makeText(this, getString(R.string.history_cleared), Toast.LENGTH_SHORT).show()
        }

        renderHistory(historyText)
    }

    private fun renderHistory(historyText: TextView) {
        val records = historyStore.getRecords()
        if (records.isEmpty()) {
            historyText.text = getString(R.string.history_empty)
            return
        }

        val dateFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault())
        val text = SpannableStringBuilder()
        for ((index, item) in records.withIndex()) {
            text.append(index + 1)
            text.append(". ")
            text.append(item.title)
            text.append('\n')
            text.append("URL: ")

            val start = text.length
            val displayUrl = item.url
            val targetUrl = normalizeUrl(item.url)
            text.append(displayUrl)
            text.setSpan(URLSpan(targetUrl), start, text.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)

            text.append('\n')
            text.append("저장시각: ")
            text.append(dateFormat.format(Date(item.savedAt)))
            text.append('\n')
            text.append("자막: ")
            text.append(item.subtitle)
            text.append("\n\n")
        }
        historyText.text = text.trim()
    }

    private fun normalizeUrl(raw: String): String {
        val url = raw.trim()
        return if (url.startsWith("http://") || url.startsWith("https://")) {
            url
        } else {
            "https://$url"
        }
    }
    }

    private fun renderTexts(
        tapText: TextView,
        xText: TextView,
        yText: TextView,
        tapCount: Int,
        xPct: Int,
        yPct: Int
    ) {
        tapText.text = getString(R.string.tap_count_fmt, tapCount)
        xText.text = getString(R.string.x_position_fmt, xPct)
        yText.text = getString(R.string.y_position_fmt, yPct)
    }

    private fun simpleSeek(onChange: (Int) -> Unit): SeekBar.OnSeekBarChangeListener {
        return object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(seekBar: SeekBar?, progress: Int, fromUser: Boolean) {
                onChange(progress)
            }

            override fun onStartTrackingTouch(seekBar: SeekBar?) = Unit
            override fun onStopTrackingTouch(seekBar: SeekBar?) = Unit
        }
    }
}
