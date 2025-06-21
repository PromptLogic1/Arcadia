/**
 * @file sanitization.test.ts
 * @description Tests for HTML sanitization utilities
 */

import {
  sanitizeHtml,
  sanitizeDisplayName,
  sanitizeUserBio,
  sanitizeBoardContent,
  sanitizeCardContent,
  sanitizeRichContent,
  sanitizeCriticalCSS,
  SanitizedHtml,
} from '@/lib/sanitization';
import { log } from '@/lib/logger';
import React from 'react';
import { render } from '@testing-library/react';
import * as DOMPurifyModule from 'dompurify';

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((dirty: string, config: unknown) => {
    // Simple mock that just returns the input for basic tests
    // Real DOMPurify behavior is tested in integration
    if (dirty.includes('<script>')) {
      return '';
    }
    if (config && typeof config === 'object' && 'ALLOWED_TAGS' in config && (config as { ALLOWED_TAGS: string[] }).ALLOWED_TAGS.length === 0) {
      return dirty.replace(/<[^>]*>/g, '');
    }
    return dirty;
  }),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
  },
}));

const mockLog = log as jest.Mocked<typeof log>;

describe('sanitizeHtml', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should sanitize HTML with default userContent config', () => {
    const dirty = '<p>Hello <strong>world</strong></p>';
    const result = sanitizeHtml(dirty);
    expect(result).toBe(dirty);
  });

  it('should handle empty or invalid input', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null as unknown as string)).toBe('');
    expect(sanitizeHtml(undefined as unknown as string)).toBe('');
    expect(sanitizeHtml(123 as unknown as string)).toBe('');
  });

  it('should use different sanitization types', () => {
    const dirty = '<p>Test content</p>';
    
    const userContent = sanitizeHtml(dirty, 'userContent');
    const plainText = sanitizeHtml(dirty, 'plainText');
    const minimal = sanitizeHtml(dirty, 'minimal');
    const richContent = sanitizeHtml(dirty, 'richContent');

    expect(userContent).toBe(dirty);
    expect(plainText).toBe('Test content'); // Tags stripped
    expect(minimal).toBe('Test content'); // Tags stripped
    expect(richContent).toBe(dirty);
  });

  it('should remove dangerous scripts', () => {
    const dangerous = '<script>alert("xss")</script><p>Safe content</p>';
    const result = sanitizeHtml(dangerous);
    expect(result).toBe('');
  });

  it('should handle DOMPurify errors gracefully', () => {
    // Mock DOMPurify to throw an error
    const DOMPurify = DOMPurifyModule as unknown as { sanitize: jest.Mock };
    DOMPurify.sanitize.mockImplementationOnce(() => {
      throw new Error('DOMPurify error');
    });

    const dirty = '<p>Test <script>alert("xss")</script> content</p>';
    const result = sanitizeHtml(dirty);

    expect(mockLog.error).toHaveBeenCalledWith(
      'DOMPurify sanitization failed',
      expect.any(Error),
      {
        metadata: { 
          service: 'sanitization', 
          type: 'userContent', 
          inputLength: dirty.length 
        },
      }
    );
    
    // Should fall back to basic HTML stripping
    expect(result).toBe('Test alert("xss") content');
  });

  it('should pass correct config to DOMPurify', () => {
    const DOMPurify = DOMPurifyModule as unknown as { sanitize: jest.Mock };
    
    sanitizeHtml('<p>test</p>', 'userContent');
    expect(DOMPurify.sanitize).toHaveBeenCalledWith('<p>test</p>', {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote', 'code'],
      ALLOWED_ATTR: [],
      FORBID_ATTR: ['style', 'class', 'id'],
      FORBID_TAGS: ['script', 'object', 'embed', 'link', 'style', 'meta'],
      KEEP_CONTENT: true,
    });
  });
});

