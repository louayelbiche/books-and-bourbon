import type { BrandConfig } from '../types/brand.js';

/**
 * ChatWidgetTheme shape (mirrors @runwell/pidgie-shared/config).
 * Duplicated here to avoid circular dependency between pidgie-core and pidgie-shared.
 */
export interface GeneratedWidgetTheme {
  fab: { bg: string; hover: string; icon: string };
  panel: { bg: string; border: string; width: string; height: string };
  header: { bg: string; text: string; subtext: string };
  userBubble: { bg: string; text: string; radius: string };
  assistantBubble: { bg: string; text: string; border: string; radius: string };
  suggestion: { bg: string; text: string; border: string; hoverBg: string; hoverText: string };
  input: { bg: string; border: string; text: string; placeholder: string; focusBorder: string };
  sendButton: { bg: string; text: string; disabledBg: string; disabledText: string };
  typingDot: string;
  linkColor: string;
  minimizedPreview: { bg: string; text: string; border: string };
}

type ThemeMode = 'light' | 'dark';

/**
 * Compute a lighter or darker shade of a hex color.
 * Factor > 1 lightens, factor < 1 darkens.
 */
function adjustColor(hex: string, factor: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const adjust = (c: number) => {
    if (factor > 1) {
      return Math.min(255, Math.round(c + (255 - c) * (factor - 1)));
    }
    return Math.max(0, Math.round(c * factor));
  };

  const rr = adjust(r).toString(16).padStart(2, '0');
  const gg = adjust(g).toString(16).padStart(2, '0');
  const bb = adjust(b).toString(16).padStart(2, '0');
  return `#${rr}${gg}${bb}`;
}

/**
 * Add alpha to a hex color, returning an rgba string.
 */
function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Generate a complete ChatWidgetTheme from a BrandConfig.
 * Computes all 30+ properties from just primaryColor and secondaryColor.
 */
export function generateWidgetTheme(
  brand: BrandConfig,
  mode: ThemeMode = 'light'
): GeneratedWidgetTheme {
  const primaryColor = brand.widgetPrimary;
  const secondaryColor = brand.secondaryColor;
  const isDark = mode === 'dark';

  const bg = isDark ? '#1a1a1a' : '#ffffff';
  const bgSubtle = isDark ? '#242424' : '#f9fafb';
  const border = isDark ? '#333333' : '#e5e7eb';
  const text = isDark ? '#f3f4f6' : '#111827';
  const textMuted = isDark ? '#9ca3af' : '#6b7280';

  return {
    fab: {
      bg: primaryColor,
      hover: adjustColor(primaryColor, isDark ? 1.15 : 0.85),
      icon: '#ffffff',
    },
    panel: {
      bg,
      border,
      width: '400px',
      height: '600px',
    },
    header: {
      bg: primaryColor,
      text: '#ffffff',
      subtext: withAlpha('#ffffff', 0.8),
    },
    userBubble: {
      bg: primaryColor,
      text: '#ffffff',
      radius: '18px 18px 4px 18px',
    },
    assistantBubble: {
      bg: bgSubtle,
      text,
      border: isDark ? '#333333' : '#e5e7eb',
      radius: '18px 18px 18px 4px',
    },
    suggestion: {
      bg: 'transparent',
      text: primaryColor,
      border: primaryColor,
      hoverBg: withAlpha(primaryColor, 0.1),
      hoverText: primaryColor,
    },
    input: {
      bg: bgSubtle,
      border,
      text,
      placeholder: textMuted,
      focusBorder: primaryColor,
    },
    sendButton: {
      bg: primaryColor,
      text: '#ffffff',
      disabledBg: isDark ? '#333333' : '#e5e7eb',
      disabledText: textMuted,
    },
    typingDot: secondaryColor,
    linkColor: primaryColor,
    minimizedPreview: {
      bg,
      text,
      border,
    },
  };
}

/**
 * Generate themes for both light and dark modes.
 */
export function generateWidgetThemes(brand: BrandConfig): {
  light: GeneratedWidgetTheme;
  dark: GeneratedWidgetTheme;
} {
  return {
    light: generateWidgetTheme(brand, 'light'),
    dark: generateWidgetTheme(brand, 'dark'),
  };
}
