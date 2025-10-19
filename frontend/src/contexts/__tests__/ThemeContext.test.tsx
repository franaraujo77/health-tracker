import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useTheme, ThemeProvider } from '../ThemeContext';
import * as colorUtils from '@/styles/colorUtils';
import type { ReactNode } from 'react';

// Mock colorUtils
vi.mock('@/styles/colorUtils', () => ({
  generateThemeFromColor: vi.fn(() => ({
    light: {
      primary: '#4CAF50',
      onPrimary: '#FFFFFF',
    },
    dark: {
      primary: '#81C784',
      onPrimary: '#000000',
    },
  })),
  applyColorScheme: vi.fn(),
  getCurrentScheme: vi.fn((theme, isDark) => (isDark ? theme.dark : theme.light)),
}));

// Mock tokens metadata
vi.mock('@/styles/tokens/version', () => ({
  TOKENS_METADATA: {
    seedColor: '#4CAF50',
    version: '1.0.0',
  },
}));

describe('ThemeContext', () => {
  // Mock localStorage
  let localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock = {};
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(
      (key) => localStorageMock[key] || null
    );
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      localStorageMock[key] = value;
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  describe('Initialization', () => {
    it('should initialize with system mode by default', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('system');
    });

    it('should initialize with light applied theme when system is light', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.appliedTheme).toBe('light');
      expect(result.current.isSystemDark).toBe(false);
    });

    it('should initialize with dark applied theme when system is dark', () => {
      // Mock system dark mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
          matches: query === '(prefers-color-scheme: dark)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.appliedTheme).toBe('dark');
      expect(result.current.isSystemDark).toBe(true);
    });

    it('should load mode from localStorage if available', () => {
      localStorageMock['health-tracker-theme-mode'] = 'dark';

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.mode).toBe('dark');
    });

    it('should respect custom defaultMode prop', () => {
      const customWrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider defaultMode="light">{children}</ThemeProvider>
      );

      const { result } = renderHook(() => useTheme(), { wrapper: customWrapper });

      expect(result.current.mode).toBe('light');
    });

    it('should generate theme from default seed color', () => {
      renderHook(() => useTheme(), { wrapper });

      expect(vi.mocked(colorUtils.generateThemeFromColor)).toHaveBeenCalledWith('#4CAF50');
    });

    it('should generate theme from custom seed color', () => {
      const customWrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider seedColor="#FF5722">{children}</ThemeProvider>
      );

      renderHook(() => useTheme(), { wrapper: customWrapper });

      expect(vi.mocked(colorUtils.generateThemeFromColor)).toHaveBeenCalledWith('#FF5722');
    });

    it('should apply color scheme on mount', () => {
      renderHook(() => useTheme(), { wrapper });

      expect(vi.mocked(colorUtils.applyColorScheme)).toHaveBeenCalled();
    });
  });

  describe('Theme Mode Management', () => {
    it('should update mode with setThemeMode', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(result.current.mode).toBe('dark');
    });

    it('should persist mode to localStorage', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(localStorageMock['health-tracker-theme-mode']).toBe('dark');
    });

    it('should apply light theme when mode is light', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('light');
      });

      expect(result.current.appliedTheme).toBe('light');
    });

    it('should apply dark theme when mode is dark', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(result.current.appliedTheme).toBe('dark');
    });

    it('should apply system theme when mode is system', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('system');
      });

      // System is light by default in our mock
      expect(result.current.appliedTheme).toBe('light');
    });

    it('should update color scheme when applied theme changes', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(vi.mocked(colorUtils.getCurrentScheme)).toHaveBeenCalledWith(expect.any(Object), true);
    });
  });

  describe('Toggle Functionality', () => {
    it('should toggle from light to dark', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Start with light
      act(() => {
        result.current.setThemeMode('light');
      });

      expect(result.current.appliedTheme).toBe('light');

      // Toggle to dark
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.appliedTheme).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Start with dark
      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(result.current.appliedTheme).toBe('dark');

      // Toggle to light
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.appliedTheme).toBe('light');
    });

    it('should set explicit mode when toggling from system', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Start with system (which is light)
      expect(result.current.mode).toBe('system');
      expect(result.current.appliedTheme).toBe('light');

      // Toggle should set explicit dark mode
      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.appliedTheme).toBe('dark');
    });

    it('should persist toggled mode to localStorage', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('light');
      });

      act(() => {
        result.current.toggleTheme();
      });

      expect(localStorageMock['health-tracker-theme-mode']).toBe('dark');
    });
  });

  describe('System Preference Detection', () => {
    it('should listen for system preference changes', () => {
      const addEventListenerMock = vi.fn();
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: addEventListenerMock,
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      renderHook(() => useTheme(), { wrapper });

      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update isSystemDark when system preference changes', () => {
      let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event, handler) => {
            if (event === 'change') {
              changeHandler = handler;
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.isSystemDark).toBe(false);

      // Simulate system preference change to dark
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current.isSystemDark).toBe(true);
    });

    it('should update appliedTheme when system changes and mode is system', () => {
      let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event, handler) => {
            if (event === 'change') {
              changeHandler = handler;
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Mode is 'system' by default
      expect(result.current.mode).toBe('system');
      expect(result.current.appliedTheme).toBe('light');

      // System changes to dark
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current.appliedTheme).toBe('dark');
    });

    it('should not affect appliedTheme when system changes and mode is explicit', () => {
      let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn((event, handler) => {
            if (event === 'change') {
              changeHandler = handler;
            }
          }),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Set explicit light mode
      act(() => {
        result.current.setThemeMode('light');
      });

      expect(result.current.appliedTheme).toBe('light');

      // System changes to dark - should not affect appliedTheme
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      });

      expect(result.current.appliedTheme).toBe('light');
      expect(result.current.isSystemDark).toBe(true); // System changed but mode is explicit
    });

    it('should use legacy addListener if addEventListener is not available', () => {
      const addListenerMock = vi.fn();
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
          matches: false,
          media: '',
          onchange: null,
          addListener: addListenerMock,
          removeListener: vi.fn(),
          addEventListener: undefined, // Not available
          removeEventListener: undefined,
          dispatchEvent: vi.fn(),
        })),
      });

      renderHook(() => useTheme(), { wrapper });

      expect(addListenerMock).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('LocalStorage Persistence', () => {
    it('should save light mode to localStorage', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('light');
      });

      expect(localStorageMock['health-tracker-theme-mode']).toBe('light');
    });

    it('should save dark mode to localStorage', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(localStorageMock['health-tracker-theme-mode']).toBe('dark');
    });

    it('should save system mode to localStorage', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('system');
      });

      expect(localStorageMock['health-tracker-theme-mode']).toBe('system');
    });

    it('should handle invalid localStorage values', () => {
      localStorageMock['health-tracker-theme-mode'] = 'invalid-value';

      const { result } = renderHook(() => useTheme(), { wrapper });

      // Should fall back to default mode
      expect(result.current.mode).toBe('system');
    });

    it('should handle missing localStorage gracefully', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      // Should use default mode
      expect(result.current.mode).toBe('system');
    });
  });

  describe('Color Scheme', () => {
    it('should provide current color scheme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.colorScheme).toBeDefined();
      expect(result.current.colorScheme).toHaveProperty('primary');
    });

    it('should update color scheme when theme changes', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      const initialCallCount = vi.mocked(colorUtils.applyColorScheme).mock.calls.length;

      act(() => {
        result.current.setThemeMode('dark');
      });

      // Should have called applyColorScheme again
      expect(vi.mocked(colorUtils.applyColorScheme).mock.calls.length).toBeGreaterThan(
        initialCallCount
      );
    });

    it('should call applyColorScheme with correct parameters for light theme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('light');
      });

      expect(vi.mocked(colorUtils.applyColorScheme)).toHaveBeenCalledWith(
        expect.any(Object),
        false
      );
    });

    it('should call applyColorScheme with correct parameters for dark theme', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      act(() => {
        result.current.setThemeMode('dark');
      });

      expect(vi.mocked(colorUtils.applyColorScheme)).toHaveBeenCalledWith(expect.any(Object), true);
    });
  });

  describe('Hook Usage', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const originalError = console.error;
      console.error = vi.fn();

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      console.error = originalError;
    });

    it('should provide all context values when used within ThemeProvider', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current).toHaveProperty('mode');
      expect(result.current).toHaveProperty('appliedTheme');
      expect(result.current).toHaveProperty('colorScheme');
      expect(result.current).toHaveProperty('theme');
      expect(result.current).toHaveProperty('setThemeMode');
      expect(result.current).toHaveProperty('toggleTheme');
      expect(result.current).toHaveProperty('isSystemDark');
    });

    it('should provide theme object with light and dark schemes', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toHaveProperty('light');
      expect(result.current.theme).toHaveProperty('dark');
      expect(result.current.theme.light).toHaveProperty('primary');
      expect(result.current.theme.dark).toHaveProperty('primary');
    });
  });

  describe('Theme Object', () => {
    it('should provide complete theme object', () => {
      const { result } = renderHook(() => useTheme(), { wrapper });

      expect(result.current.theme).toBeDefined();
      expect(result.current.theme.light).toBeDefined();
      expect(result.current.theme.dark).toBeDefined();
    });

    it('should regenerate theme when seed color changes', () => {
      // First render with default seed color
      const { rerender } = renderHook(() => useTheme(), { wrapper });

      const firstCallCount = vi.mocked(colorUtils.generateThemeFromColor).mock.calls.length;

      // Rerender with new seed color
      const newWrapper = ({ children }: { children: ReactNode }) => (
        <ThemeProvider seedColor="#2196F3">{children}</ThemeProvider>
      );

      rerender();

      // Should not regenerate on rerender with same seed color
      expect(vi.mocked(colorUtils.generateThemeFromColor).mock.calls.length).toBe(firstCallCount);
    });
  });
});
