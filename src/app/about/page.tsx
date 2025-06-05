import type { Metadata } from 'next';
import { RouteErrorBoundary } from '@/components/error-boundaries';

export const metadata: Metadata = {
  title: 'About Arcadia - Gaming Community Platform',
  description:
    'Learn about Arcadia, our mission, and the team behind the gaming community platform.',
};

export default function AboutPage() {
  return (
    <RouteErrorBoundary routeName="About">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-4xl font-bold">About Arcadia</h1>
        <div className="prose max-w-none">
          <p className="mb-4 text-lg">
            Welcome to Arcadia, a comprehensive gaming community platform
            designed to bring gamers together through challenges, competitions,
            and collaborative gameplay.
          </p>
          <h2 className="mb-4 text-2xl font-semibold">Our Mission</h2>
          <p className="mb-4">
            Our mission is to create an inclusive and engaging environment where
            gamers of all skill levels can connect, compete, and grow together.
            We believe in the power of community-driven gaming experiences.
          </p>
          <h2 className="mb-4 text-2xl font-semibold">Features</h2>
          <ul className="mb-4 list-disc pl-6">
            <li>Interactive Bingo Boards and Challenges</li>
            <li>Community Discussions and Events</li>
            <li>User Profiles and Achievement Tracking</li>
            <li>Real-time Multiplayer Sessions</li>
          </ul>
        </div>
      </div>
    </RouteErrorBoundary>
  );
}
