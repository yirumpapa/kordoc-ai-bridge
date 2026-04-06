package com.yirumpapa.youtubebackclick

import android.content.ComponentName
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.widget.SeekBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {
    private lateinit var settingsStore: SettingsStore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        settingsStore = SettingsStore(this)

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
