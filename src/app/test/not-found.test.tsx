import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import NotFound from '../not-found';

// Mock Next.js components and dependencies
jest.mock('next/link', () => {
  const MockLink = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('@/components/error-boundaries', () => ({
  RouteErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/NeonText', () => ({
  NeonText: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

jest.mock('@/components/ui/CyberpunkBackground', () => {
  const MockCyberpunkBackground = ({ children }: { children: React.ReactNode }) => (
    <div data-testid="cyberpunk-background">{children}</div>
  );
  MockCyberpunkBackground.displayName = 'MockCyberpunkBackground';
  return MockCyberpunkBackground;
});

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h3>{children}</h3>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ 
    children, 
    onClick, 
    className,
    variant,
    size 
  }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    className?: string;
    variant?: string;
    size?: string;
  }) => (
    <button 
      onClick={onClick} 
      className={className}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Icons', () => ({
  Home: () => <svg data-testid="home-icon" />,
  Search: () => <svg data-testid="search-icon" />,
  ArrowLeft: () => <svg data-testid="arrow-left-icon" />,
  MapPin: () => <svg data-testid="map-pin-icon" />,
}));

// Mock window.history.back
const mockHistoryBack = jest.fn();
Object.defineProperty(window, 'history', {
  value: {
    back: mockHistoryBack,
  },
  writable: true,
});

describe('NotFound Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the 404 page with all key elements', () => {
    render(<NotFound />);

    // Check main content
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page Not Found')).toBeInTheDocument();
    expect(screen.getByText(/Looks like this page got lost in the digital void/)).toBeInTheDocument();

    // Check helpful content
    expect(screen.getByText('What can you do?')).toBeInTheDocument();
    expect(screen.getByText('Check the URL for typing errors')).toBeInTheDocument();
    expect(screen.getByText('Use the navigation to find what you\'re looking for')).toBeInTheDocument();
    expect(screen.getByText('Try searching for content from the home page')).toBeInTheDocument();
    expect(screen.getByText('Go back to the previous page using your browser')).toBeInTheDocument();

    // Check navigation buttons
    expect(screen.getByText('Back to Home')).toBeInTheDocument();
    expect(screen.getByText('Browse Games')).toBeInTheDocument();
    expect(screen.getByText('Go Back')).toBeInTheDocument();

    // Check support message
    expect(screen.getByText(/If you believe this is an error/)).toBeInTheDocument();
  });

  it('renders with proper styling components', () => {
    render(<NotFound />);

    // Check that CyberpunkBackground is rendered
    expect(screen.getByTestId('cyberpunk-background')).toBeInTheDocument();

    // Check for icons
    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('map-pin-icon')).toBeInTheDocument();
  });

  it('has correct navigation links', () => {
    render(<NotFound />);

    // Check home link
    const homeLink = screen.getByRole('link', { name: /back to home/i });
    expect(homeLink).toHaveAttribute('href', '/');

    // Check play area link
    const playAreaLink = screen.getByRole('link', { name: /browse games/i });
    expect(playAreaLink).toHaveAttribute('href', '/play-area');
  });

  it('handles go back button click', async () => {
    const user = userEvent.setup();
    render(<NotFound />);

    const goBackButton = screen.getByRole('button', { name: /go back/i });
    await user.click(goBackButton);

    expect(mockHistoryBack).toHaveBeenCalledTimes(1);
  });

  it('renders button variants correctly', () => {
    render(<NotFound />);

    const buttons = screen.getAllByRole('button');
    
    // Find buttons by their text content
    const homeButton = buttons.find(btn => btn.textContent?.includes('Back to Home'));
    const browseButton = buttons.find(btn => btn.textContent?.includes('Browse Games'));
    const backButton = buttons.find(btn => btn.textContent?.includes('Go Back'));

    expect(homeButton).toHaveAttribute('data-variant', 'primary');
    expect(homeButton).toHaveAttribute('data-size', 'lg');
    
    expect(browseButton).toHaveAttribute('data-variant', 'secondary');
    expect(browseButton).toHaveAttribute('data-size', 'lg');
    
    expect(backButton).toHaveAttribute('data-variant', 'secondary');
    expect(backButton).toHaveAttribute('data-size', 'lg');
  });

  it('renders within RouteErrorBoundary', () => {
    render(<NotFound />);
    
    // Since RouteErrorBoundary is mocked to just wrap children in a div,
    // we can check that the main content is rendered
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByTestId('cyberpunk-background')).toBeInTheDocument();
  });

  it('displays bullet points for help items', () => {
    render(<NotFound />);

    // Check that all 4 help items are rendered
    expect(screen.getByText('Check the URL for typing errors')).toBeInTheDocument();
    expect(screen.getByText('Use the navigation to find what you\'re looking for')).toBeInTheDocument();
    expect(screen.getByText('Try searching for content from the home page')).toBeInTheDocument();
    expect(screen.getByText('Go back to the previous page using your browser')).toBeInTheDocument();
  });

  it('has responsive text sizing classes', () => {
    render(<NotFound />);

    // Check that 404 text has responsive classes
    const neonText = screen.getByText('404');
    expect(neonText).toHaveClass('text-6xl', 'sm:text-7xl', 'md:text-8xl', 'lg:text-9xl');

    // Check that subtitle has responsive classes
    const subtitle = screen.getByText('Page Not Found');
    expect(subtitle).toHaveClass('text-2xl', 'sm:text-3xl');
  });
});