/**
 * Lazy loading wrapper for react-hook-form to reduce bundle size
 */

type ReactHookFormModule = typeof import('react-hook-form');

let reactHookFormModule: ReactHookFormModule | null = null;
let loadPromise: Promise<ReactHookFormModule> | null = null;

async function loadReactHookForm(): Promise<ReactHookFormModule> {
  if (reactHookFormModule) return reactHookFormModule;
  if (loadPromise) return loadPromise;

  loadPromise = import('react-hook-form').then(module => {
    reactHookFormModule = module;
    return module;
  });

  return loadPromise;
}

// Export commonly used hooks and utilities
export async function getUseForm() {
  const rhfModule = await loadReactHookForm();
  return rhfModule.useForm;
}

export async function getController() {
  const rhfModule = await loadReactHookForm();
  return rhfModule.Controller;
}

export async function getUseFormContext() {
  const rhfModule = await loadReactHookForm();
  return rhfModule.useFormContext;
}

export async function getFormProvider() {
  const rhfModule = await loadReactHookForm();
  return rhfModule.FormProvider;
}

// Synchronous versions that throw if not loaded
export function useFormSync() {
  if (!reactHookFormModule) {
    throw new Error(
      'react-hook-form not loaded. Use getUseForm() for async loading.'
    );
  }
  return reactHookFormModule.useForm;
}

export function ControllerSync() {
  if (!reactHookFormModule) {
    throw new Error(
      'react-hook-form not loaded. Use getController() for async loading.'
    );
  }
  return reactHookFormModule.Controller;
}

// Preload function for critical paths
export function preloadReactHookForm() {
  return loadReactHookForm();
}
