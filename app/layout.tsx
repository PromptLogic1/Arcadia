import { type Metadata } from 'next'
import { Inter } from 'next/font/google'
import Header from './_components/Header'
import Footer from './_components/Footer'
import ScrollToTop from '@/components/ui/ScrollToTop'
import { Providers } from './Providers'
import './globals.css'
import { Analytics } from '@vercel/analytics/react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Arcadia',
  description: 'Gaming Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <ScrollToTop />
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}