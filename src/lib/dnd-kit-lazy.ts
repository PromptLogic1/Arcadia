/**
 * Lazy loading wrapper for @dnd-kit to reduce bundle size
 */

type DndKitCoreModule = typeof import('@dnd-kit/core');
type DndKitUtilitiesModule = typeof import('@dnd-kit/utilities');

let dndKitCoreModule: DndKitCoreModule | null = null;
let dndKitUtilitiesModule: DndKitUtilitiesModule | null = null;

let coreLoadPromise: Promise<DndKitCoreModule> | null = null;
let utilitiesLoadPromise: Promise<DndKitUtilitiesModule> | null = null;

// Core module loading
async function loadDndKitCore(): Promise<DndKitCoreModule> {
  if (dndKitCoreModule) return dndKitCoreModule;
  if (coreLoadPromise) return coreLoadPromise;

  coreLoadPromise = import('@dnd-kit/core').then(module => {
    dndKitCoreModule = module;
    return module;
  });

  return coreLoadPromise;
}

// Utilities module loading
async function loadDndKitUtilities(): Promise<DndKitUtilitiesModule> {
  if (dndKitUtilitiesModule) return dndKitUtilitiesModule;
  if (utilitiesLoadPromise) return utilitiesLoadPromise;

  utilitiesLoadPromise = import('@dnd-kit/utilities').then(module => {
    dndKitUtilitiesModule = module;
    return module;
  });

  return utilitiesLoadPromise;
}

// Export async getters for core components
export async function getDndContext() {
  const dndModule = await loadDndKitCore();
  return dndModule.DndContext;
}

export async function getDragOverlay() {
  const dndModule = await loadDndKitCore();
  return dndModule.DragOverlay;
}

export async function getUseDraggable() {
  const dndModule = await loadDndKitCore();
  return dndModule.useDraggable;
}

export async function getUseDroppable() {
  const dndModule = await loadDndKitCore();
  return dndModule.useDroppable;
}

export async function getPointerSensor() {
  const dndModule = await loadDndKitCore();
  return dndModule.PointerSensor;
}

export async function getUseSensors() {
  const dndModule = await loadDndKitCore();
  return dndModule.useSensors;
}

export async function getUseSensor() {
  const dndModule = await loadDndKitCore();
  return dndModule.useSensor;
}

// Export async getters for utilities
export async function getCSS() {
  const dndModule = await loadDndKitUtilities();
  return dndModule.CSS;
}

// Preload all modules
export async function preloadDndKit() {
  await Promise.all([loadDndKitCore(), loadDndKitUtilities()]);
}
