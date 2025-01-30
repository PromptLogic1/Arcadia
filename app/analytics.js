import { Analytics } from '@vercel/analytics/react'

export function Providers({ children }) {
  return (
    <>
      {children}
      <Analytics />
    </>
  )
} 