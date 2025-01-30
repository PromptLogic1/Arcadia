export const serverLog = async (message: string, details?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    try {
      await fetch('/api/auth/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, details }),
      })
    } catch (error) {
      // Fallback to client logging if server logging fails
      console.log('[Auth]', message)
      if (details) console.log('[Details]', details)
    }
  }
} 