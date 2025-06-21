import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ChallengeHubLayout from '../layout';

// Mock the BaseErrorBoundary component
jest.mock('@/components/error-boundaries', () => ({
  BaseErrorBoundary: ({ children, level }: { children: React.ReactNode; level: string }) => (
    <div data-testid="base-error-boundary" data-level={level}>
      {children}
    </div>
  ),
}));

describe('ChallengeHubLayout Component', () => {
  it('renders children within BaseErrorBoundary', () => {
    const testChild = <div data-testid="test-child">Test Content</div>;
    
    render(<ChallengeHubLayout>{testChild}</ChallengeHubLayout>);

    // Check that BaseErrorBoundary is rendered
    const errorBoundary = screen.getByTestId('base-error-boundary');
    expect(errorBoundary).toBeInTheDocument();
    expect(errorBoundary).toHaveAttribute('data-level', 'layout');

    // Check that children are rendered
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('passes layout level to BaseErrorBoundary', () => {
    render(
      <ChallengeHubLayout>
        <span>Content</span>
      </ChallengeHubLayout>
    );

    const errorBoundary = screen.getByTestId('base-error-boundary');
    expect(errorBoundary).toHaveAttribute('data-level', 'layout');
  });

  it('renders multiple children correctly', () => {
    const multipleChildren = (
      <>
        <div data-testid="child-1">First Child</div>
        <div data-testid="child-2">Second Child</div>
        <div data-testid="child-3">Third Child</div>
      </>
    );

    render(<ChallengeHubLayout>{multipleChildren}</ChallengeHubLayout>);

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
    expect(screen.getByText('First Child')).toBeInTheDocument();
    expect(screen.getByText('Second Child')).toBeInTheDocument();
    expect(screen.getByText('Third Child')).toBeInTheDocument();
  });

  it('handles empty children', () => {
    render(<ChallengeHubLayout>{null}</ChallengeHubLayout>);

    // Error boundary should still be rendered
    expect(screen.getByTestId('base-error-boundary')).toBeInTheDocument();
  });

  it('preserves child component props', async () => {
    const ChildComponent = ({ className, onClick }: { className: string; onClick: () => void }) => (
      <button className={className} onClick={onClick}>
        Click Me
      </button>
    );

    const handleClick = jest.fn();
    const user = userEvent.setup();

    render(
      <ChallengeHubLayout>
        <ChildComponent className="test-class" onClick={handleClick} />
      </ChallengeHubLayout>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('test-class');
    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('maintains correct component hierarchy', () => {
    render(
      <ChallengeHubLayout>
        <div data-testid="nested">
          <span>Deeply Nested</span>
        </div>
      </ChallengeHubLayout>
    );

    // Check nesting: Fragment > BaseErrorBoundary > children
    const errorBoundary = screen.getByTestId('base-error-boundary');
    const nestedDiv = screen.getByTestId('nested');
    const span = screen.getByText('Deeply Nested');

    expect(errorBoundary).toBeInTheDocument();
    expect(nestedDiv).toBeInTheDocument();
    expect(span).toBeInTheDocument();
    
    // Verify hierarchy using within
    const withinErrorBoundary = screen.getByTestId('base-error-boundary');
    expect(withinErrorBoundary).toContainElement(nestedDiv);
    expect(nestedDiv).toContainElement(span);
  });

  it('renders React fragments as children', () => {
    const fragmentChild = (
      <>
        <header>Header Content</header>
        <main>Main Content</main>
        <footer>Footer Content</footer>
      </>
    );

    render(<ChallengeHubLayout>{fragmentChild}</ChallengeHubLayout>);

    expect(screen.getByText('Header Content')).toBeInTheDocument();
    expect(screen.getByText('Main Content')).toBeInTheDocument();
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('handles dynamic children updates', () => {
    const DynamicChild = ({ count }: { count: number }) => (
      <div data-testid="dynamic">Count: {count}</div>
    );

    const { rerender } = render(
      <ChallengeHubLayout>
        <DynamicChild count={1} />
      </ChallengeHubLayout>
    );

    expect(screen.getByText('Count: 1')).toBeInTheDocument();

    // Update the count
    rerender(
      <ChallengeHubLayout>
        <DynamicChild count={2} />
      </ChallengeHubLayout>
    );

    expect(screen.getByText('Count: 2')).toBeInTheDocument();
  });

  it('renders complex nested layouts', () => {
    const ComplexLayout = (
      <div data-testid="complex-root">
        <nav data-testid="nav">
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </nav>
        <main data-testid="main">
          <section data-testid="section">
            <article>Article Content</article>
          </section>
        </main>
      </div>
    );

    render(<ChallengeHubLayout>{ComplexLayout}</ChallengeHubLayout>);

    // Verify all parts are rendered correctly
    expect(screen.getByTestId('complex-root')).toBeInTheDocument();
    expect(screen.getByTestId('nav')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
    expect(screen.getByTestId('section')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Article Content')).toBeInTheDocument();
  });

  it('wraps layout content in React Fragment', () => {
    render(
      <ChallengeHubLayout>
        <div>Test</div>
      </ChallengeHubLayout>
    );

    // The layout uses a Fragment (<>...</>) which doesn't create a DOM node
    // The error boundary should be present in the document
    const errorBoundary = screen.getByTestId('base-error-boundary');
    expect(errorBoundary).toBeInTheDocument();
    
    // Verify the error boundary contains the test content
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(errorBoundary).toContainElement(screen.getByText('Test'));
  });
});