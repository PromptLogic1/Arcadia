// Search Service - Business Logic for Content Search and Discovery
// This file contains the core search logic extracted from E2E tests

import type { Tables } from '@/types/database.types';

// Extended discussion type for search functionality
// The actual database schema doesn't include all these fields
export interface DiscussionForSearch extends Tables<'discussions'> {
  downvotes?: number;
  comment_count?: number; 
  is_pinned?: boolean;
  is_locked?: boolean;
}

export interface SearchFilters {
  searchTerm?: string;
  game?: string | null;
  challengeType?: string | null;
  tags?: string[];
  sortBy?: SortOption;
  dateRange?: {
    start: string;
    end: string;
  };
  authorId?: string;
}

export interface SearchResult {
  discussion: DiscussionForSearch;
  score: number;
  highlights: {
    title?: string[];
    content?: string[];
    tags?: string[];
  };
}

export interface SearchQuery {
  search: string;
  filters: Record<string, unknown>;
  sort: string;
}

export interface ParsedSearchTerms {
  terms: string[];
  quoted: string[];
  excluded: string[];
}

export type SortOption = 'relevance' | 'newest' | 'oldest' | 'most_upvoted' | 'most_comments';

// Parse search terms with support for quotes and exclusions
export function parseSearchTerms(query: string): ParsedSearchTerms {
  const terms: string[] = [];
  const quoted: string[] = [];
  const excluded: string[] = [];

  // Extract quoted phrases
  const quotedMatches = query.match(/"([^"]+)"/g) || [];
  quotedMatches.forEach(match => {
    const phrase = match.slice(1, -1); // Remove quotes
    quoted.push(phrase);
    query = query.replace(match, ''); // Remove from main query
  });

  // Extract excluded terms (prefixed with -)
  const excludedMatches = query.match(/-(\S+)/g) || [];
  excludedMatches.forEach(match => {
    const term = match.slice(1); // Remove minus sign
    excluded.push(term);
    query = query.replace(match, ''); // Remove from main query
  });

  // Extract remaining terms
  const remainingTerms = query
    .split(/\s+/)
    .filter(term => term.trim().length > 0);
  
  terms.push(...remainingTerms);

  return { terms, quoted, excluded };
}

// Build search query from filters
export function buildSearchQuery(filters: SearchFilters): SearchQuery {
  const query: SearchQuery = {
    search: filters.searchTerm || '',
    filters: {},
    sort: filters.sortBy || 'relevance',
  };

  // Add filters
  if (filters.game) {
    query.filters.game = filters.game;
  }

  if (filters.challengeType) {
    query.filters.challenge_type = filters.challengeType;
  }

  if (filters.tags && filters.tags.length > 0) {
    query.filters.tags = filters.tags;
  }

  if (filters.dateRange) {
    query.filters.created_after = filters.dateRange.start;
    query.filters.created_before = filters.dateRange.end;
  }

  if (filters.authorId) {
    query.filters.author_id = filters.authorId;
  }

  return query;
}

// Search discussions with scoring
export function searchDiscussions(
  discussions: DiscussionForSearch[],
  searchTerm: string
): SearchResult[] {
  if (!searchTerm.trim()) {
    return discussions.map(discussion => ({
      discussion,
      score: 1,
      highlights: {},
    }));
  }

  const parsed = parseSearchTerms(searchTerm);
  const results: SearchResult[] = [];

  discussions.forEach(discussion => {
    let score = 0;
    const highlights: SearchResult['highlights'] = {};

    // Calculate relevance score
    score += calculateRelevanceScore(discussion, parsed);

    // Generate highlights
    highlights.title = generateHighlights(discussion.title, parsed);
    highlights.content = generateHighlights(discussion.content, parsed);
    
    if (discussion.tags) {
      highlights.tags = discussion.tags
        .filter(tag => matchesSearchTerms(tag, parsed))
        .map(tag => `<mark>${tag}</mark>`);
    }

    // Only include if there's a match
    if (score > 0) {
      results.push({
        discussion,
        score,
        highlights,
      });
    }
  });

  return results;
}

// Calculate relevance score for a discussion
function calculateRelevanceScore(
  discussion: Tables<'discussions'>,
  parsed: ParsedSearchTerms
): number {
  let score = 0;

  // Title matches (higher weight)
  if (matchesSearchTerms(discussion.title, parsed)) {
    score += 0.6;
  }

  // Content matches
  if (matchesSearchTerms(discussion.content, parsed)) {
    score += 0.3;
  }

  // Tag matches
  if (discussion.tags?.some(tag => matchesSearchTerms(tag, parsed))) {
    score += 0.2;
  }

  // Exact phrase bonus
  parsed.quoted.forEach(phrase => {
    if (discussion.title.toLowerCase().includes(phrase.toLowerCase())) {
      score += 0.3;
    }
    if (discussion.content.toLowerCase().includes(phrase.toLowerCase())) {
      score += 0.2;
    }
  });

  // Penalize if excluded terms are found
  parsed.excluded.forEach(term => {
    const regex = new RegExp(term, 'i');
    if (regex.test(discussion.title) || regex.test(discussion.content)) {
      score = 0; // Exclude completely
    }
  });

  return Math.min(score, 1);
}

