'use client'

import React from 'react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import NeonText from '@/components/ui/NeonText'

interface FAQ {
  id: string
  question: string
  answer: string
}

const faqs: readonly FAQ[] = [
  {
    id: 'what-is-arcadia',
    question: 'What is Arcadia?',
    answer: 'Arcadia is a gaming platform offering innovative challenges and experiences.',
  },
  {
    id: 'how-to-join',
    question: 'How can I join the community?',
    answer: 'You can join our community by signing up on our website and participating in forums and events.',
  },
  {
    id: 'is-arcadia-free',
    question: 'Is Arcadia free to use?',
    answer: 'Yes, Arcadia offers a range of free challenges and games. Premium content is also available.',
  },
] as const

const FAQSection: React.FC = () => {
  return (
    <section className="py-20 bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-12">
          <NeonText>Frequently Asked Questions</NeonText>
        </h2>
        <Accordion type="single" collapsible>
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger className="text-xl font-semibold">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-cyan-100">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}

export default React.memo(FAQSection)