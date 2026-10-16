// Contact form options and wording. The values are the BeyondAi Admin enquiry API's enums (`POST /api/leads`),
// which rejects anything else; the labels are what the form shows.

export const topics = [
  ['BOOK_CONSULTATION', 'Book a consultation'],
  ['PRODUCT_DEMO', 'Product demo'],
  ['AI_EDUCATION', 'AI Education course enquiry'],
  ['CORPORATE_TRAINING', 'Corporate or team AI training'],
  ['PARTNERSHIP', 'Partnership'],
  ['TECHNICAL_SUPPORT', 'Technical support'],
  ['OTHER', 'Something else'],
] as const;

export type TopicValue = (typeof topics)[number][0];

/** `/contact?topic=` links elsewhere on the site use these short names; the form maps them to the API values. */
export const topicAliases: Record<string, TopicValue> = {
  consultation: 'BOOK_CONSULTATION',
  demo: 'PRODUCT_DEMO',
  course: 'AI_EDUCATION',
  training: 'CORPORATE_TRAINING',
  partnership: 'PARTNERSHIP',
  support: 'TECHNICAL_SUPPORT',
  other: 'OTHER',
};

/** Labels match the service and product names, so `?service=` / `?product=` links preselect the right one. */
export const interestAreas = [
  ['NOT_SURE', 'Not sure yet'],
  ['CLOUD_MODERNIZATION', 'Cloud Modernization'],
  ['AI_ANALYTICS', 'AI & Analytics'],
  ['CYBERSECURITY_COMPLIANCE', 'Cybersecurity & Compliance'],
  ['SOFTWARE_DEVELOPMENT', 'Software Development'],
  ['MANAGED_SERVICES', 'Managed Services'],
  ['RESOURCE_AUGMENTATION', 'Resource Augmentation'],
  ['HRM_SOFTWARE', 'HRM Software'],
  ['ERP', 'ERP'],
  ['COUNT_TRUST', 'Count Trust'],
  ['TALKORA_AI', 'Talkora AI'],
  ['AGENTIC_AI', 'Agentic AI'],
  ['AI_EDUCATION', 'AI Education'],
] as const;

export type InterestValue = (typeof interestAreas)[number][0];

/** Consent checkbox label, pending legal approval: `before` + linked `linkText` + `after`. */
export const consentNotice = {
  before: 'I agree to the processing of my personal data as described in the ',
  linkText: 'privacy notice',
  href: 'https://beyondai.ph/privacy',
  after: '.',
};
