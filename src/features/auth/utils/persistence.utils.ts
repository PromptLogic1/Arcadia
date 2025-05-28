import type { PersistentFormData, FormPersistence } from '../types/signup-form.types';
import { logger } from '@/lib/logger';

// 🧼 Pure Functions - Storage Keys
const STORAGE_KEYS = {
  SIGNUP_FORM: 'arcadia_signup_form',
  FORM_VERSION: 'v1',
} as const;

// 🧼 Pure Functions - Data Serialization
const serializeFormData = (data: Partial<PersistentFormData>): string => {
  return JSON.stringify({
    version: STORAGE_KEYS.FORM_VERSION,
    timestamp: Date.now(),
    data,
  });
};

const deserializeFormData = (serialized: string): Partial<PersistentFormData> | null => {
  try {
    const parsed = JSON.parse(serialized);
    
    // Version check for future compatibility
    if (parsed.version !== STORAGE_KEYS.FORM_VERSION) {
      logger.warn('Stored form data version mismatch', {
        component: 'SignUpFormPersistence',
        metadata: {
          storedVersion: parsed.version,
          expectedVersion: STORAGE_KEYS.FORM_VERSION,
        },
      });
      return null;
    }
    
    // Check if data is expired (7 days)
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    if (Date.now() - parsed.timestamp > maxAge) {
      logger.debug('Stored form data expired', {
        component: 'SignUpFormPersistence',
        metadata: {
          age: Date.now() - parsed.timestamp,
          maxAge,
        },
      });
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    logger.warn('Failed to deserialize form data', {
      component: 'SignUpFormPersistence',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    return null;
  }
};

// 🧼 Pure Functions - Validation
const isValidFormData = (data: any): data is Partial<PersistentFormData> => {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Check that only allowed fields are present
  const allowedFields = ['username', 'email'];
  const dataKeys = Object.keys(data);
  
  for (const key of dataKeys) {
    if (!allowedFields.includes(key)) {
      logger.warn('Invalid field in stored form data', {
        component: 'SignUpFormPersistence',
        metadata: {
          invalidField: key,
          allowedFields,
        },
      });
      return false;
    }
  }
  
  // Validate field types
  if (data.username !== undefined && typeof data.username !== 'string') {
    return false;
  }
  
  if (data.email !== undefined && typeof data.email !== 'string') {
    return false;
  }
  
  return true;
};

// 🧼 Pure Functions - Storage Operations
const saveToStorage = (data: Partial<PersistentFormData>): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) {
    logger.warn('localStorage not available', {
      component: 'SignUpFormPersistence',
    });
    return false;
  }
  
  if (!isValidFormData(data)) {
    logger.error('Invalid form data provided for storage', undefined, {
      component: 'SignUpFormPersistence',
      metadata: { data },
    });
    return false;
  }
  
  try {
    const serialized = serializeFormData(data);
    window.localStorage.setItem(STORAGE_KEYS.SIGNUP_FORM, serialized);
    
    logger.debug('Form data saved to localStorage', {
      component: 'SignUpFormPersistence',
      metadata: {
        fields: Object.keys(data),
      },
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to save form data to localStorage', error as Error, {
      component: 'SignUpFormPersistence',
    });
    return false;
  }
};

const loadFromStorage = (): Partial<PersistentFormData> | null => {
  if (typeof window === 'undefined' || !window.localStorage) {
    logger.warn('localStorage not available', {
      component: 'SignUpFormPersistence',
    });
    return null;
  }
  
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.SIGNUP_FORM);
    
    if (!stored) {
      return null;
    }
    
    const data = deserializeFormData(stored);
    
    if (!data || !isValidFormData(data)) {
      // Clear invalid data
      clearFromStorage();
      return null;
    }
    
    logger.debug('Form data loaded from localStorage', {
      component: 'SignUpFormPersistence',
      metadata: {
        fields: Object.keys(data),
      },
    });
    
    return data;
  } catch (error) {
    logger.error('Failed to load form data from localStorage', error as Error, {
      component: 'SignUpFormPersistence',
    });
    
    // Clear corrupted data
    clearFromStorage();
    return null;
  }
};

const clearFromStorage = (): boolean => {
  if (typeof window === 'undefined' || !window.localStorage) {
    logger.warn('localStorage not available', {
      component: 'SignUpFormPersistence',
    });
    return false;
  }
  
  try {
    window.localStorage.removeItem(STORAGE_KEYS.SIGNUP_FORM);
    
    logger.debug('Form data cleared from localStorage', {
      component: 'SignUpFormPersistence',
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to clear form data from localStorage', error as Error, {
      component: 'SignUpFormPersistence',
    });
    return false;
  }
};

// 🧼 Pure Functions - Partial Data Updates
const updateStoredField = (field: keyof PersistentFormData, value: string): boolean => {
  const currentData = loadFromStorage() || {};
  const updatedData = { ...currentData, [field]: value };
  return saveToStorage(updatedData);
};

const removeStoredField = (field: keyof PersistentFormData): boolean => {
  const currentData = loadFromStorage();
  
  if (!currentData || !(field in currentData)) {
    return true; // Nothing to remove
  }
  
  const { [field]: removed, ...remainingData } = currentData;
  
  if (Object.keys(remainingData).length === 0) {
    return clearFromStorage();
  }
  
  return saveToStorage(remainingData);
};

// 🧼 Pure Functions - Factory Function
export const createFormPersistence = (): FormPersistence => ({
  save: saveToStorage,
  load: loadFromStorage,
  clear: clearFromStorage,
});

// 🧼 Pure Functions - Utility Exports
export const formPersistenceUtils = {
  updateField: updateStoredField,
  removeField: removeStoredField,
  isValid: isValidFormData,
  serialize: serializeFormData,
  deserialize: deserializeFormData,
  storageKeys: STORAGE_KEYS,
} as const;

// 🧼 Pure Functions - Storage Health Check
export const checkStorageHealth = (): {
  available: boolean;
  hasStoredData: boolean;
  dataValid: boolean;
  dataAge?: number;
} => {
  const available = typeof window !== 'undefined' && !!window.localStorage;
  
  if (!available) {
    return { available: false, hasStoredData: false, dataValid: false };
  }
  
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.SIGNUP_FORM);
    const hasStoredData = !!stored;
    
    if (!hasStoredData) {
      return { available: true, hasStoredData: false, dataValid: false };
    }
    
    const parsed = JSON.parse(stored);
    const dataValid = isValidFormData(parsed.data);
    const dataAge = parsed.timestamp ? Date.now() - parsed.timestamp : undefined;
    
    return { available: true, hasStoredData: true, dataValid, dataAge };
  } catch {
    return { available: true, hasStoredData: true, dataValid: false };
  }
};

// Default export for convenience
export default createFormPersistence; 