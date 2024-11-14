export default function AuthCallbackLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-900">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          Verifying...
        </h1>
        <p className="text-gray-400">
          Please wait while we verify your email address.
        </p>
      </div>
    </div>
  )
} 