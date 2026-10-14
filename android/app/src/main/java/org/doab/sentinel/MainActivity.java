package org.doab.sentinel;

import android.os.Bundle;
import android.util.Log;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "DOAB_MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Global Uncaught Exception Handler to prevent hard OS force-closes
        Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
            Log.e(TAG, "Uncaught Exception in DOAB: " + throwable.getMessage(), throwable);
        });

        // 2. Harden WebView settings against Render Process termination & memory faults
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptEnabled(true);
            }
        } catch (Exception e) {
            Log.w(TAG, "Notice setting up resilient WebView: " + e.getMessage());
        }

        // 3. Register Critical Emergency & SOS NotificationChannel with USAGE_ALARM & DND bypass
        createEmergencyNotificationChannel();
    }

    private void createEmergencyNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            try {
                String channelId = "emergency_sos_channel";
                CharSequence name = "Critical Emergency & SOS Broadcasts";
                String description = "Life-critical disaster alerts and flood emergency beacon alarms (Bypasses DND)";
                int importance = android.app.NotificationManager.IMPORTANCE_HIGH;

                android.app.NotificationChannel channel = new android.app.NotificationChannel(channelId, name, importance);
                channel.setDescription(description);
                channel.enableLights(true);
                channel.setLightColor(android.graphics.Color.RED);
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 800});
                channel.setBypassDnd(true);
                channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);

                android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                        .build();

                android.net.Uri alarmSound = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM);
                channel.setSound(alarmSound, audioAttributes);

                android.app.NotificationManager notificationManager = getSystemService(android.app.NotificationManager.class);
                if (notificationManager != null) {
                    notificationManager.createNotificationChannel(channel);
                    Log.i(TAG, "Critical Emergency NotificationChannel created with STREAM_ALARM and DND bypass.");
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to create emergency notification channel: " + e.getMessage(), e);
            }
        }
    }
}
