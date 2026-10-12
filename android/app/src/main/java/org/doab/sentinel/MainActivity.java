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
                // Ensure DOM storage and hardware acceleration are balanced
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setJavaScriptEnabled(true);

                // Set a resilient WebViewClient that gracefully handles RENDER_PROCESS_GONE
                webView.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                        Log.w(TAG, "WebView render process gone! Did crash: " + detail.didCrash());
                        // Return true to indicate the host application handled the crash and prevent OS force-close
                        return true;
                    }
                });
            }
        } catch (Exception e) {
            Log.w(TAG, "Notice setting up resilient WebViewClient: " + e.getMessage());
        }
    }
}
