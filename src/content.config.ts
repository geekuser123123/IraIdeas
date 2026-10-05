import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { CATEGORY_SLUGS } from './data/categories';

/**
 * Every content type carries a publication state. Only "published" entries
 * appear on the live site; "draft" and "review" entries render only on
 * staging builds with PUBLIC_SHOW_DRAFTS=true.
 */
const publication = z.enum(['draft', 'review', 'published']).default('draft');
const faq = z.object({ question: z.string(), answer: z.string() });

const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: z.object({
    name: z.string(), // approved technical service name, preserved as-is
    subtitle: z.string(), // plain-English subtitle
    category: z.enum(CATEGORY_SLUGS),
    summary: z.string(), // one sentence: the situation it addresses
    relevance: z.array(z.string()).default([]),
    questions: z.array(z.string()).default([]),
    includes: z.array(z.string()).default([]),
    exclusions: z.array(z.string()).default([]),
    howToBegin: z.array(z.string()).optional(),
    faqs: z.array(faq).max(5).default([]),
    fee: z
      .object({
        display: z.enum(['none', 'fixed', 'starting']).default('none'),
        amount: z.number().optional(),
        note: z.string().optional(),
      })
      .default({ display: 'none' }),
    relatedLearning: z.array(reference('resources')).default([]),
    reviewer: z.string().optional(),
    order: z.number().default(100),
    publication,
  }),
});

const EVENT_STATUS = ['announced', 'applications-open', 'registration-open', 'sold-out', 'completed', 'postponed', 'canceled'] as const;

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    format: z.enum(['live', 'workshop', 'private-session', 'private-intensive']),
    status: z.enum(EVENT_STATUS),
    statusNotice: z.string().optional(), // required wording for postponed or canceled events
    summary: z.string(),
    startDate: z.string(), // YYYY-MM-DD, in the event timezone
    endDate: z.string().optional(),
    timezone: z.string().default('America/Chicago'),
    delivery: z.enum(['in-person', 'virtual', 'hybrid']).default('in-person'),
    location: z.string(),
    instructor: reference('people'),
    price: z.number().nullable(), // full price in USD
    installments: z
      .object({
        deposit: z.number(),
        balance: z.number(),
        balanceDue: z.string(),
        conditions: z.string(),
      })
      .optional(),
    capacity: z.string().optional(), // paid participant capacity, worded as approved
    guestPolicy: z.string().optional(), // accompanying professionals, kept separate from capacity
    audience: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    inclusions: z.array(z.string()).default([]),
    experience: z
      .object({ preparation: z.string().optional(), event: z.string().optional(), followUp: z.string().optional() })
      .default({}),
    schedule: z.array(z.object({ day: z.string(), time: z.string(), detail: z.string() })).default([]),
    logistics: z
      .object({
        venue: z.string().optional(),
        arrival: z.string().optional(),
        accommodation: z.string().optional(),
        bring: z.string().optional(),
      })
      .default({}),
    terms: z.array(faq).default([]), // admission, cancellation, refunds, transfers, guests, recording, confidentiality
    paymentUrl: z.url().optional(), // approved Stripe Payment Link, for direct registration
    unlisted: z.boolean().default(false), // team-shared page: not listed, not indexed
    featured: z.boolean().default(false),
    publication,
  }),
});

const resources = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/resources' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    topic: z.enum(CATEGORY_SLUGS),
    format: z.enum(['article', 'video', 'briefing', 'guide', 'lesson']),
    audience: z.string(),
    author: reference('people'),
    reviewer: reference('people').optional(),
    publishedDate: z.string(),
    reviewedDate: z.string().optional(),
    duration: z.string().optional(),
    video: z.object({ embedUrl: z.url(), captionsAvailable: z.boolean() }).optional(),
    transcript: z.string().optional(),
    relatedService: reference('services').optional(),
    publication,
  }),
});

const courses = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/courses' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    objectives: z.array(z.string()).default([]),
    audience: z.string(),
    prerequisites: z.array(z.string()).default([]),
    instructor: reference('people'),
    modules: z
      .array(
        z.object({
          title: z.string(),
          lessons: z.array(z.object({ title: z.string(), resource: reference('resources').optional() })),
        }),
      )
      .default([]),
    supportingResources: z.array(reference('resources')).default([]),
    reviewedDate: z.string().optional(),
    relatedServices: z.array(reference('services')).default([]),
    entirelyFree: z.boolean().default(false), // "Free" label only when the whole course is free
    publication,
  }),
});

const people = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/people' }),
  schema: z.object({
    name: z.string(),
    role: z.string(),
    photo: z.string().optional(),
    photoAlt: z.string().optional(),
    credentials: z.array(z.string()).default([]), // verified credentials only
    order: z.number().default(100),
    publication,
  }),
});

const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/testimonials' }),
  schema: z.object({
    quote: z.string(),
    attribution: z.string(),
    permissionRecord: z.string(), // where written permission is stored
    placements: z.array(z.enum(['home', 'services', 'conferences', 'about'])).default(['home']),
    publication,
  }),
});

export const collections = { services, events, resources, courses, people, testimonials };
