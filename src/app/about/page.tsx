import type { Metadata } from 'next';
import { RouteErrorBoundary } from '@/components/error-boundaries';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { NeonText } from '@/components/ui/NeonText';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  ChevronRight,
  Users,
  Trophy,
  Gamepad2,
  MessageSquare,
} from '@/components/ui/Icons';

export const metadata: Metadata = {
  title: 'About Arcadia - Gaming Community Platform',
  description:
    'Learn about Arcadia, our mission, and the team behind the gaming community platform.',
};

export default function AboutPage() {
  return (
    <RouteErrorBoundary routeName="About">
      <CyberpunkBackground
        variant="grid"
        intensity="subtle"
        className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30"
      >
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="mb-16 text-center">
            <h1 className="mb-6">
              <NeonText
                variant="solid"
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
              >
                About Arcadia
              </NeonText>
            </h1>
            <p className="mx-auto max-w-3xl text-lg leading-relaxed text-cyan-200/80 sm:text-xl">
              Welcome to Arcadia, a comprehensive gaming community platform
              designed to bring gamers together through challenges,
              competitions, and collaborative gameplay.
            </p>
          </div>

          {/* Mission Section */}
          <Card variant="primary" className="mx-auto mb-12 max-w-4xl">
            <CardHeader>
              <CardTitle className="neon-glow-cyan text-center text-3xl">
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-lg leading-relaxed text-cyan-200/90">
                Our mission is to create an inclusive and engaging environment
                where gamers of all skill levels can connect, compete, and grow
                together. We believe in the power of community-driven gaming
                experiences.
              </p>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="mb-16">
            <h2 className="mb-12 text-center">
              <NeonText
                variant="solid"
                className="text-3xl sm:text-4xl md:text-5xl"
              >
                Features
              </NeonText>
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <Card
                variant="primary"
                className="group h-full transition-all hover:scale-105"
              >
                <CardHeader className="text-center">
                  <div className="cyber-card mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-cyan-500/50">
                    <Gamepad2 className="h-8 w-8 text-cyan-400" />
                  </div>
                  <CardTitle className="neon-glow-cyan text-xl">
                    Interactive Bingo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-cyan-200/80">
                    Themed bingo boards with real-time multiplayer gameplay
                  </p>
                </CardContent>
              </Card>

              <Card
                variant="primary"
                className="group h-full transition-all hover:scale-105"
              >
                <CardHeader className="text-center">
                  <div className="cyber-card mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-purple-500/50">
                    <Users className="h-8 w-8 text-purple-400" />
                  </div>
                  <CardTitle className="neon-glow-purple text-xl">
                    Community Events
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-cyan-200/80">
                    Join tournaments, streams, and developer meetups
                  </p>
                </CardContent>
              </Card>

              <Card
                variant="primary"
                className="group h-full transition-all hover:scale-105"
              >
                <CardHeader className="text-center">
                  <div className="cyber-card mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-emerald-500/50">
                    <Trophy className="h-8 w-8 text-emerald-400" />
                  </div>
                  <CardTitle className="neon-glow-emerald text-xl">
                    Achievement Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-cyan-200/80">
                    Track your progress and earn rewards for gaming milestones
                  </p>
                </CardContent>
              </Card>

              <Card
                variant="primary"
                className="group h-full transition-all hover:scale-105"
              >
                <CardHeader className="text-center">
                  <div className="cyber-card mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border-fuchsia-500/50">
                    <MessageSquare className="h-8 w-8 text-fuchsia-400" />
                  </div>
                  <CardTitle className="neon-glow-fuchsia text-xl">
                    Live Chat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center text-cyan-200/80">
                    Connect with players in real-time during games
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center">
            <h2 className="mb-8 text-2xl font-bold text-cyan-200">
              Ready to Join the Adventure?
            </h2>
            <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
              <Link href="/play-area">
                <Button
                  variant="primary"
                  size="lg"
                  className="px-8 py-4 text-lg"
                >
                  <Gamepad2 className="mr-2 h-6 w-6" />
                  Start Playing
                </Button>
              </Link>
              <Link href="/community">
                <Button
                  variant="secondary"
                  size="lg"
                  className="px-8 py-4 text-lg"
                >
                  <Users className="mr-2 h-6 w-6" />
                  Join Community
                </Button>
              </Link>
              <Link href="/">
                <Button
                  variant="secondary"
                  size="lg"
                  className="px-8 py-4 text-lg"
                >
                  Back to Home
                  <ChevronRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </CyberpunkBackground>
    </RouteErrorBoundary>
  );
}
