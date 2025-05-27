export const metadata = {
  title: 'Authentication - Arcadia',
  description: 'Sign in or create an account for Arcadia Gaming Platform',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gray-900">
      <div className="w-full max-w-md space-y-4">
        {children}
      </div>
    </div>
  )
} 