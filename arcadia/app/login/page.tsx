import { OAuthButtons } from '@/components/auth/oauth-buttons'

export default function LoginPage() {
  return (
    <div className="container max-w-md mx-auto py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Welcome to Arcadia</h1>
        <p className="text-muted-foreground">
          Choose your preferred way to sign in
        </p>
      </div>
      <OAuthButtons />
    </div>
  )
} 