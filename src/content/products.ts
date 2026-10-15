// BeyondAi products. Names, positioning and feature lists come from beyondai.ph (home + /product, incl. the page bundle).
// Descriptions are rewritten for clarity; nothing here is taken from Betopia's product pages.
export type ProductArt = 'rings' | 'columns' | 'orb' | 'waves' | 'agents';

export interface Product {
  slug: string;
  /** Former URLs; the redirects live in config/redirects.json. */
  legacy: string[];
  name: string;
  category: string;
  art: ProductArt;
  summary: string;
  intro: string[];
  features: [title: string, text: string][];
  audience: string[];
  outcomes: string[];
}

export const products: Product[] = [
  {
    slug: 'hrm-software',
    legacy: ['/product/hrm-product'],
    name: 'HRM Software',
    category: 'Workforce intelligence',
    art: 'rings',
    summary: 'A human resource management platform that keeps employee records, attendance, leave, payroll preparation and performance in one secure system.',
    intro: [
      'BeyondAi HRM brings the everyday work of an HR team into a single platform. Employee records, roles, attendance, leave, payroll readiness, performance and reporting live in one place instead of across spreadsheets and disconnected tools.',
      'Routine tasks are automated and the numbers are always current, so HR teams spend less time reconciling data and more time on people decisions — with stronger governance over who can see and change what.',
    ],
    features: [
      ['Employee database and profiles', 'A single, structured record for every employee, role and reporting line.'],
      ['Payroll processing and tax calculations', 'Attendance and leave flow straight into payroll preparation, reducing manual re-keying.'],
      ['Attendance and leave management', 'Track time, approve leave and see who is available today.'],
      ['Performance reviews and goal tracking', 'Set goals, run review cycles and keep feedback attached to the employee record.'],
      ['Recruitment and onboarding workflows', 'Move candidates from offer to first day with consistent, trackable steps.'],
      ['Training and development programs', 'Plan and record training so skills growth is visible across the organization.'],
    ],
    audience: ['HR and people teams managing growing headcounts', 'Finance teams that depend on accurate attendance for payroll', 'Managers who need a clear view of their team'],
    outcomes: ['Fewer manual HR tasks', 'Real-time workforce insight', 'Stronger governance over employee data'],
  },
  {
    slug: 'erp',
    legacy: ['/product/erp-product'],
    name: 'ERP',
    category: 'Unified operations',
    art: 'columns',
    summary: 'Integrated enterprise resource planning built on the Odoo framework, connecting the systems that run your business.',
    intro: [
      'BeyondAi ERP is a fully integrated enterprise resource planning solution built on the Odoo framework. It connects departments that often run on separate tools, so information entered once is available everywhere it is needed.',
      'Workflows and reports are configured around how your organization actually operates, and the interface works on mobile so teams can check and act on data away from the desk.',
    ],
    features: [
      ['Real-time data synchronization', 'Changes in one module are reflected across all connected modules immediately.'],
      ['Customizable workflows and reports', 'Processes and reporting shaped to your business rather than the other way round.'],
      ['Mobile-friendly interface', 'Access records and approvals from a phone or tablet.'],
      ['Security and compliance controls', 'Role-based access and controls designed with compliance requirements in mind.'],
    ],
    audience: ['Organizations outgrowing spreadsheets and point solutions', 'Operations and finance leaders who need one version of the truth', 'Teams that work across sites or on the move'],
    outcomes: ['One connected operational system', 'Less duplicate data entry', 'Reporting that reflects the current state of the business'],
  },
  {
    slug: 'count-trust',
    legacy: ['/product/voting-count-trust'],
    name: 'Count Trust',
    category: 'Secure voting',
    art: 'orb',
    summary: 'A secure voting platform for running organizational elections — from voter registration to live, transparent results.',
    intro: [
      'Count Trust is a secure, enterprise-grade platform for conducting elections. It covers the full process: registering and verifying voters, configuring the election, collecting ballots and publishing results.',
      'Role-based dashboards give administrators, observers and voters the view they need, while verification and transparent counting help every participant trust the outcome.',
    ],
    features: [
      ['Smart registration and verification', 'Register eligible voters and verify identities before ballots open.'],
      ['Role-based dashboards', 'Separate views and permissions for administrators, observers and voters.'],
      ['Secure and transparent voting', 'Ballots are protected end to end and the counting process is open to review.'],
      ['Integrated payment and membership', 'Link eligibility to membership status and handle related payments in one place.'],
      ['Live results and reporting', 'Follow turnout as it happens and publish results as soon as voting closes.'],
      ['Branding and customization', 'Present the election under your organization’s own name and look.'],
    ],
    audience: ['Associations and membership organizations', 'Boards and committees', 'Any organization that needs a verifiable vote'],
    outcomes: ['Elections participants can trust', 'Less manual counting and administration', 'Results available the moment voting ends'],
  },
  {
    slug: 'talkora-ai',
    legacy: [],
    name: 'Talkora AI',
    category: 'Voice automation',
    art: 'waves',
    summary: 'An AI voice assistant that answers, understands and manages your business calls around the clock.',
    intro: [
      'Talkora AI answers your business calls at any hour. It understands what callers need in natural language, handles routine requests and routes or escalates calls that need a person.',
      'Every conversation can be transcribed and analyzed, and Talkora connects with your CRM and calendar so call outcomes turn into records and bookings without extra admin.',
    ],
    features: [
      ['24/7 intelligent call handling', 'Calls are answered day and night, including outside office hours.'],
      ['Natural language understanding', 'Callers speak normally; Talkora works out the intent.'],
      ['Automatic routing and escalation', 'Calls reach the right person or team, with urgent issues escalated.'],
      ['Voice analytics and transcription', 'Searchable transcripts and insight into why customers call.'],
      ['CRM and calendar integration', 'Log calls and book appointments directly into the tools you use.'],
      ['Custom voice persona and branding', 'A voice and script that sound like your business.'],
    ],
    audience: ['Service businesses that miss calls after hours', 'Sales teams that cannot answer every inbound enquiry', 'Support teams handling repetitive questions'],
    outcomes: ['Fewer missed opportunities', 'Faster answers for callers', 'Call data that feeds your CRM automatically'],
  },
  {
    slug: 'agentic-ai',
    legacy: [],
    name: 'Agentic AI',
    category: 'Autonomous AI',
    art: 'agents',
    summary: 'AI agents that automate sales, negotiation and customer engagement from first contact to follow-up.',
    intro: [
      'BeyondAi Agentic AI puts AI agents to work across your sales and engagement pipeline. Agents manage leads, carry conversations, support negotiation steps and keep customers engaged — following the rules and limits you set.',
      'Conversation intelligence and a performance dashboard show what the agents are doing and how they are performing, and CRM sync keeps every interaction on record.',
    ],
    features: [
      ['Automated sales pipeline management', 'Agents qualify, follow up and move opportunities forward.'],
      ['AI-driven negotiation workflows', 'Structured negotiation steps within boundaries you define.'],
      ['Customer engagement automation', 'Timely, personalized outreach and responses at scale.'],
      ['Real-time conversation intelligence', 'Understand intent and sentiment as conversations happen.'],
      ['CRM integration and data sync', 'Every interaction is recorded where your team already works.'],
      ['Performance analytics dashboard', 'See what agents are doing and the results they produce.'],
    ],
    audience: ['Sales teams with more leads than time', 'Businesses scaling customer engagement', 'Leaders exploring autonomous AI with clear oversight'],
    outcomes: ['Faster response to every lead', 'Consistent follow-up', 'Visibility into automated activity'],
  },
];
