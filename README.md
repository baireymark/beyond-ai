BEYOND AI — EIGHT INTERACTIVE DESIGN STUDIES

Open index.html for the design hub. All HTML, CSS, JavaScript, artwork, and fonts
are local; no installation or build is required. Keep this folder together.

From the repository, an optional local preview is available with:
  node scripts/serve-beyond.mjs
Then open http://127.0.0.1:4175

PAGES
  index.html              Main hub, live previews, filters, resume last design
  bold-tech.html          V1 Bold Tech / Study B
  moodboard.html          V2 Moodboard
  particles.html          Landing E / Particles Light (Boon)
  clear-plan.html         Landing B / Clear Plan Refined
  big-ideas.html          Landing D2 / Big Ideas, Real Systems
  work-rewired.html       Landing D4 / Work, Rewired
  connected-terrain.html  Landing D1 / Connected Terrain
  systems.html           Landing A / Systems Refined
  portfolio.html         Searchable collection of 22 apps and 10 websites

INTERACTIONS
Use the bottom switcher to move between designs, return to the hub, or pause
motion. Product cards open previews; Big Ideas also has an in-page tabbed
product explorer. Navigation and menus jump to sections. FAQ answers expand
and collapse. Portfolio cards show original images and link to their app store
or website. App/website filters change the portfolio view.

Project forms prepare a local brief. Download it or open an email draft in
your email app. No form data is sent to a server, and no message is sent
automatically. Product interfaces and service content are interactive previews,
not connections to live Beyond AI business systems.

The desktop compositions follow the selected Figma frames. Narrow screens
use a readable single-column layout. Reduced-motion preferences are respected.

SOURCES
Figma: https://www.figma.com/design/WEWtTZn0EUeSv05ENy31Qf/Beyond-AI?node-id=26-742
Portfolio images and destination links: https://beyondai.ph/ (14 October 2026).
Per-image source records are saved in portfolio/sources.json. The source site
labels Dermexia as sendagift; the displayed name here follows its image and URL.
Fonts: Geist, Geist Mono, Archivo, IBM Plex Mono (Google Fonts); Montserrat
from the existing project. Reference ZIP archives were used as reference only.

EDITING
The pages are plain HTML. design.css contains the captured design styles;
experience.css and experience.js implement the shared motion and interactions.
hub.* and portfolio.* control the two collection pages. No React or Tailwind
runtime is required for the delivered HTML.

Moodboard update: the hero is a live ASCII globe with surface rotation, drag/arrow-key control, and pause support. Switzerland, Dhaka and Manila markers follow geographic coordinates and hide on the far side. The Switzerland marker uses Zurich as the country reference point.

Moodboard ASCII update: all five supporting illustrations render as actual ASCII characters on a fixed grid. Symbols change from light punctuation to dense characters to animate light and shade. Pointer movement acts as a light source. Character positions, font size and opacity stay fixed. Mobile includes all five illustrations. Animations pause with the shared control and respect reduced-motion settings.
