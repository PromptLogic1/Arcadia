/**
 * Generic hook for persisting state to localStorage
 * Follows the pattern established in the codebase for state management
 */

import { useState, useCallback, useEffect } from 'react';
import { log } from '@/lib/logger';

interface UsePersistedStateOptions<T> {
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  syncAcrossTabs?: boolean;
}

export function usePersistedState<T>(
  key: string,
  defaultValue: T,
  options?: UsePersistedStateOptions<T>
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;
  const syncAcrossTabs = options?.syncAcrossTabs ?? true;

  // Initialize state from localStorage
  const [state, setState] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return deserialize(saved);
      }
    } catch (error) {
      log.error('Failed to restore persisted state', error as Error, {
        metadata: { key }
      });
    }
    return defaultValue;
  });

  // Persist state changes to localStorage
  const setPersisted = useCallback((value: T | ((prev: T) => T)) => {
    setState(prev => {
      const newValue = typeof value === 'function' 
        ? (value as (prev: T) => T)(prev) 
        : value;
      
      try {
        localStorage.setItem(key, serialize(newValue));
      } catch (error) {
        log.error('Failed to persist state', error as Error, {
          metadata: { key }
        });
      }
      
      return newValue;
    });
  }, [key, serialize]);

  // Clear persisted value
  const clearPersisted = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setState(defaultValue);
    } catch (error) {
      log.error('Failed to clear persisted state', error as Error, {
        metadata: { key }
      });
    }
  }, [key, defaultValue]);

  // Handle storage events from other tabs
  useEffect(() => {
    if (!syncAcrossTabs) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setState(deserialize(e.newValue));
        } catch (error) {
          log.error('Failed to sync persisted state', error as Error, {
            metadata: { key }
          });
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize, syncAcrossTabs]);

  return [state, setPersisted, clearPersisted];
}

/**
 * Hook specifically for form data persistence
 * Automatically provides field update methods
 */
export function usePersistedFormState<T extends Record<string, unknown>>(
  formKey: string,
  defaultValues: T
) {
  const [formData, setFormData, clearFormData] = usePersistedState(
    `form-${formKey}`,
    defaultValues
  );

  const updateField = useCallback(
    (field: keyof T, value: T[keyof T]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [setFormData]
  );

  return {
    formData,
    updateField,
    setFormData,
    clearFormData
  };
}