// Check if text matches search terms
function matchesSearchTerms(text: string, parsed: ParsedSearchTerms): boolean {
  const lowerText = text.toLowerCase();

  // Check regular terms
  const hasTerms = parsed.terms.length === 0 || 
    parsed.terms.some(term => lowerText.includes(term.toLowerCase()));

  // Check quoted phrases
  const hasQuoted = parsed.quoted.length === 0 || 
    parsed.quoted.some(phrase => lowerText.includes(phrase.toLowerCase()));

  // Check excluded terms
  const hasExcluded = parsed.excluded.some(term => 
    new RegExp(term, 'i').test(text)
  );

  return (hasTerms || hasQuoted) && !hasExcluded;
}

// Generate highlights for matched text
function generateHighlights(text: string, parsed: ParsedSearchTerms): string[] {
  const highlights: string[] = [];

  // Highlight regular terms
  parsed.terms.forEach(term => {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi');
    if (regex.test(text)) {
      const highlighted = text.replace(regex, '<mark>$1</mark>');
      highlights.push(highlighted);
    }
  });

  // Highlight quoted phrases
  parsed.quoted.forEach(phrase => {
    const regex = new RegExp(`(${escapeRegex(phrase)})`, 'gi');
    if (regex.test(text)) {
      const highlighted = text.replace(regex, '<mark>$1</mark>');
      highlights.push(highlighted);
    }
  });

  return highlights;
}

// Escape special regex characters
function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Filter discussions by criteria
export function filterDiscussions(
  discussions: DiscussionForSearch[],
  filters: Partial<SearchFilters>,
  sortBy?: SortOption
): DiscussionForSearch[] {
  let filtered = [...discussions];

  // Apply filters
  if (filters.game) {
    filtered = filtered.filter(d => d.game === filters.game);
  }

  if (filters.challengeType) {
    filtered = filtered.filter(d => d.challenge_type === filters.challengeType);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(d => 
      d.tags && filters.tags && filters.tags.every(tag => d.tags?.includes(tag))
    );
  }

  if (filters.authorId) {
    filtered = filtered.filter(d => d.author_id === filters.authorId);
  }

  if (filters.dateRange) {
    const start = new Date(filters.dateRange.start);
    const end = new Date(filters.dateRange.end);
    filtered = filtered.filter(d => {
      if (!d.created_at) return false; // Skip items without creation date
      const created = new Date(d.created_at);
      return created >= start && created <= end;
    });
  }

  // Sort results
  if (sortBy) {
    filtered = sortDiscussions(filtered, sortBy);
  }

  return filtered;
}

// Sort discussions by specified criteria
function sortDiscussions(
  discussions: DiscussionForSearch[],
  sortBy: SortOption
): DiscussionForSearch[] {
  const sorted = [...discussions];

  // No pinned discussions support in current schema
  // sorted.sort() will be applied by secondary sort below

  // Apply secondary sort
  switch (sortBy) {
    case 'newest':
      return sorted.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      });

    case 'oldest':
      return sorted.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return aDate - bDate;
      });

    case 'most_upvoted':
      return sorted.sort((a, b) => {
        const aScore = a.upvotes || 0;
        const bScore = b.upvotes || 0;
        return bScore - aScore;
      });

    case 'most_comments':
      // Note: comment_count not available in current schema
      // Fallback to upvotes for now
      return sorted.sort((a, b) => {
        const aScore = a.upvotes || 0;
        const bScore = b.upvotes || 0;
        return bScore - aScore;
      });

    default:
      return sorted;
  }
}

// Rank search results by relevance and other factors
export function rankSearchResults(
  results: SearchResult[],
  _searchTerm: string
): SearchResult[] {
  return results.sort((a, b) => {
    // Primary sort by score
    if (a.score !== b.score) {
      return b.score - a.score;
    }

    // Secondary sort by recency for ties
    const aTime = a.discussion.created_at ? new Date(a.discussion.created_at).getTime() : 0;
    const bTime = b.discussion.created_at ? new Date(b.discussion.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

// Advanced search with multiple criteria
export function advancedSearch(
  discussions: DiscussionForSearch[],
  filters: SearchFilters
): SearchResult[] {
  // First apply basic filters
  const filtered = filterDiscussions(discussions, filters);

  // Then apply text search if provided
  let results: SearchResult[];
  if (filters.searchTerm) {
    results = searchDiscussions(filtered, filters.searchTerm);
  } else {
    results = filtered.map(discussion => ({
      discussion,
      score: 1,
      highlights: {},
    }));
  }

  // Rank and sort results
  if (filters.sortBy === 'relevance' && filters.searchTerm) {
    return rankSearchResults(results, filters.searchTerm);
  } else {
    // Sort by other criteria
    const sortedDiscussions = sortDiscussions(
      results.map(r => r.discussion),
      filters.sortBy || 'newest'
    );
    
    return sortedDiscussions.map(discussion => 
      results.find(r => r.discussion.id === discussion.id)
    ).filter((r): r is SearchResult => r !== undefined);
  }
}