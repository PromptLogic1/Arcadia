import HeroSection from "@/components/hero-section"

export default function Home() {
  const challenges = [
    { id: "1", name: "Pixel Adventure" },
    { id: "2", name: "Neon Racer" },
    { id: "3", name: "Cosmic Quest" },
  ]

  return (
    <main>
      <HeroSection currentChallenge={0} challenges={challenges} />
    </main>
  )
}
