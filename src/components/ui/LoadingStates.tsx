import React from 'react';
import { LoadingSpinner } from './loading-spinner';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

/**
 * Collection of reusable loading state components
 * Provides consistent loading experiences across the application
 */

interface LoadingStateProps {
  className?: string;
}

/**
 * Full page loading state with centered spinner
 */
export function PageLoadingState({ className }: LoadingStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] items-center justify-center',
        className
      )}
    >
      <LoadingSpinner size="lg" color="primary" />
    </div>
  );
}

/**
 * Card loading state - mimics a card layout
 */
export function CardLoadingState({ className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-3 rounded-lg border p-4', className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/**
 * List loading state - shows multiple skeleton items
 */
export function ListLoadingState({
  className,
  count = 3,
}: LoadingStateProps & { count?: number }) {
  return (
    <div className={cn('space-y-4', className)}>
      {[...Array(count)].map((_, i) => (
        <CardLoadingState key={i} />
      ))}
    </div>
  );
}

/**
 * Table loading state
 */
export function TableLoadingState({
  className,
  rows = 5,
  columns = 4,
}: LoadingStateProps & { rows?: number; columns?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex space-x-4 border-b pb-2">
        {[...Array(columns)].map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4 py-2">
          {[...Array(columns)].map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Grid loading state
 */
export function GridLoadingState({
  className,
  count = 6,
  columns = 3,
}: LoadingStateProps & { count?: number; columns?: number }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-1 md:grid-cols-2',
        columns === 3 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {[...Array(count)].map((_, i) => (
        <div key={i} className="aspect-square">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/**
 * Form loading state
 */
export function FormLoadingState({ className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}

/**
 * Profile loading state
 */
export function ProfileLoadingState({ className }: LoadingStateProps) {
  return (
    <div className={cn('flex items-center space-x-4', className)}>
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/**
 * Inline loading indicator for buttons or small areas
 */
export function InlineLoadingState({
  className,
  text = 'Loading...',
}: LoadingStateProps & { text?: string }) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <LoadingSpinner size="sm" />
      <span className="text-muted-foreground text-sm">{text}</span>
    </div>
  );
}

/**
 * Error loading state with retry option
 */
export function ErrorLoadingState({
  className,
  error = 'Something went wrong',
  onRetry,
}: LoadingStateProps & { error?: string; onRetry?: () => void }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4 py-8',
        className
      )}
    >
      <p className="text-destructive text-sm">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-primary text-sm underline hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({
  className,
  icon: Icon,
  title,
  description,
  action,
}: LoadingStateProps & {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4 py-12 text-center',
        className
      )}
    >
      {Icon && <Icon className="text-muted-foreground h-12 w-12" />}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && (
          <p className="text-muted-foreground text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
