/**
 * Lazy-loaded UI components for bundle optimization
 * 
 * Phase 4: UI Library Consolidation
 * These heavy UI components are loaded on-demand to reduce initial bundle size.
 * Based on usage analysis, these components add ~80KB to the bundle but are
 * not needed on initial page load.
 */

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/Skeleton';
// LoadingSpinner import removed - using Skeleton for lazy loading

// Dialog component (~18KB) - Used heavily in play-area, community, and bingo boards
export const LazyDialog = dynamic(
  async () => {
    const mod = await import('./Dialog');
    return { default: mod.Dialog };
  },
  {
    loading: () => <Skeleton className="h-96 w-full" />,
    ssr: false,
  }
);

export const LazyDialogContent = dynamic(
  async () => {
    const mod = await import('./Dialog');
    return { default: mod.DialogContent };
  },
  {
    loading: () => <div className="fixed inset-0 z-50 bg-black/50" />,
    ssr: false,
  }
);

export const LazyDialogHeader = dynamic(
  async () => {
    const mod = await import('./Dialog');
    return { default: mod.DialogHeader };
  },
  { ssr: false }
);

export const LazyDialogTitle = dynamic(
  async () => {
    const mod = await import('./Dialog');
    return { default: mod.DialogTitle };
  },
  { ssr: false }
);

export const LazyDialogDescription = dynamic(
  async () => {
    const mod = await import('./Dialog');
    return { default: mod.DialogDescription };
  },
  { ssr: false }
);

export const LazyDialogFooter = dynamic(
  async () => {
    const mod = await import('./Dialog');
    return { default: mod.DialogFooter };
  },
  { ssr: false }
);

// Tabs component (~14KB) - Used in user profiles, settings, and bingo board editing
export const LazyTabs = dynamic(
  () => import('./Tabs').then(mod => ({ 
    default: mod.Tabs 
  })),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
    ssr: false,
  }
);

export const LazyTabsList = dynamic(
  () => import('./Tabs').then(mod => ({ 
    default: mod.TabsList 
  })),
  { ssr: false }
);

export const LazyTabsTrigger = dynamic(
  () => import('./Tabs').then(mod => ({ 
    default: mod.TabsTrigger 
  })),
  { ssr: false }
);

export const LazyTabsContent = dynamic(
  () => import('./Tabs').then(mod => ({ 
    default: mod.TabsContent 
  })),
  { ssr: false }
);

// ScrollArea component (~12KB) - Used in community, bingo boards, and card library
export const LazyScrollArea = dynamic(
  () => import('./ScrollArea').then(mod => ({ 
    default: mod.ScrollArea 
  })),
  {
    loading: () => <div className="h-full w-full overflow-auto" />,
    ssr: false,
  }
);

// Select component (~22KB) - Used in filters, settings, and board creation
export const LazySelect = dynamic(
  () => import('./Select').then(mod => ({ 
    default: mod.Select 
  })),
  {
    loading: () => <Skeleton className="h-10 w-full" />,
    ssr: false,
  }
);

export const LazySelectTrigger = dynamic(
  () => import('./Select').then(mod => ({ 
    default: mod.SelectTrigger 
  })),
  { ssr: false }
);

export const LazySelectContent = dynamic(
  () => import('./Select').then(mod => ({ 
    default: mod.SelectContent 
  })),
  { ssr: false }
);

export const LazySelectItem = dynamic(
  () => import('./Select').then(mod => ({ 
    default: mod.SelectItem 
  })),
  { ssr: false }
);

export const LazySelectValue = dynamic(
  () => import('./Select').then(mod => ({ 
    default: mod.SelectValue 
  })),
  { ssr: false }
);

// Popover component (~16KB) - Base for dropdowns and tooltips
export const LazyPopover = dynamic(
  () => import('./Popover').then(mod => ({ 
    default: mod.Popover 
  })),
  {
    loading: () => null,
    ssr: false,
  }
);

export const LazyPopoverTrigger = dynamic(
  () => import('./Popover').then(mod => ({ 
    default: mod.PopoverTrigger 
  })),
  { ssr: false }
);

