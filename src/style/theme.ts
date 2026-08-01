import { registerPlugin, Capacitor } from '@capacitor/core';
import { 
  argbFromHex, 
  themeFromSourceColor, 
  applyTheme, 
  SchemeTonalSpot, 
  SchemeMonochrome,
  MaterialDynamicColors, 
  Hct, 
  hexFromArgb 
} from '@material/material-color-utilities';

interface SystemThemePlugin {
  lafAccentColor(): Promise<{
    hex: string;
    accent1: Record<string, string>;
    accent2: Record<string, string>;
    accent3: Record<string, string>;
    neutral1: Record<string, string>;
    neutral2: Record<string, string>;
  }>;
}

const SystemTheme = registerPlugin<SystemThemePlugin>('SystemTheme');

export type ThemeMode = 'system' | 'monochrome' | string;

// Manteniamo traccia dell'observer per evitare listener duplicati
let mediaQueryListenerAttached = false;

export async function setTheme(mode: ThemeMode) {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Assicurati che l'observer sia attivo
  setupColorSchemeObserver();

  if (mode === 'system' && Capacitor.getPlatform() === 'android') {
    try {
      const palette = await SystemTheme.lafAccentColor();
      
      if (palette.hex && palette.accent1 && palette.neutral1) {
        const scheme = new SchemeTonalSpot(
          Hct.fromInt(argbFromHex(palette.hex)),
          isDark,
          0.0
        );

        applyDynamicScheme(scheme, isDark);
        localStorage.setItem('theme_mode', 'system');
        return;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  if (mode === 'monochrome') {
    const scheme = new SchemeMonochrome(
      Hct.fromInt(argbFromHex('#000000')),
      isDark,
      0.0
    );
    applyDynamicScheme(scheme, isDark);
    localStorage.setItem('theme_mode', 'monochrome');
    return;
  }

  const seedHex = (mode === 'system' || mode === 'monochrome' || !mode.startsWith('#')) ? '#6750A4' : mode;
  const theme = themeFromSourceColor(argbFromHex(seedHex));
  
  // Applica le variabili generate da Material Color Utilities
  applyTheme(theme, { target: document.documentElement, dark: isDark });
  
  // Imposta anche la proprietà color-scheme per :root e :root *
  updateColorSchemeProperty(isDark);
  
  localStorage.setItem('theme_mode', mode);
}

function updateColorSchemeProperty(isDark: boolean) {
  const colorSchemeValue = isDark ? 'dark' : 'light';
  
  let styleEl = document.head.querySelector('#color-scheme-override') as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'color-scheme-override';
    document.head.appendChild(styleEl);
  }
  
  styleEl.textContent = `
    :root, :root * {
      color-scheme: ${colorSchemeValue} !important;
    }
  `;
}

function applyDynamicScheme(scheme: any, isDark: boolean) {
  const colors = MaterialDynamicColors;

  const cssVariables = `
    :root, :root * {
      color-scheme: ${isDark ? 'dark' : 'light'} !important;
    }

    :root {
      --md-sys-color-primary: ${hexFromArgb(colors.primary.getArgb(scheme))};
      --md-sys-color-on-primary: ${hexFromArgb(colors.onPrimary.getArgb(scheme))};
      --md-sys-color-primary-container: ${hexFromArgb(colors.primaryContainer.getArgb(scheme))};
      --md-sys-color-on-primary-container: ${hexFromArgb(colors.onPrimaryContainer.getArgb(scheme))};

      --md-sys-color-secondary: ${hexFromArgb(colors.secondary.getArgb(scheme))};
      --md-sys-color-on-secondary: ${hexFromArgb(colors.onSecondary.getArgb(scheme))};
      --md-sys-color-secondary-container: ${hexFromArgb(colors.secondaryContainer.getArgb(scheme))};
      --md-sys-color-on-secondary-container: ${hexFromArgb(colors.onSecondaryContainer.getArgb(scheme))};

      --md-sys-color-tertiary: ${hexFromArgb(colors.tertiary.getArgb(scheme))};
      --md-sys-color-on-tertiary: ${hexFromArgb(colors.onTertiary.getArgb(scheme))};
      --md-sys-color-tertiary-container: ${hexFromArgb(colors.tertiaryContainer.getArgb(scheme))};
      --md-sys-color-on-tertiary-container: ${hexFromArgb(colors.onTertiaryContainer.getArgb(scheme))};

      --md-sys-color-surface: ${hexFromArgb(colors.surface.getArgb(scheme))};
      --md-sys-color-on-surface: ${hexFromArgb(colors.onSurface.getArgb(scheme))};
      --md-sys-color-surface-variant: ${hexFromArgb(colors.surfaceVariant.getArgb(scheme))};
      --md-sys-color-on-surface-variant: ${hexFromArgb(colors.onSurfaceVariant.getArgb(scheme))};

      --md-sys-color-background: ${hexFromArgb(colors.background.getArgb(scheme))};
      --md-sys-color-on-background: ${hexFromArgb(colors.onBackground.getArgb(scheme))};

      --md-sys-color-error: ${hexFromArgb(colors.error.getArgb(scheme))};
      --md-sys-color-on-error: ${hexFromArgb(colors.onError.getArgb(scheme))};
      --md-sys-color-error-container: ${hexFromArgb(colors.errorContainer.getArgb(scheme))};
      --md-sys-color-on-error-container: ${hexFromArgb(colors.onErrorContainer.getArgb(scheme))};

      --md-sys-color-outline: ${hexFromArgb(colors.outline.getArgb(scheme))};
      --md-sys-color-outline-variant: ${hexFromArgb(colors.outlineVariant.getArgb(scheme))};
      --md-sys-color-shadow: ${hexFromArgb(colors.shadow.getArgb(scheme))};
      --md-sys-color-scrim: ${hexFromArgb(colors.scrim.getArgb(scheme))};

      --md-sys-color-inverse-surface: ${hexFromArgb(colors.inverseSurface.getArgb(scheme))};
      --md-sys-color-inverse-on-surface: ${hexFromArgb(colors.inverseOnSurface.getArgb(scheme))};
      --md-sys-color-inverse-primary: ${hexFromArgb(colors.inversePrimary.getArgb(scheme))};
    }
  `;

  let styleEl = document.head.querySelector('#dynamic-md3-theme') as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-md3-theme';
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = cssVariables;
}

function setupColorSchemeObserver() {
  if (mediaQueryListenerAttached) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  
  const handleThemeChange = () => {
    const activeMode = localStorage.getItem('theme_mode') || '#6750A4';
    setTheme(activeMode);
  };

  // Compatibilità per browser più vecchi ed EventListener standard
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleThemeChange);
  } else {
    mediaQuery.addListener(handleThemeChange);
  }

  mediaQueryListenerAttached = true;
}

export function initAppTheme() {
  setupColorSchemeObserver();
  const savedTheme = localStorage.getItem('theme_mode');
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    setTheme('#6750A4');
  }
}