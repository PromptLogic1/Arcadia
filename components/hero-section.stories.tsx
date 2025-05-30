import type { Meta, StoryObj } from "@storybook/react"
import HeroSection from "./hero-section"
import type { Challenge } from "./hero-section"

const mockChallenges: Challenge[] = [
  { id: "1", name: "Speed Demon Challenge" },
  { id: "2", name: "Puzzle Master Quest" },
  { id: "3", name: "Arcade Legend Tournament" },
  { id: "4", name: "Retro Gaming Marathon" },
]

const meta: Meta<typeof HeroSection> = {
  title: "Components/HeroSection",
  component: HeroSection,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    currentChallenge: {
      control: { type: "number", min: 0, max: mockChallenges.length - 1 },
    },
    onStartPlaying: { action: "start playing clicked" },
    onJoinCommunity: { action: "join community clicked" },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    currentChallenge: 0,
    challenges: mockChallenges,
  },
}

export const WithDifferentChallenge: Story = {
  args: {
    currentChallenge: 2,
    challenges: mockChallenges,
  },
}

export const EmptyChallenges: Story = {
  args: {
    currentChallenge: 0,
    challenges: [],
  },
}
