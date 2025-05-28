export type FilterType = 'category' | 'difficulty' | 'sort' | 'search';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  type: FilterType;
  placeholder: string;
  options?: FilterOption[];
}

export interface FilterOptions {
  categories?: FilterOption[];
  difficulties?: FilterOption[];
  sortOptions?: FilterOption[];
  enableSearch?: boolean;
}

export interface FilterSelections {
  category?: string;
  difficulty?: string;
  sort?: string;
  search?: string;
}

export interface FilterProps {
  filterOptions: FilterOptions;
  selections: FilterSelections;
  onFilterChange: (type: FilterType, value: string) => void;
  className?: string;
}

// Predefined filters
export const DIFFICULTY_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'expert', label: 'Expert' },
];

export const DEFAULT_SORT_OPTIONS: FilterOption[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
];
