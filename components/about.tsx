'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  Github,
  Linkedin,
  Mail,
  Gamepad2,
  Trophy,
  Puzzle
} from 'lucide-react'
import NeonText from '@/components/ui/NeonText'
import NeonBorder from '@/components/ui/NeonBorder'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface TeamMember {
  name: string
  role: string
  bio: string
  image: string
  links: {
    github?: string
    linkedin?: string
    email?: string
  }
}

interface Value {
  icon: React.ElementType
  title: string
  description: string
}

const teamMembers: TeamMember[] = [
  {
    name: 'Daniel Lendle',
    role: 'Founder & Lead Developer',
    bio: 'Passionate gamer and developer dedicated to creating new ways for players to experience and share their favorite games.',
    image: '/team/daniel.jpg',
    links: {
      github: 'https://github.com/PromptLogic',
      linkedin: 'https://linkedin.com/company/promptlogic',
      email: 'mailto:business@promptlogic.de'
    }
  },
  {
    name: 'Jakob Zirngibl',
    role: 'Founder & Lead Developer',
    bio: 'Gaming enthusiast and developer focused on building innovative features that enhance the way we experience and share games.',
    image: '/team/jakob.jpg',
    links: {
      github: 'https://github.com/PromptLogic',
      linkedin: 'https://linkedin.com/company/promptlogic',
      email: 'mailto:business@promptlogic.de'
    }
  }
]

const values: Value[] = [
  {
    icon: Gamepad2,
    title: 'Rediscover Your Favorites',
    description: 'Breathe new life into your favorite games through custom challenges and unique experiences. Create, compete, and experience your beloved titles in ways you never imagined.'
  },
  {
    icon: Trophy,
    title: 'Community Challenges',
    description: 'Join a vibrant community of passionate gamers who create and share exciting challenges. From speed runs to achievement hunts, discover endless ways to play.'
  },
  {
    icon: Puzzle,
    title: 'Custom Gaming Experience',
    description: 'Shape your gaming journey exactly how you want it. Create personal challenges, compete with friends, and discover new ways to enjoy your favorite titles. Your game, your rules, your experience.'
  }
]

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-fuchsia-500/5" />
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-8">
              <NeonText>Redefining the Way You Play</NeonText>
            </h1>
            <p className="text-xl md:text-2xl text-cyan-100 leading-relaxed">
              We&apos;re transforming how you experience your favorite games, 
              bringing new life to cherished classics and fresh excitement to every playthrough.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <NeonBorder className="p-2">
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6">
                <motion.div
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  viewport={{ once: true }}
                  className="text-center"
                >
                  <h2 className="text-4xl md:text-5xl font-bold mb-6">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
                      Our Vision
                    </span>
                  </h2>
                  <p className="text-xl text-cyan-100 leading-relaxed">
                    Everyone has those favorite games - the ones we return to, again and again. 
                    At Arcadia, we&apos;re creating a platform where you can rediscover these beloved 
                    titles through custom challenges, competitions, and shared experiences that 
                    make every playthrough feel fresh and exciting.
                  </p>
                </motion.div>
              </div>
            </NeonBorder>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-fuchsia-500/10 backdrop-blur-xl" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              <NeonText>The Future of Gaming</NeonText>
            </h2>
            <p className="text-xl text-cyan-100 leading-relaxed">
              Imagine speed runs against friends, custom achievement challenges, 
              Bingo battles, and endless possibilities to make your favorite games 
              feel new again. Though we&apos;re just beginning this journey, our vision 
              is clear: to create a platform where every gamer can craft their own 
              unique experiences in the games they love most.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-24 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            <NeonText>What Drives Us</NeonText>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.1,
                  ease: "easeOut" 
                }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 } 
                }}
                className="relative isolate flex"
              >
                <div className="flex-1">
                  <NeonBorder>
                    <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg p-8">
                      <div className="flex flex-col items-center">
                        <div className="rounded-full bg-gradient-to-br from-cyan-500/10 to-fuchsia-500/10 p-4 w-16 h-16 flex items-center justify-center border border-cyan-500/20 mb-6">
                          <value.icon className="w-8 h-8 text-cyan-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-center mb-4">
                          {value.title}
                        </h3>
                        <p className="text-lg text-cyan-100 leading-relaxed text-center">
                          {value.description}
                        </p>
                      </div>
                    </div>
                  </NeonBorder>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-24 bg-gray-800/50 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16">
            <NeonText>Meet the Team</NeonText>
          </h2>
          <div className="flex flex-col md:flex-row justify-center items-stretch gap-12 max-w-5xl mx-auto">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.1,
                  ease: "easeOut"
                }}
                viewport={{ once: true }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 } 
                }}
                className="flex-1 max-w-md mx-auto w-full"
              >
                <NeonBorder>
                  <div className="p-8 bg-gray-800/80 backdrop-blur-sm rounded-lg h-full flex flex-col">
                    <div className="relative w-48 h-48 mx-auto mb-6 rounded-full overflow-hidden border-2 border-cyan-500/20">
                      <Image
                        src={member.image}
                        alt={member.name}
                        fill
                        className="object-cover transition-transform duration-300 hover:scale-110"
                        sizes="(max-width: 768px) 192px, 192px"
                        priority={index === 0}
                      />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-center">
                      {member.name}
                    </h3>
                    <p className="text-lg text-cyan-400 mb-4 text-center">{member.role}</p>
                    <p className="text-cyan-100 mb-8 text-center leading-relaxed flex-grow">
                      {member.bio}
                    </p>
                    <div className="flex justify-center space-x-4 mt-auto">
                      {Object.entries(member.links).map(([key, url]) => (
                        url && (
                          <Button
                            key={key}
                            variant="ghost"
                            size="icon"
                            asChild
                            className="text-cyan-400 hover:text-cyan-300 transition-colors duration-200"
                          >
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              aria-label={`${member.name}'s ${key}`}
                            >
                              {key === 'github' && <Github className="w-5 h-5" />}
                              {key === 'linkedin' && <Linkedin className="w-5 h-5" />}
                              {key === 'email' && <Mail className="w-5 h-5" />}
                            </a>
                          </Button>
                        )
                      ))}
                    </div>
                  </div>
                </NeonBorder>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-fuchsia-500/10 backdrop-blur-xl" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              <NeonText>Let&apos;s Connect!</NeonText>
            </h2>
            <p className="text-xl text-cyan-100 mb-12 max-w-2xl mx-auto leading-relaxed">
              Got ideas, questions, or just want to chat about games? 
              We&apos;d love to hear from you!
            </p>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                className="bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white px-12 py-4 rounded-full text-lg font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-fuchsia-500/25 transition-all duration-300"
                asChild
              >
                <a href="mailto:business@promptlogic.de">Get in Touch</a>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}

export default About
