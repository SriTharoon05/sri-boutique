import { Metadata } from 'next';
import { MainLayout } from '@/components/layout/main-layout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const metadata: Metadata = {
  title: 'FAQ | Sri Boutique',
  description: 'Frequently asked questions about orders, shipping, returns, and payments at Sri Boutique.',
};

const faqs = [
  {
    question: 'How long does delivery take?',
    answer:
      'Orders are typically processed within 1–2 business days and delivered within 4–7 business days depending on your location within India.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit and debit cards, UPI, and net banking through our secure payment partner, Razorpay.',
  },
  {
    question: 'Can I return or exchange an item?',
    answer:
      'Yes, we accept returns and exchanges within 7 days of delivery, as long as the item is unused and in its original condition. See our Returns page for full details.',
  },
  {
    question: 'Do you offer Cash on Delivery (COD)?',
    answer:
      'Currently, we accept online payments only through our secure checkout. We may add COD as an option in the future.',
  },
  {
    question: 'How do I track my order?',
    answer:
      'Once your order ships, you\'ll receive a tracking link via email, and you can also check your order status anytime on your Account > Orders page.',
  },
  {
    question: 'What if my order arrives damaged?',
    answer:
      'Please contact us within 48 hours of delivery with photos of the damaged item, and we\'ll arrange a free replacement or full refund.',
  },
  {
    question: 'Are your sarees Free Size?',
    answer:
      'Most of our sarees are Free Size, designed to comfortably fit a wide range of body types. Blouses and stitched items have specific sizes — check our Size Guide for details.',
  },
  {
    question: 'Do you ship internationally?',
    answer:
      'At this time, we only ship within India. We\'re working on expanding to international shipping in the future.',
  },
  {
    question: 'How can I leave a review?',
    answer:
      'Once your order is marked as delivered, you can leave a review directly from the product page — look for the "Write a Review" button.',
  },
  {
    question: 'How do I contact customer support?',
    answer:
      'Email us at sriboutiquestore@gmail.com or message us on Instagram @sriboutiquestore — we usually respond within 24 hours.',
  },
];

export default function FAQPage() {
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-2xl">
        <h1 className="font-display text-4xl font-semibold mb-4">
          Frequently Asked Questions
        </h1>
        <p className="text-muted-foreground mb-10">
          Can&apos;t find what you&apos;re looking for?{' '}
          <a href="/contact" className="text-primary hover:underline">
            Contact us directly
          </a>
          .
        </p>

        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </MainLayout>
  );
}