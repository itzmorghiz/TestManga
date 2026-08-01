package com.itzmorghiz.testmanga;

import android.content.res.Resources;
import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.material.color.DynamicColors;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SystemThemePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @CapacitorPlugin(name = "SystemTheme")
    public static class SystemThemePlugin extends Plugin {
        @PluginMethod
        public void lafAccentColor(PluginCall call) {
            JSObject ret = new JSObject();
            try {
                var contextTheme = DynamicColors.wrapContextIfAvailable(getContext());
                Resources res = contextTheme.getResources();
                String pkg = "android";

                // Helper to pull system color resources safely by name and shade
                // Material You provides system_accent1_0 through 1000, neutral1, etc.
                JSObject accent1 = getTonalArray(res, pkg, "system_accent1_");
                JSObject accent2 = getTonalArray(res, pkg, "system_accent2_");
                JSObject accent3 = getTonalArray(res, pkg, "system_accent3_");
                JSObject neutral1 = getTonalArray(res, pkg, "system_neutral1_");
                JSObject neutral2 = getTonalArray(res, pkg, "system_neutral2_");

                ret.put("accent1", accent1);
                ret.put("accent2", accent2);
                ret.put("accent3", accent3);
                ret.put("neutral1", neutral1);
                ret.put("neutral2", neutral2);
                
                // Fallback seed color
                ret.put("hex", accent1.has("600") ? accent1.getString("600") : "#6750A4");

                call.resolve(ret);
            } catch (Exception e) {
                ret.put("hex", "#6750A4");
                call.resolve(ret);
            }
        }

        private JSObject getTonalArray(Resources res, String pkg, String prefix) {
            JSObject tonalMap = new JSObject();
            int[] keys = {0, 10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000};
            for (int key : keys) {
                try {
                    int id = res.getIdentifier(prefix + key, "color", pkg);
                    if (id != 0) {
                        int colorInt = res.getColor(id, null);
                        tonalMap.put(String.valueOf(key), String.format("#%06X", (0xFFFFFF & colorInt)));
                    }
                } catch (Exception ignored) {}
            }
            return tonalMap;
        }
    }
}