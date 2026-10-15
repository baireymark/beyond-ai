// AI Education program — from beyondai.ph/ai-education. Unsourced statistics ("77% of jobs", "4× productivity",
// "2,400+ learners") are intentionally omitted; individual module titles are not public and are not invented.
export const education = {
  name: 'AI Education',
  headline: 'AI for non-technical people — clear, practical and job-relevant.',
  intro: 'BeyondAi teaches how AI works, how to use it responsibly and how to apply it to real tasks — without jargon or heavy math. If you can use a smartphone and a search engine, you can learn AI here.',
  facts: [
    ['11', 'Modules'],
    ['4', 'Hands-on projects'],
    ['1', 'Certificate of completion'],
    ['0', 'Coding required'],
  ],
  principles: [
    ['Start from zero', 'No programming background required.'],
    ['Learn by doing', 'Short lessons, guided practice and real examples.'],
    ['From basics to modern AI', 'Machine learning, deep learning, NLP, large language models, generative AI and AI agents — explained simply.'],
    ['Responsible AI included', 'Bias, privacy and safe use are built into every module.'],
    ['Clear results', 'You finish with projects you can show and a certificate.'],
  ],
  why: {
    title: 'AI is becoming a basic skill — like email or spreadsheets.',
    text: 'AI is already changing how people write, research, analyze data, create content and make decisions. The goal is not to replace people; it is to help you work smarter.',
    goals: [
      ['Understand AI', 'So you can use it confidently instead of following along and hoping for the best.'],
      ['Use AI tools well', 'So your work genuinely improves — not just looks polished with AI output pasted in.'],
      ['Stay safe and responsible', 'Avoid mistakes, privacy issues and misinformation before they become problems.'],
    ],
    changing: ['Writing and communication', 'Research and information gathering', 'Data analysis and reporting', 'Content and creative production', 'Decision-making workflows', 'Customer service and automation'],
  },
  topics: ['Machine learning', 'Deep learning', 'Natural language processing', 'Large language models', 'Generative AI', 'Prompting', 'Retrieval-augmented generation (RAG)', 'AI agents', 'AI ethics and safety'],
  audiences: [
    ['Students and graduates', 'Build in-demand skills early and stand out in any career path.'],
    ['Professionals in any field', 'Improve productivity and decision-making without switching careers.'],
    ['Career switchers', 'Step into data- or AI-adjacent roles with a structured roadmap.'],
    ['Managers and founders', 'Understand AI well enough to lead teams and evaluate AI-driven work.'],
    ['Creators and marketers', 'Use generative AI responsibly and effectively in creative work.'],
  ],
  projects: [
    { title: 'Prompt system and evaluation checklist', text: 'Build a prompt system that produces consistent, reliable outputs and assess it against quality criteria.', tags: ['Prompting', 'Evaluation'] },
    { title: 'Text classification demo', text: 'Create a small demo that automatically sorts feedback or content into meaningful categories.', tags: ['Classification', 'Automation'] },
    { title: 'Knowledge Q&A prototype', text: 'Build a prototype that answers questions from a set of approved documents you provide.', tags: ['RAG', 'Prototyping'] },
    { title: 'Agent-style workflow (capstone)', text: 'Design a simple workflow that follows the pattern plan → execute → verify → report.', tags: ['Capstone', 'AI agents'], capstone: true },
  ],
  teaching: ['Beginner-friendly teaching style', 'Practical projects, not theory only', 'Ethical and responsible AI emphasis', 'Clear assessments and feedback', 'Instructor and mentor support'],
  certificate: 'Awarded after completing all assessments and the final capstone project — shareable proof of your new skills.',
};
