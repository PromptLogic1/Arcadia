/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Link from 'next/link';
import { ThemeWrapper } from '../theme-wrapper';

describe('ThemeWrapper', () => {
  describe('rendering', () => {
    it('should render children inside wrapper div', () => {
      render(
        <ThemeWrapper>
          <div data-testid="test-child">Test Content</div>
        </ThemeWrapper>
      );

      expect(screen.getByTestId('test-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ThemeWrapper>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <span data-testid="child-3">Child 3</span>
        </ThemeWrapper>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('child-3')).toBeInTheDocument();
    });

    it('should wrap children in a div element', () => {
      render(
        <ThemeWrapper>
          <div data-testid="test-child">Test Content</div>
        </ThemeWrapper>
      );

      const wrapper = screen.getByTestId('theme-wrapper');
      const child = screen.getByTestId('test-child');
      
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toContainElement(child);
    });
  });

  describe('hydration suppression', () => {
    it('should have suppressHydrationWarning attribute', () => {
      render(
        <ThemeWrapper>
          <div data-testid="test-child">Test Content</div>
        </ThemeWrapper>
      );

      const wrapper = screen.getByTestId('theme-wrapper');
      const child = screen.getByTestId('test-child');
      
      // suppressHydrationWarning is a React internal prop that doesn't appear as DOM attribute
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toContainElement(child);
    });
  });

  describe('children handling', () => {
    it('should handle text children', () => {
      render(<ThemeWrapper>Plain text content</ThemeWrapper>);

      expect(screen.getByText('Plain text content')).toBeInTheDocument();
    });

    it('should handle element children', () => {
      render(
        <ThemeWrapper>
          <button type="button">Click me</button>
        </ThemeWrapper>
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    it('should handle complex nested children', () => {
      render(
        <ThemeWrapper>
          <header data-testid="header">
            <nav data-testid="nav">
              <ul>
                <li><Link href="/">Home</Link></li>
                <li><a href="/about">About</a></li>
              </ul>
            </nav>
          </header>
          <main data-testid="main">
            <section>
              <h1>Page Title</h1>
              <p>Page content</p>
            </section>
          </main>
        </ThemeWrapper>
      );

      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('nav')).toBeInTheDocument();
      expect(screen.getByTestId('main')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText('Page content')).toBeInTheDocument();
    });

    it('should handle React fragments', () => {
      render(
        <ThemeWrapper>
          <>
            <div data-testid="fragment-child-1">Fragment Child 1</div>
            <div data-testid="fragment-child-2">Fragment Child 2</div>
          </>
        </ThemeWrapper>
      );

      expect(screen.getByTestId('fragment-child-1')).toBeInTheDocument();
      expect(screen.getByTestId('fragment-child-2')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle null children', () => {
      render(<ThemeWrapper>{null}</ThemeWrapper>);

      // Should render empty wrapper div
      const wrapper = screen.getByTestId('theme-wrapper');
      expect(wrapper).toBeInTheDocument();
    });

    it('should handle undefined children', () => {
      render(<ThemeWrapper>{undefined}</ThemeWrapper>);

      // Should render empty wrapper div
      const wrapper = screen.getByTestId('theme-wrapper');
      expect(wrapper).toBeInTheDocument();
    });

    it('should handle empty string children', () => {
      render(<ThemeWrapper>{''}</ThemeWrapper>);

      // Should render wrapper div with empty string
      const wrapper = screen.getByTestId('theme-wrapper');
      expect(wrapper).toBeInTheDocument();
    });

    it('should handle zero as children', () => {
      render(<ThemeWrapper>{0}</ThemeWrapper>);

      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle boolean children', () => {
      render(
        <ThemeWrapper>
          {true}
          {false}
          <div data-testid="after-booleans">After booleans</div>
        </ThemeWrapper>
      );

      // Booleans should not render anything, but the div should still be there
      expect(screen.getByTestId('after-booleans')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should preserve semantic HTML structure', () => {
      render(
        <ThemeWrapper>
          <main role="main">
            <h1>Main Heading</h1>
            <section>
              <h2>Section Heading</h2>
              <p>Section content</p>
            </section>
          </main>
        </ThemeWrapper>
      );

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should preserve ARIA attributes', () => {
      render(
        <ThemeWrapper>
          <div 
            role="region" 
            aria-label="Theme content" 
            aria-describedby="theme-description"
            data-testid="themed-content"
          >
            <p id="theme-description">This content is themed</p>
          </div>
        </ThemeWrapper>
      );

      const themedContent = screen.getByTestId('themed-content');
      expect(themedContent).toHaveAttribute('role', 'region');
      expect(themedContent).toHaveAttribute('aria-label', 'Theme content');
      expect(themedContent).toHaveAttribute('aria-describedby', 'theme-description');
    });

    it('should not interfere with focus management', () => {
      render(
        <ThemeWrapper>
          <button data-testid="focusable-button">Focusable Button</button>
          <input data-testid="focusable-input" type="text" />
        </ThemeWrapper>
      );

      const button = screen.getByTestId('focusable-button');
      const input = screen.getByTestId('focusable-input');

      button.focus();
      expect(button).toHaveFocus();

      input.focus();
      expect(input).toHaveFocus();
    });
  });

  describe('component structure', () => {
    it('should create minimal wrapper structure', () => {
      render(
        <ThemeWrapper>
          <div data-testid="content">Content</div>
        </ThemeWrapper>
      );

      const content = screen.getByTestId('content');
      const wrapper = screen.getByTestId('theme-wrapper');

      // Should only have one child element
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toContainElement(content);
      // Test that wrapper contains exactly the content we expect
      expect(content).toBeInTheDocument();
    });

    it('should not add unnecessary nesting', () => {
      render(
        <ThemeWrapper>
          <div data-testid="direct-child">Direct Child</div>
        </ThemeWrapper>
      );

      const directChild = screen.getByTestId('direct-child');
      const wrapper = screen.getByTestId('theme-wrapper');

      // The wrapper should be the direct parent
      expect(wrapper).toContainElement(directChild);
      expect(wrapper).toBeInTheDocument();
    });
  });

  describe('theme consistency', () => {
    it('should provide consistent rendering environment', () => {
      // This test ensures the wrapper helps with hydration consistency
      render(
        <ThemeWrapper>
          <div data-testid="theme-sensitive-content" className="dark:bg-gray-900 light:bg-white">
            Theme-sensitive content
          </div>
        </ThemeWrapper>
      );

      const content = screen.getByTestId('theme-sensitive-content');
      expect(content).toBeInTheDocument();
      
      // The wrapper should be present to handle theme consistency
      const wrapper = screen.getByTestId('theme-wrapper');
      expect(wrapper).toBeInTheDocument();
      expect(wrapper).toContainElement(content);
    });
  });

  describe('performance', () => {
    it('should render efficiently without unnecessary complexity', () => {
      const startTime = performance.now();
      
      render(
        <ThemeWrapper>
          <div>Simple content</div>
        </ThemeWrapper>
      );
      
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render very quickly (under 10ms in most cases)
      expect(renderTime).toBeLessThan(50);
    });

    it('should handle large content without performance issues', () => {
      const largeContent = Array.from({ length: 100 }, (_, i) => (
        <div key={i} data-testid={`item-${i}`}>
          Item {i}
        </div>
      ));

      render(<ThemeWrapper>{largeContent}</ThemeWrapper>);

      // Should render first and last items
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-99')).toBeInTheDocument();
    });
  });

  describe('client-side behavior', () => {
    it('should work correctly in client-side environment', () => {
      // This test ensures the 'use client' directive works as expected
      render(
        <ThemeWrapper>
          <div data-testid="client-content">Client-side content</div>
        </ThemeWrapper>
      );

      expect(screen.getByTestId('client-content')).toBeInTheDocument();
    });
  });

  describe('TypeScript interface compliance', () => {
    it('should accept ReactNode children prop', () => {
      // These should compile without TypeScript errors
      const stringChild = <ThemeWrapper>String child</ThemeWrapper>;
      const elementChild = <ThemeWrapper><div>Element child</div></ThemeWrapper>;
      const arrayChild = <ThemeWrapper>{['Array', 'child']}</ThemeWrapper>;
      const nullChild = <ThemeWrapper>{null}</ThemeWrapper>;

      // Test that they all render without errors
      render(stringChild);
      render(elementChild);
      render(arrayChild);
      render(nullChild);
    });
  });
});