'use client';

import React from 'react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { NeonText } from '@/components/ui/NeonText';

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
      'Arcadia is a gaming platform offering innovative challenges and experiences.',
  },
  {
    id: 'how-to-join',
    question: 'How can I join the community?',
    answer:
      'You can join our community by signing up on our website and participating in forums and events.',
  },
  {
    id: 'is-arcadia-free',
    question: 'Is Arcadia free to use?',
    answer:
      'Yes, Arcadia offers a range of free challenges and games. Premium content is also available.',
  },
] as const;

const FAQSection: React.FC = () => {
  return (
    <section className="bg-gradient-to-b from-gray-900 via-gray-950 to-gray-900 py-24 text-gray-100">
      <div className="container mx-auto flex flex-col items-center px-4">
        <h2 className="mb-14 text-center text-4xl font-bold md:text-5xl">
          <NeonText>Frequently Asked Questions</NeonText>
        </h2>
        <div className="mx-auto w-full max-w-3xl">
          <Accordion type="single" collapsible>
            {faqs.map(faq => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="mb-4 rounded-lg border border-cyan-500/20 bg-gray-800/80 shadow-lg"
              >
                <AccordionTrigger className="px-6 py-4 text-xl font-semibold text-cyan-200 hover:text-cyan-300">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-6 text-cyan-100">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default React.memo(FAQSection);