export const LazyPopoverContent = dynamic(
  () => import('./Popover').then(mod => ({ 
    default: mod.PopoverContent 
  })),
  { ssr: false }
);

// Rarely used components - Always lazy load these
export const LazyAccordion = dynamic(
  () => import('./Accordion').then(mod => ({ 
    default: mod.Accordion 
  })),
  {
    loading: () => <Skeleton className="h-32 w-full" />,
    ssr: false,
  }
);

export const LazyAccordionItem = dynamic(
  () => import('./Accordion').then(mod => ({ 
    default: mod.AccordionItem 
  })),
  { ssr: false }
);

export const LazyAccordionTrigger = dynamic(
  () => import('./Accordion').then(mod => ({ 
    default: mod.AccordionTrigger 
  })),
  { ssr: false }
);

export const LazyAccordionContent = dynamic(
  () => import('./Accordion').then(mod => ({ 
    default: mod.AccordionContent 
  })),
  { ssr: false }
);

export const LazyCollapsible = dynamic(
  () => import('./Collapsible').then(mod => ({ 
    default: mod.Collapsible 
  })),
  {
    loading: () => <Skeleton className="h-20 w-full" />,
    ssr: false,
  }
);

export const LazyCollapsibleTrigger = dynamic(
  () => import('./Collapsible').then(mod => ({ 
    default: mod.CollapsibleTrigger 
  })),
  { ssr: false }
);

export const LazyCollapsibleContent = dynamic(
  () => import('./Collapsible').then(mod => ({ 
    default: mod.CollapsibleContent 
  })),
  { ssr: false }
);

export const LazyAlertDialog = dynamic(
  () => import('./AlertDialog').then(mod => ({ 
    default: mod.AlertDialog 
  })),
  {
    loading: () => null,
    ssr: false,
  }
);

export const LazyAlertDialogTrigger = dynamic(
  () => import('./AlertDialog').then(mod => ({ 
    default: mod.AlertDialogTrigger 
  })),
  { ssr: false }
);

export const LazyAlertDialogContent = dynamic(
  () => import('./AlertDialog').then(mod => ({ 
    default: mod.AlertDialogContent 
  })),
  { ssr: false }
);

export const LazyAlertDialogHeader = dynamic(
  () => import('./AlertDialog').then(mod => ({ 
    default: mod.AlertDialogHeader 
  })),
  { ssr: false }
);

export const LazyAlertDialogTitle = dynamic(
  () => import('./AlertDialog').then(mod => ({ 
    default: mod.AlertDialogTitle 
  })),
  { ssr: false }
);

export const LazyAlertDialogDescription = dynamic(
  () => import('./AlertDialog').then(mod => ({ 
    default: mod.AlertDialogDescription 
  })),
  { ssr: false }
);

export const LazyAlertDialogFooter = dynamic(
  () => import('./AlertDialog').then(mod => ({ 
    default: mod.AlertDialogFooter 
  })),
  { ssr: false }
);

export const LazyAlertDialogAction = dynamic(
  () => import('./AlertDialog').then(mod => ({ 
    default: mod.AlertDialogAction 
  })),
  { ssr: false }
);

export const LazyAlertDialogCancel = dynamic(
  () => import('./AlertDialog').then(mod => ({ 
    default: mod.AlertDialogCancel 
  })),
  { ssr: false }
);

export const LazyToggleGroup = dynamic(
  () => import('./ToggleGroup').then(mod => ({ 
    default: mod.ToggleGroup 
  })),
  {
    loading: () => <Skeleton className="h-10 w-full" />,
    ssr: false,
  }
);

export const LazyToggleGroupItem = dynamic(
  () => import('./ToggleGroup').then(mod => ({ 
    default: mod.ToggleGroupItem 
  })),
  { ssr: false }
);

/**
 * Helper to determine if a component should be lazy loaded based on route
 */
export function shouldLazyLoadUI(pathname: string): boolean {
  // Always eager load on home page for better UX
  if (pathname === '/') return false;
  
  // Auth routes should have minimal UI
  if (pathname.startsWith('/auth')) return false;
  
  // All other routes can lazy load heavy components
  return true;
}