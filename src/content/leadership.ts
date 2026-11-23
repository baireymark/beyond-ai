// Leadership & board (beyondai.ph/board-of-directors). Names and roles as published;
// third-party affiliations are kept as truthful attributions, not renamed.
export interface Person {
  name: string;
  role: string;
  /** Path in /public. */
  photo: string;
  bio: string;
}

export const leaders: Person[] = [
  {
    name: "Ronald Vergara",
    role: "President & CEO",
    photo: "/img/people/ronald-vergara.webp",
    bio: "Entrepreneur, technology strategist and veteran advocate who has built and scaled companies across real estate, logistics, healthcare, finance and artificial intelligence. Ronald is co-founder and Chief Marketing Officer of VALRPro, and founder of Beyond-AI.io, where he leads work on AI automation, agentic systems and enterprise web solutions.",
  },
  {
    name: "MD Naimul Hasan Durjay",
    role: "Senior Vice President Operations",
    photo: "/img/people/naimul-hasan-durjay.webp",
    bio: "As second-in-command, Durjay oversees IT operations, product execution and sales strategy, turning AI-driven ideas into scalable products that meet market demand.",
  },
];
export const board: Person[] = [
  {
    name: "Christopher Wayne French",
    role: "Founder and Chairman of the Board",
    photo: "/img/people/christopher-french.webp",
    bio: "Former serviceman and veteran advocate who helps veterans navigate the VA disability claims process through VALRPro.",
  },
  {
    name: "Abdulgani Macatoman",
    role: "Board of Directors",
    photo: "/img/people/abdulgani-macatoman.webp",
    bio: "Filipino public servant, entrepreneur, author and TV host. Former Undersecretary of the Department of Trade and Industry (DTI) and former Acting Secretary of the Commission on Filipinos Overseas (CFO), and an advocate for entrepreneurship, MSME development and sustainable growth, especially in Mindanao.",
  },
];
export const governance = [
  {
    title: "Innovation-driven leadership",
    text: "We adopt emerging technologies and improve continuously to deliver modern, scalable solutions.",
  },
  {
    title: "Client-centric approach",
    text: "We understand the business need before we build the technology.",
  },
  {
    title: "Quality & reliability",
    text: "Strict quality standards, clean architecture and secure development practices.",
  },
  {
    title: "Transparency & accountability",
    text: "Open communication, clear reporting and responsible decision-making.",
  },
  {
    title: "Data security & ethics",
    text: "We protect client data and design for recognised security practices.",
  },
  {
    title: "Sustainable growth",
    text: "Long-term partnerships over short-term gains.",
  },
];
