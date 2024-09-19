import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Arcadia - Gaming Community Platform",
  description: "Join Arcadia, the ultimate gaming community platform for challenges, discussions, and events.",
  keywords: ["gaming", "community", "challenges", "esports", "events"],
  openGraph: {
    title: "Arcadia - Gaming Community Platform",
    description: "Join Arcadia, the ultimate gaming community platform for challenges, discussions, and events.",
    images: [{ url: "/og-image.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arcadia - Gaming Community Platform",
    description: "Join Arcadia, the ultimate gaming community platform for challenges, discussions, and events.",
    images: ["/twitter-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-gray-100`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <ErrorBoundary>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-grow">{children}</main>
              <Footer />
            </div>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}