describe('sanitizeDisplayName', () => {
  it('should sanitize display names', () => {
    expect(sanitizeDisplayName('John Doe')).toBe('John Doe');
    // When input contains <script>, the mock returns empty string
    expect(sanitizeDisplayName('<script>alert("xss")</script>John')).toBe('');
    expect(sanitizeDisplayName('  John Doe  ')).toBe('John Doe');
  });

  it('should strip HTML tags from display names', () => {
    // Test cases without <script> to verify HTML stripping behavior
    expect(sanitizeDisplayName('<b>John</b> Doe')).toBe('John Doe');
    expect(sanitizeDisplayName('<div>Jane</div>')).toBe('Jane');
    expect(sanitizeDisplayName('User<span>123</span>')).toBe('User123');
  });

  it('should handle empty or invalid input', () => {
    expect(sanitizeDisplayName('')).toBe('');
    expect(sanitizeDisplayName('   ')).toBe('');
  });
});

describe('sanitizeUserBio', () => {
  it('should sanitize user bio content', () => {
    const bio = '<p>I love <strong>programming</strong> and <em>design</em>!</p>';
    const result = sanitizeUserBio(bio);
    expect(result).toBe(bio);
  });

  it('should handle complex bio content', () => {
    const bio = '<p>Bio with <script>alert("xss")</script> dangerous content</p>';
    const result = sanitizeUserBio(bio);
    expect(result).not.toContain('<script>');
  });
});

describe('sanitizeBoardContent', () => {
  it('should sanitize board content', () => {
    const content = '<p>Board title with <strong>emphasis</strong></p>';
    const result = sanitizeBoardContent(content);
    expect(result).toBe(content);
  });

  it('should remove dangerous content from boards', () => {
    const content = '<p>Board</p><script>alert("xss")</script>';
    const result = sanitizeBoardContent(content);
    expect(result).not.toContain('<script>');
  });
});

describe('sanitizeCardContent', () => {
  it('should sanitize card content as plain text', () => {
    const content = '<p>Card text with <strong>formatting</strong></p>';
    const result = sanitizeCardContent(content);
    expect(result).toBe('Card text with formatting');
  });

  it('should strip all HTML from card content', () => {
    const content = '<div><p>Complex <span>nested</span> HTML</p></div>';
    const result = sanitizeCardContent(content);
    expect(result).toBe('Complex nested HTML');
  });
});

describe('sanitizeRichContent', () => {
  it('should sanitize rich content with extended tags', () => {
    const content = '<h1>Title</h1><p>Content with <code>code</code></p><blockquote>Quote</blockquote>';
    const result = sanitizeRichContent(content);
    expect(result).toBe(content);
  });

  it('should handle rich content with lists', () => {
    const content = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    const result = sanitizeRichContent(content);
    expect(result).toBe(content);
  });
});

