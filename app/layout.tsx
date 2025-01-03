import { type Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from './_components/ThemeProvider'
import  Header  from './_components/Header'
import  Footer  from './_components/Footer'
import ScrollToTop from '@/components/ui/ScrollToTop'
import './globals.css'

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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main>{children}</main>
          <Footer />
          <ScrollToTop />
        </ThemeProvider>
      </body>
    </html>
  )
}