import { NextResponse } from 'next/server';

interface LivenessResponse {
  alive: boolean;
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  pid: number;
  version: string;
  environment: string;
}

/**
 * Liveness probe endpoint
 * Simple check to determine if the application process is alive and responsive
 * Should always return 200 unless the process is completely unresponsive
 */
export async function GET(): Promise<NextResponse<LivenessResponse>> {
  const memoryUsage = process.memoryUsage();

  const response: LivenessResponse = {
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round(
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      ),
    },
    pid: process.pid,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  return NextResponse.json(response, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
