import { Loader2 } from '@/components/ui/Icons';

export default function AuthLoader() {
  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Initializing authentication...
        </p>
      </div>
    </div>
  );
}
