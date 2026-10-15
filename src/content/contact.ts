// Contact form options. Shared by the form (client) and the server action, which only accepts these values.
import { products } from './products';
import { services } from './services';

export const topics = [
  ['consultation', 'Book a consultation'],
  ['demo', 'Product demo'],
  ['course', 'AI Education course enquiry'],
  ['training', 'Corporate or team AI training'],
  ['partnership', 'Partnership'],
  ['support', 'Technical support'],
  ['other', 'Something else'],
] as const;

export type TopicValue = (typeof topics)[number][0];

export const interests: string[] = [...services.map(s => s.name), ...products.map(p => p.name), 'AI Education'];
