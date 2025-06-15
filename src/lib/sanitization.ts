import DOMPurify from 'dompurify';
import type React from 'react';
import type { ReactElement } from 'react';
import { createElement } from 'react';
import { log } from '@/lib/logger';

/**
 * Configuration for different content types
 */
const SANITIZATION_CONFIGS = {
  // For user-generated content like descriptions, bios, comments
  userContent: {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'ol',
      'ul',
      'li',
      'blockquote',
      'code',
    ] as string[],
    ALLOWED_ATTR: [] as string[],
    FORBID_ATTR: ['style', 'class', 'id'] as string[],
    FORBID_TAGS: [
      'script',
      'object',
      'embed',
      'link',
      'style',
      'meta',
    ] as string[],
    KEEP_CONTENT: true,
  },
  // For plain text that should not contain any HTML
  plainText: {
    ALLOWED_TAGS: [] as string[],
    ALLOWED_ATTR: [] as string[],
    KEEP_CONTENT: true,
  },
  // For minimal HTML like usernames (no formatting allowed)
  minimal: {
    ALLOWED_TAGS: [] as string[],
    ALLOWED_ATTR: [] as string[],
    KEEP_CONTENT: true,
  },
  // For rich content that might contain safe HTML
  richContent: {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'u',
      'ol',
      'ul',
      'li',
      'blockquote',
      'code',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'pre',
      'hr',
    ] as string[],
    ALLOWED_ATTR: [] as string[],
    FORBID_ATTR: [
      'style',
      'class',
      'id',
      'onclick',
      'onload',
      'onerror',
    ] as string[],
    FORBID_TAGS: [
      'script',
      'object',
      'embed',
      'link',
      'style',
      'meta',
      'iframe',
    ] as string[],
    KEEP_CONTENT: true,
  },
};

type SanitizationType = keyof typeof SANITIZATION_CONFIGS;

/**
 * Sanitizes HTML content using DOMPurify
 * @param dirty - The potentially unsafe HTML string
 * @param type - The type of sanitization to apply
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeHtml(
  dirty: string,
  type: SanitizationType = 'userContent'
): string {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }

  try {
    const config = SANITIZATION_CONFIGS[type];
    return DOMPurify.sanitize(dirty, config);
  } catch (error) {
    // If DOMPurify fails, strip all HTML as fallback
    log.error('DOMPurify sanitization failed', error, {
      metadata: { service: 'sanitization', type, inputLength: dirty.length },
    });
    return dirty.replace(/<[^>]*>/g, '');
  }
}

/**
 * Sanitizes user input for display names, usernames, etc.
 * Removes all HTML and JavaScript
 */
export function sanitizeDisplayName(input: string): string {
  return sanitizeHtml(input, 'minimal').trim();
}

/**
 * Sanitizes user bio or description content
 * Allows basic formatting but removes all dangerous content
 */
export function sanitizeUserBio(input: string): string {
  return sanitizeHtml(input, 'userContent');
}

/**
 * Sanitizes board titles and descriptions
 */
export function sanitizeBoardContent(input: string): string {
  return sanitizeHtml(input, 'userContent');
}

/**
 * Sanitizes card content for bingo boards
 */
export function sanitizeCardContent(input: string): string {
  return sanitizeHtml(input, 'plainText');
}

/**
 * Sanitizes rich content like forum posts
 */
export function sanitizeRichContent(input: string): string {
  return sanitizeHtml(input, 'richContent');
}

/**
 * Validates that critical CSS content is safe
 * Used for fixing the dangerouslySetInnerHTML in layout.tsx
 */
export function sanitizeCriticalCSS(css: string): string {
  if (!css || typeof css !== 'string') {
    return '';
  }

  // Remove any JavaScript-like content from CSS
  // This is a basic check - in production, use a proper CSS parser
  const dangerousPatterns = [
    /javascript\s*:/gi,
    /expression\s*\(/gi,
    /url\s*\(\s*["']?javascript/gi,
    /behavior\s*:/gi,
    /@import\s+/gi,
    /-moz-binding/gi,
    /vbscript\s*:/gi,
    /data\s*:\s*text\s*\/\s*html/gi,
  ];

  let sanitized = css;
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  return sanitized;
}

/**
 * React component wrapper for sanitized HTML
 * Use this instead of dangerouslySetInnerHTML
 */
export interface SanitizedHtmlProps {
  html: string;
  type?: SanitizationType;
  className?: string;
  tag?: keyof React.JSX.IntrinsicElements;
}

/**
 * Safe HTML component that automatically sanitizes content
 */
export function SanitizedHtml({
  html,
  type = 'userContent',
  className = '',
  tag = 'div',
}: SanitizedHtmlProps): ReactElement {
  const sanitizedContent = sanitizeHtml(html, type);

  return createElement(tag, {
    className,
    dangerouslySetInnerHTML: { __html: sanitizedContent },
  });
}
