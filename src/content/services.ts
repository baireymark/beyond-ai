// BeyondAi services. The six services and their capability lists come from beyondai.ph/services (page + bundle).
// Detail-page structure (focus areas, approach) is informed by comparable public service pages, rewritten in original
// wording and limited to capabilities BeyondAi already lists. No certifications, client names or performance figures.
export interface Service {
  slug: string;
  /** Former URLs; the redirects live in config/redirects.json. */
  legacy?: string[];
  name: string;
  short: string;
  summary: string;
  intro: string[];
  capabilities: string[];
  areas: [title: string, text: string][];
  fit: string[];
  /** Show recent portfolio apps on the detail page. */
  portfolio?: boolean;
}

export const services: Service[] = [
  {
    slug: 'cloud-modernization',
    name: 'Cloud Modernization',
    short: 'Upgrade your infrastructure with scalable, secure and cost-effective cloud.',
    summary: 'We plan and carry out moves to the cloud, modernize what runs there and keep it secure and cost-effective — vendor-neutral across Microsoft Azure, AWS and Google Cloud.',
    intro: [
      'Legacy infrastructure slows releases, raises costs and makes scaling a project in itself. Cloud modernization replaces that friction with environments that scale with demand and are easier to operate and secure.',
      'BeyondAi is vendor-neutral. We recommend the platform and architecture that fit your workloads, budget and compliance needs — whether that means migrating as-is, re-platforming or rebuilding cloud-native.',
    ],
    capabilities: ['Cloud migration services', 'Multi-cloud management', 'Cloud infrastructure design', 'Serverless architecture', 'Cloud security and compliance', 'Cloud cost optimization'],
    areas: [
      ['Assessment and migration', 'We review your current environment, define a migration path and move workloads with minimal disruption.'],
      ['Cloud-native architecture', 'Serverless and container-based designs that scale automatically and recover from failure.'],
      ['Security and compliance', 'Identity, network and data controls designed into the environment from the start.'],
      ['Cost optimization', 'Right-sized resources and ongoing review so you pay for what you actually use.'],
    ],
    fit: ['Infrastructure is aging or expensive to maintain', 'Releases are slowed by environment constraints', 'Cloud costs are growing without clear visibility'],
  },
  {
    slug: 'ai-analytics',
    name: 'AI & Analytics',
    short: 'Use AI-driven insight to make smarter, data-backed decisions.',
    summary: 'From machine learning and NLP to chatbots and process automation, we turn your data into predictions, insight and automated work that teams actually use.',
    intro: [
      'Most organizations have more data than insight. The challenge is turning it into decisions — and turning decisions into measurable results — with a clear plan and solid foundations.',
      'We start from the business question, prepare the data it needs and deliver AI and analytics that fit into existing workflows, with privacy and responsible use designed in.',
    ],
    capabilities: ['Machine learning models', 'Natural language processing', 'Computer vision solutions', 'Predictive analytics', 'AI chatbots and virtual assistants', 'Intelligent process automation'],
    areas: [
      ['Machine learning and prediction', 'Models that forecast demand, flag risk and surface patterns in your data.'],
      ['Language and vision', 'NLP and computer vision for documents, conversations, images and video.'],
      ['Assistants and chatbots', 'AI assistants that answer questions and complete tasks for customers and staff.'],
      ['Process automation', 'Intelligent automation that removes repetitive steps from everyday operations.'],
    ],
    fit: ['Data exists but rarely informs decisions', 'Teams spend hours on repetitive, rules-based work', 'You want to pilot AI with a clear business case'],
  },
  {
    slug: 'cybersecurity',
    name: 'Cybersecurity & Compliance',
    short: 'Protect your business with robust security and compliance management.',
    summary: 'Security monitoring, testing, threat intelligence and incident response — plus the compliance work that shows your controls are working.',
    intro: [
      'Threats change constantly, and so do the obligations that come with handling customer and business data. Effective security combines prevention, early detection and a practiced response.',
      'We assess where you are exposed, strengthen your defenses, monitor continuously and help you meet the compliance requirements that apply to your organization.',
    ],
    capabilities: ['24/7 security monitoring (SOC)', 'Penetration testing and audits', 'Threat intelligence', 'Incident response', 'Vulnerability management', 'Security compliance consulting'],
    areas: [
      ['Risk and readiness', 'Audits and penetration tests that show where you are exposed and what to fix first.'],
      ['Detection and monitoring', 'Round-the-clock security monitoring backed by current threat intelligence.'],
      ['Incident response', 'A clear plan and hands-on support to contain incidents and recover quickly.'],
      ['Compliance', 'Policies, controls and evidence aligned with the standards and regulations you must meet.'],
    ],
    fit: ['You lack in-house security monitoring', 'A customer or regulator is asking for evidence of controls', 'You have not tested your defenses recently'],
  },
  {
    slug: 'software-development',
    name: 'Software Development',
    short: 'Scalable, high-performance software built for your business.',
    summary: 'Web, mobile and enterprise software engineered from idea to deployment — designed around your users and built to scale.',
    intro: [
      'Off-the-shelf software rarely fits exactly. We design and build digital products tailored to your goals, from customer-facing apps to internal systems and integrations.',
      'Our team has shipped the mobile apps and websites in our portfolio for clients across fitness, food, finance, transport and more. Every build focuses on usability, performance and long-term maintainability.',
    ],
    capabilities: ['Custom web application development', 'Mobile app development (iOS and Android)', 'Enterprise software solutions', 'SaaS product development', 'UI/UX-focused product engineering', 'API development and system integration'],
    areas: [
      ['Web and mobile apps', 'Native and cross-platform apps and web applications built for real users.'],
      ['Enterprise and SaaS platforms', 'Multi-user systems and subscription products designed to scale.'],
      ['Product design', 'UI/UX work that shapes the product before and during engineering.'],
      ['APIs and integration', 'Connect new software to the systems you already rely on.'],
    ],
    fit: ['You have a product idea that needs a delivery team', 'Existing software no longer fits how you work', 'Systems need to talk to each other'],
    portfolio: true,
  },
  {
    slug: 'managed-services',
    legacy: ['/services/managed'],
    name: 'Managed Services',
    short: 'Seamless IT operations with proactive monitoring and continuous support.',
    summary: 'Proactive management of your infrastructure, users and security updates — so systems stay secure, efficient and available.',
    intro: [
      'Keeping infrastructure healthy is a full-time job. Managed services hand day-to-day operations to a dedicated team so your people can focus on the business.',
      'We monitor continuously, resolve issues before they become outages, support your users and keep systems patched, backed up and ready to recover.',
    ],
    capabilities: ['24/7 infrastructure monitoring', 'IT helpdesk and end-user support', 'Server and network management', 'Cloud infrastructure management', 'Backup and disaster recovery', 'Security patch and update management'],
    areas: [
      ['Monitoring and operations', 'Continuous monitoring of servers, networks and cloud resources.'],
      ['User support', 'A helpdesk that resolves everyday IT issues for your team.'],
      ['Resilience', 'Backups and tested recovery plans so incidents do not become disasters.'],
      ['Maintenance', 'Patching and updates applied on a predictable schedule.'],
    ],
    fit: ['Your IT team is stretched by routine operations', 'You need monitoring outside office hours', 'Backups and recovery have not been tested'],
  },
  {
    slug: 'resource-augmentation',
    name: 'Resource Augmentation',
    short: 'Scale your team with skilled experts to accelerate delivery.',
    summary: 'Skilled IT and engineering professionals who join your team and work inside your existing processes — for weeks, months or longer.',
    intro: [
      'Hiring takes time, and project peaks rarely wait. Resource augmentation adds experienced professionals to your team without the delay and overhead of recruitment.',
      'Augmented team members work within your workflows, tools and management, and engagements scale up or down as your projects change.',
    ],
    capabilities: ['Dedicated IT and engineering resources', 'On-demand skilled professionals', 'Short-term and long-term engagement models', 'Rapid team scaling', 'Cost-effective talent solutions', 'Flexible resource management'],
    areas: [
      ['Dedicated team members', 'Engineers and specialists assigned to your team for the length of the engagement.'],
      ['Specialist expertise', 'Targeted skills for a specific phase, technology or problem.'],
      ['Flexible terms', 'Short- and long-term arrangements that follow your project cycle.'],
      ['Seamless integration', 'Professionals who adopt your processes, tools and communication rhythm.'],
    ],
    fit: ['A project needs skills your team does not have', 'Deadlines outpace hiring', 'Demand changes from quarter to quarter'],
  },
];
