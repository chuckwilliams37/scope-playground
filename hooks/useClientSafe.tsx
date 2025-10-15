"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const STORAGE_KEY = 'scope.clientSafe';

type ClientSafeContextType = {
  clientSafeMode: boolean;
  toggleClientSafeMode: (enabled?: boolean) => void;
  isLoaded: boolean;
};

const ClientSafeContext = createContext<ClientSafeContextType | undefined>(undefined);

/**
 * Provider component for Client-Safe mode state.
 * Manages global state with localStorage persistence and cross-tab sync.
 */
export function ClientSafeProvider({ children }: { children: ReactNode }) {
  const [clientSafeMode, setClientSafeMode] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setClientSafeMode(stored === '1');
      }
      setIsLoaded(true);
    } catch (error) {
      console.error('Error loading client-safe mode from localStorage:', error);
      setIsLoaded(true);
    }
  }, []);

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue !== null) {
        setClientSafeMode(e.newValue === '1');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save to localStorage when changed
  const toggleClientSafeMode = (enabled?: boolean) => {
    const newValue = enabled !== undefined ? enabled : !clientSafeMode;
    setClientSafeMode(newValue);
    
    try {
      localStorage.setItem(STORAGE_KEY, newValue ? '1' : '0');
      // Dispatch custom event for same-tab sync
      window.dispatchEvent(new CustomEvent('clientSafeModeChanged', { detail: { enabled: newValue } }));
    } catch (error) {
      console.error('Error saving client-safe mode to localStorage:', error);
    }
  };

  return (
    <ClientSafeContext.Provider value={{ clientSafeMode, toggleClientSafeMode, isLoaded }}>
      {children}
    </ClientSafeContext.Provider>
  );
}

/**
 * Hook to access Client-Safe mode state from anywhere in the app.
 * Must be used within a ClientSafeProvider.
 */
export function useClientSafe() {
  const context = useContext(ClientSafeContext);
  if (context === undefined) {
    throw new Error('useClientSafe must be used within a ClientSafeProvider');
  }
  return context;
}
