"use client";

import { useEffect } from 'react';

type HotkeyCallback = (event: KeyboardEvent) => void;

interface HotkeyOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  key: string;
  preventDefault?: boolean;
}

/**
 * Hook to register keyboard shortcuts
 * @param options Hotkey configuration
 * @param callback Function to call when hotkey is pressed
 */
export function useHotkey(options: HotkeyOptions, callback: HotkeyCallback) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const {
        ctrl = false,
        shift = false,
        alt = false,
        meta = false,
        key,
        preventDefault = true
      } = options;

      // Check if all modifiers match
      const ctrlMatch = ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shift ? event.shiftKey : !event.shiftKey;
      const altMatch = alt ? event.altKey : !event.altKey;
      const metaMatch = meta ? event.metaKey : !event.metaKey;
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && metaMatch && keyMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        callback(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, callback]);
}

/**
 * Predefined hotkey combinations
 */
export const HOTKEYS = {
  CLIENT_SAFE_TOGGLE: {
    ctrl: true,
    shift: true,
    key: 'c',
    preventDefault: true
  }
} as const;