describe('sanitizeCriticalCSS', () => {
  it('should return empty string for invalid input', () => {
    expect(sanitizeCriticalCSS('')).toBe('');
    expect(sanitizeCriticalCSS(null as unknown as string)).toBe('');
    expect(sanitizeCriticalCSS(undefined as unknown as string)).toBe('');
  });

  it('should remove dangerous JavaScript patterns', () => {
    const dangerousCSS = `
      body { color: red; }
      .evil { javascript: alert('xss'); }
      .expression { width: expression(alert('xss')); }
    `;
    
    const result = sanitizeCriticalCSS(dangerousCSS);
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('expression(');
    expect(result).toContain('body { color: red; }');
  });

  it('should remove URL-based JavaScript', () => {
    const dangerousCSS = `
      .bg { background: url('javascript:alert("xss")'); }
      .bg2 { background: url("javascript:void(0)"); }
    `;
    
    const result = sanitizeCriticalCSS(dangerousCSS);
    expect(result).not.toContain('javascript:');
  });

  it('should remove behavior and binding properties', () => {
    const dangerousCSS = `
      .evil1 { behavior: url(evil.htc); }
      .evil2 { -moz-binding: url(evil.xml); }
    `;
    
    const result = sanitizeCriticalCSS(dangerousCSS);
    expect(result).not.toContain('behavior:');
    expect(result).not.toContain('-moz-binding');
  });

  it('should remove @import statements', () => {
    const dangerousCSS = `
      @import url(evil.css);
      body { color: blue; }
      @import "another.css";
    `;
    
    const result = sanitizeCriticalCSS(dangerousCSS);
    expect(result).not.toContain('@import');
    expect(result).toContain('body { color: blue; }');
  });

  it('should remove VBScript and data URLs', () => {
    const dangerousCSS = `
      .evil1 { background: vbscript:msgbox('xss'); }
      .evil2 { background: data:text/html,<script>alert('xss')</script>; }
    `;
    
    const result = sanitizeCriticalCSS(dangerousCSS);
    expect(result).not.toContain('vbscript:');
    expect(result).not.toContain('data:text/html');
  });

  it('should preserve safe CSS', () => {
    const safeCSS = `
      body { 
        margin: 0; 
        padding: 0; 
        font-family: Arial, sans-serif;
        color: #333;
        background-color: #fff;
      }
      .container { 
        max-width: 1200px; 
        margin: 0 auto;
        background: url('safe-image.jpg');
      }
      @media (max-width: 768px) {
        .container { padding: 10px; }
      }
    `;
    
    const result = sanitizeCriticalCSS(safeCSS);
    expect(result).toContain('font-family: Arial, sans-serif');
    expect(result).toContain('max-width: 1200px');
    expect(result).toContain("background: url('safe-image.jpg')");
    expect(result).toContain('@media (max-width: 768px)');
  });

  it('should handle case-insensitive patterns', () => {
    const dangerousCSS = `
      .evil1 { JAVASCRIPT: alert('xss'); }
      .evil2 { Expression(alert('xss')); }
      .evil3 { VbScript:msgbox('xss'); }
    `;
    
    const result = sanitizeCriticalCSS(dangerousCSS);
    expect(result).not.toContain('JAVASCRIPT:');
    expect(result).not.toContain('Expression(');
    expect(result).not.toContain('VbScript:');
  });
});

describe('SanitizedHtml component', () => {
  it('should render sanitized HTML', () => {
    const { container } = render(
      React.createElement(SanitizedHtml, {
        html: '<p>Safe <strong>content</strong></p>',
      })
    );
    
    expect(container.innerHTML).toContain('<div');
    expect(container.innerHTML).toContain('<p>Safe <strong>content</strong></p>');
  });

  it('should use custom tag', () => {
    const { container } = render(
      React.createElement(SanitizedHtml, {
        html: '<p>Content</p>',
        tag: 'section',
      })
    );
    
    expect(container.innerHTML).toContain('<section');
    expect(container.innerHTML).not.toContain('<div');
  });

  it('should apply className', () => {
    const { container } = render(
      React.createElement(SanitizedHtml, {
        html: '<p>Content</p>',
        className: 'test-class',
      })
    );
    
    expect(container.innerHTML).toContain('class="test-class"');
  });

  it('should use specified sanitization type', () => {
    const { container } = render(
      React.createElement(SanitizedHtml, {
        html: '<p>Content with <script>alert("xss")</script> tags</p>',
        type: 'plainText',
      })
    );
    
    // When input contains <script>, the mock returns empty string
    expect(container.innerHTML).toContain('<div class=""></div>');
    expect(container.innerHTML).not.toContain('<script>');
  });

  it('should handle dangerous content safely', () => {
    const { container } = render(
      React.createElement(SanitizedHtml, {
        html: '<script>alert("xss")</script><p>Safe content</p>',
      })
    );
    
    expect(container.innerHTML).not.toContain('<script>');
  });

  it('should handle empty HTML', () => {
    const { container } = render(
      React.createElement(SanitizedHtml, {
        html: '',
      })
    );
    
    // The component sets className="" by default
    expect(container.innerHTML).toBe('<div class=""></div>');
  });

  it('should support all HTML tag types', () => {
    const tags = ['div', 'span', 'section', 'article', 'main', 'aside', 'header', 'footer'] as const;
    
    tags.forEach(tag => {
      const { container } = render(
        React.createElement(SanitizedHtml, {
          html: '<p>Content</p>',
          tag,
        })
      );
      
      expect(container.innerHTML).toContain(`<${tag}`);
    });
  });
});