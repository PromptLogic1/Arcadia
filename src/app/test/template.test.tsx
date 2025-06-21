import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Template from '../template';

// Mock components
jest.mock('../../components/providers', () => ({
  Providers: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="providers">{children}</div>
  ),
}));

jest.mock('../../components/error-boundaries/SafeRootWrapper', () => ({
  SafeRootWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="safe-root-wrapper">{children}</div>
  ),
}));

jest.mock('../../components/template-content', () => ({
  TemplateContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="template-content">{children}</div>
  ),
}));

describe('Template Component', () => {
  it('renders children within all required wrappers', () => {
    const testContent = <div data-testid="test-child">Test Content</div>;
    
    render(<Template>{testContent}</Template>);

    // Check that all wrappers are present
    expect(screen.getByTestId('safe-root-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('providers')).toBeInTheDocument();
    expect(screen.getByTestId('template-content')).toBeInTheDocument();
    
    // Check that the child content is rendered
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('maintains correct component hierarchy', () => {
    const testContent = <span>Nested Content</span>;
    
    render(<Template>{testContent}</Template>);

    // Check the nesting order: SafeRootWrapper > Providers > TemplateContent > children
    const safeWrapper = screen.getByTestId('safe-root-wrapper');
    const providers = screen.getByTestId('providers');
    const templateContent = screen.getByTestId('template-content');
    const content = screen.getByText('Nested Content');

    expect(safeWrapper).toBeInTheDocument();
    expect(providers).toBeInTheDocument();
    expect(templateContent).toBeInTheDocument();
    expect(content).toBeInTheDocument();
    
    // Verify hierarchy using toContainElement
    expect(safeWrapper).toContainElement(providers);
    expect(providers).toContainElement(templateContent);
    expect(templateContent).toContainElement(content);
  });

  it('renders multiple children correctly', () => {
    const multipleChildren = (
      <>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
        <div data-testid="child-3">Child 3</div>
      </>
    );

    render(<Template>{multipleChildren}</Template>);

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
    expect(screen.getByTestId('child-3')).toBeInTheDocument();
  });

  it('renders with empty children', () => {
    render(<Template>{null}</Template>);

    // All wrappers should still be present even with no children
    expect(screen.getByTestId('safe-root-wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('providers')).toBeInTheDocument();
    expect(screen.getByTestId('template-content')).toBeInTheDocument();
    
    // But no actual content
    const templateContent = screen.getByTestId('template-content');
    expect(templateContent).toBeEmptyDOMElement();
  });

  it('preserves React element props through wrappers', () => {
    const TestComponent = () => (
      <button type="submit" className="test-class" onClick={() => {}}>
        Click Me
      </button>
    );

    render(
      <Template>
        <TestComponent />
      </Template>
    );

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
    expect(button).toHaveClass('test-class');
    expect(button).toHaveTextContent('Click Me');
  });

  it('handles complex nested structures', () => {
    const complexStructure = (
      <div data-testid="outer">
        <header data-testid="header">
          <h1>Title</h1>
        </header>
        <main data-testid="main">
          <section data-testid="section">
            <p>Content</p>
          </section>
        </main>
        <footer data-testid="footer">
          <span>Footer</span>
        </footer>
      </div>
    );

    render(<Template>{complexStructure}</Template>);

    // Verify all parts of the complex structure are rendered
    expect(screen.getByTestId('outer')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
    expect(screen.getByTestId('section')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
    
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('renders React fragments correctly', () => {
    const fragmentContent = (
      <>
        <div>First</div>
        <div>Second</div>
      </>
    );

    render(<Template>{fragmentContent}</Template>);

    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('handles conditional rendering within children', () => {
    const ConditionalComponent = ({ show }: { show: boolean }) => (
      <>{show && <div data-testid="conditional">Shown</div>}</>
    );

    const { rerender } = render(
      <Template>
        <ConditionalComponent show={false} />
      </Template>
    );

    // Initially not shown
    expect(screen.queryByTestId('conditional')).not.toBeInTheDocument();

    // Re-render with show=true
    rerender(
      <Template>
        <ConditionalComponent show={true} />
      </Template>
    );

    // Now it should be shown
    expect(screen.getByTestId('conditional')).toBeInTheDocument();
    expect(screen.getByText('Shown')).toBeInTheDocument();
  });
});