import type { Metadata } from 'next'
import About from './_components/about'

export const metadata: Metadata = {
  title: 'About Arcadia - Gaming Community Platform',
  description: 'Learn about Arcadia, our mission, and the team behind the gaming community platform.',
}

export default function AboutPage() {
  return <About />
}
