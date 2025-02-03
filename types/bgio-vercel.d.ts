declare module 'bgio-vercel' {
  export interface WorkerRouteOptions {
    retries: number;
    timeout: number;
  }

  export interface WorkerOptions {
    concurrency: number;
    ttl: number;
    routes: {
      [route: string]: WorkerRouteOptions;
    };
  }

  // The createWorker function creates and returns a worker instance.
  // Adjust the return type as needed.
  export function createWorker(options: WorkerOptions): unknown;
} 