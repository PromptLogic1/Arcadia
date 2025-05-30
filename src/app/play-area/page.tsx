import type { Metadata } from 'next';
import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Play Area | Arcadia',
  description:
    'Choose your gaming challenge and start playing in the Arcadia platform.',
};

// Components will be implemented using the existing play-area features

export default function PlayAreaPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <Suspense fallback={<LoadingSpinner />}>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 text-center">
            <h1 className="mb-4 bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-4xl font-bold text-transparent">
              Play Area
            </h1>
            <p className="text-xl text-gray-300">
              Choose your challenge and start playing
            </p>
          </div>

          {/* Content will be loaded by feature components */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="hover:shadow-lg">
              <CardHeader>
                <CardTitle>Bingo Bonanza</CardTitle>
                <CardDescription>Create or join bingo games.</CardDescription>
              </CardHeader>
              <CardContent>
                <Image
                  src="/images/featured-games/bingo.webp"
                  alt="Bingo Bonanza"
                  width={400}
                  height={225}
                  className="rounded-lg object-cover"
                />
              </CardContent>
              <CardFooter>
                <Link href="/play-area/bingo">
                  <Button className="w-full">Play Bingo</Button>
                </Link>
              </CardFooter>
            </Card>
            <Card className="hover:shadow-lg">
              <CardHeader>
                <CardTitle>Quick Draw</CardTitle>
                <CardDescription>
                  Fast-paced drawing challenges.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Image
                  src="/images/featured-games/quickdraw.webp"
                  alt="Quick Draw"
                  width={400}
                  height={225}
                  className="rounded-lg object-cover"
                />
              </CardContent>
              <CardFooter>
                <Link href="/play-area/quick">
                  <Button className="w-full">Play Quick Draw</Button>
                </Link>
              </CardFooter>
            </Card>
            <Card className="hover:shadow-lg">
              <CardHeader>
                <CardTitle>Tournament Arena</CardTitle>
                <CardDescription>
                  Compete in various game tournaments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Image
                  src="/images/featured-games/tournament.webp"
                  alt="Tournament Arena"
                  width={400}
                  height={225}
                  className="rounded-lg object-cover"
                />
              </CardContent>
              <CardFooter>
                <Link href="/play-area/tournaments">
                  <Button className="w-full">Join Tournaments</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </Suspense>
    </div>
  );
}
