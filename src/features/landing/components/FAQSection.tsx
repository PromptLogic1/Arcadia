'use client';

import React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { NeonText } from '@/components/ui/NeonText';
import CyberpunkBackground from '@/components/ui/CyberpunkBackground';
import FloatingElements from '@/components/ui/FloatingElements';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const faqs: readonly FAQ[] = [
  {
    id: 'what-is-arcadia',
    question: 'What is Arcadia?',
    answer:
      'Arcadia is a cutting-edge gaming platform that combines innovative challenges, multiplayer bingo games, and community features to create an immersive cyberpunk gaming experience with real-time multiplayer capabilities.',
  },
  {
    id: 'how-to-join',
    question: 'How can I join the community?',
    answer:
      'You can join our community by creating a free account, participating in our forums, joining live multiplayer games, attending virtual events, and connecting with fellow gamers from around the world.',
  },
  {
    id: 'is-arcadia-free',
    question: 'Is Arcadia free to use?',
    answer:
      'Yes! Arcadia offers extensive free features including multiplayer bingo games, community access, and basic challenges. We also provide premium features for enhanced gaming experiences and exclusive content.',
  },
  {
    id: 'multiplayer-games',
    question: 'What multiplayer games are available?',
    answer:
      'Currently we feature real-time multiplayer bingo with various themed boards, tournaments, and competitive challenges. More game modes are being developed based on community feedback.',
  },
  {
    id: 'system-requirements',
    question: 'What are the system requirements?',
    answer:
      'Arcadia runs in modern web browsers with no downloads required. For the best experience, we recommend Chrome, Firefox, or Safari with a stable internet connection for real-time multiplayer features.',
  },
] as const;

const FAQSection: React.FC = () => {
  return (
    <CyberpunkBackground
      variant="circuit"
      intensity="subtle"
      className="bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900/95 py-24"
    >
      <FloatingElements
        variant="circuits"
        count={15}
        speed="slow"
        color="purple"
        repositioning={true}
      />
      <section className="relative z-20" aria-labelledby="faq-heading">
        <div className="container mx-auto flex flex-col items-center px-4">
          <h2 id="faq-heading" className="mb-16 text-center">
            <NeonText
              variant="gradient"
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl"
            >
              FAQ
            </NeonText>
          </h2>
          <div className="mx-auto w-full max-w-4xl">
            <Accordion type="single" collapsible>
              {faqs.map(faq => (
                <AccordionItem
                  key={faq.id}
                  value={faq.id}
                  className="cyber-card mb-6 rounded-lg border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                >
                  <AccordionTrigger
                    className="px-8 py-6 text-xl font-semibold text-cyan-200 transition-colors hover:text-cyan-300 [&[data-state=open]]:text-cyan-300"
                    aria-expanded={false}
                  >
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-8 pb-6 text-base leading-relaxed text-cyan-100/90">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </CyberpunkBackground>
  );
};

export default React.memo(FAQSection);
