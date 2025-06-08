'use client';

import { Skeleton } from '@/components/ui/skeleton';
import './animations.css';

interface LoadingStateProps {
  count?: number;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  count = 3,
  className = 'h-40',
}) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-item">
        <Skeleton className={`w-full ${className} bg-gray-800/50`} />
      </div>
    ))}
  </div>
);
