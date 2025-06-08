'use client';

import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import './animations.css';

interface SearchInputProps {
  value: string;
  onValueChangeAction: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onValueChangeAction,
  placeholder = 'Search discussions...',
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '/' && e.ctrlKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className={`group relative ${className}`}>
      <Search
        className={`absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform ${isFocused ? 'text-cyan-400' : 'text-cyan-300'} transition-colors duration-200`}
      />
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onValueChangeAction(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="h-12 min-w-[300px] rounded-lg border-2 border-gray-700 bg-gray-800/90 pr-10 pl-10 text-base font-medium text-white shadow-lg shadow-black/10 transition-all duration-200 placeholder:text-cyan-300/50 hover:border-cyan-500/70 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30"
        aria-label={placeholder}
      />
      {value && (
        <button
          className="clear-button absolute top-1/2 right-3 -translate-y-1/2 transform text-cyan-300 hover:text-cyan-400"
          data-state={value ? 'visible' : 'hidden'}
          onClick={() => onValueChangeAction('')}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <div
        className="focus-indicator absolute right-0 bottom-0 left-0 h-0.5 bg-gradient-to-r from-cyan-500 to-fuchsia-500"
        data-state={isFocused ? 'focused' : 'unfocused'}
      />
      <div
        className={`absolute inset-0 -z-10 rounded-lg bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100`}
      />
    </div>
  );
};
