// Site-wide facts. Only confirmed BeyondAi information belongs here; open questions live in docs/implementation-report.md.
export const site = {
  brand: 'BeyondAi',
  url: 'https://beyondai.ph', // canonical production origin (assumed: the current BeyondAi domain)
  tagline: 'We don’t follow the future. We design it.',
  description: 'BeyondAi delivers AI, cloud, cybersecurity and enterprise software from Clark, Philippines — plus five AI-driven products and a no-code AI education program.',
  locale: 'en_PH',
  timeZone: 'Asia/Manila',
  location: {
    primary: 'Clark, Philippines', // primary location per brief; no street address has been confirmed
    locality: 'Clark',
    country: 'PH',
    market: 'Metro Manila', // service-area reference only; not an office
  },
  email: 'sakib@beyondai.ph', // published on beyondai.ph
  phone: { display: '+44 7512 549837', href: '+447512549837' }, // published on beyondai.ph (UK number)
  social: [
    { name: 'LinkedIn', href: 'https://www.linkedin.com/company/beyond_ai.manila/' },
    { name: 'Facebook', href: 'https://www.facebook.com/share/1DHSg7tWwR/' },
  ],
  pillars: ['AI', 'Cloud', 'Cybersecurity', 'Endpoint'],
};

export const nav: { href: string; label: string }[] = [
  { href: '/products', label: 'Products' },
  { href: '/services', label: 'Services' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/ai-education', label: 'AI Education' },
  { href: '/about', label: 'About' },
  { href: '/board-of-directors', label: 'Leadership' },
  { href: '/contact', label: 'Contact' },
];

// Governance principles published on beyondai.ph/board-of-directors.
export const principles = [
  { title: 'Innovation-driven leadership', text: 'We adopt emerging technology deliberately and keep improving how we build, so clients get modern, scalable solutions.' },
  { title: 'Client-centric approach', text: 'We understand the business need before we choose the technology. Client success is how we measure ours.' },
  { title: 'Quality and reliability', text: 'Strict quality standards, clean architecture and secure development practices on every engagement.' },
  { title: 'Transparency and accountability', text: 'Open communication, clear reporting and responsible decision-making — no surprises.' },
  { title: 'Data security and ethics', text: 'We protect client data and design for compliance with recognised security standards.' },
  { title: 'Sustainable growth', text: 'We build long-term partnerships rather than chasing short-term gains.' },
];

// Delivery process published on beyondai.ph/services (recovered from the page bundle).
export const process = [
  { title: 'Discovery and consultation', text: 'We learn your goals, current infrastructure, pain points and growth targets in working sessions with your key stakeholders.', deliverables: ['Needs assessment report', 'Technology audit', 'Stakeholder alignment'] },
  { title: 'Strategy and roadmap', text: 'A tailored technology strategy with a clear roadmap, timeline and measurable KPIs tied to your business objectives.', deliverables: ['Technology roadmap', 'Risk analysis', 'ROI projections'] },
  { title: 'Design and architecture', text: 'Secure, scalable solution design following industry practice — vendor-neutral across Microsoft Azure, AWS and Google Cloud.', deliverables: ['Solution architecture', 'Security blueprint', 'Tech stack selection'] },
  { title: 'Build and implement', text: 'Infrastructure, software and integrations delivered in agile sprints, with minimal disruption to day-to-day operations.', deliverables: ['Agile sprints', 'CI/CD pipelines', 'Low-disruption deployment'] },
  { title: 'Test and validate', text: 'Quality assurance, security review and performance testing before anything goes live.', deliverables: ['QA and test reports', 'Security review', 'Performance benchmarks'] },
  { title: 'Launch and optimize', text: 'We go live, monitor in real time and keep tuning so performance holds as you grow.', deliverables: ['Go-live support', 'Monitoring', 'Continuous optimization'] },
];
