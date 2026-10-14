BEYONDAI — FOUR SELECTED DESIGN DIRECTIONS

Open index.html to choose a design. Keep this folder together, or extract the
entire ZIP before opening it. HTML, artwork, fonts and Three.js are local;
no installation or build is required. The unselected HTML designs are removed.

PAGES
  index.html          The selected-design hub
  bold-tech.html      Bold Tech / Study B
  moodboard.html      Moodboard
  stack-builder.html  Stack Builder / Figma frame 97:3588
  particles.html      Particles · Light / Figma frame 97:6376
  portfolio.html      Searchable collection of 22 apps and 10 websites

INTERACTIONS
The bottom switcher moves between the three designs and pauses animations.
Mouse hover adds lighting, subtle tilt and tactile buttons. Main controls
support keyboard focus and activation. Reduced-motion settings are used.

Bold Tech: interactive radar core, click/Enter signal pulses, product/service
previews, project filtering and a project brief builder.

Moodboard: an ASCII globe with actual surface rotation and drag/arrow-key
control. Switzerland (Zurich), Dhaka and Manila markers follow the globe.
The five supporting ASCII illustrations animate light and shade by changing
characters on a fixed grid. Pointer movement changes the light source.

Stack Builder: a real local Three.js 0.186.1 scene. Drag or use arrow keys to
rotate. Toggle modules to configure the stack. Separate layers (E) or reset
(R). The chosen stack is included in the project brief. Full-size mobile
controls are provided. Source artwork remains when WebGL is unavailable.
Product planets orbit and support drag, selection and details. The isometric
project wall pans with scrolling, filters apps/websites, and opens original
project images. The contact prompt is editable.

Project forms prepare a local brief. Download it or open an email draft in
your email app. Nothing is sent to a server automatically. Product interfaces
are interactive previews, not connections to live business systems.

Particles · Light: a pointer-steered light tunnel (click to pulse), product
light art that reacts to the cursor, a draggable product rail, services that
switch on hover or scroll, a scroll-drawn learning path and a reactive
wordmark. The email field is local only; nothing is sent.

MOTION LAYER (motion.js / motion.css, on every page)
Context cursor, click sparks, press feedback with haptics (Vibration API on
Android, the switch tick on iOS 18+), ASCII page transitions, label scramble,
scroll progress, and an ASCII lens on app and website imagery (Moodboard,
Portfolio, Particles). The lens decodes images when they first appear or are
swapped. Pause and reduced-motion settings are followed.

ROUND 2
Bold Tech: the spectrum ring is drawn live (bold-fx.js); lines near the
pointer turn orange and stretch, click sends a wave. Type scale reduced.
Moodboard: globe and What-we-do art leave an ASCII mouse path (ascii-trail.js);
new paged apps/websites grid (moodboard-work.js).
Stack Builder: layers explode on scroll, sharper render, pointer-steered light;
softer magnetic planets; new canvas globe with offices and arcs (stack-fx.js).
All pages: RGB-split glitch on large headlines. Particles: vaporwave horizon
shader behind Industry-leading.

COLOURS AND ACCESSIBILITY
See accessibility-colours.txt for measured colour checks and their scope.
This is a colour and interaction review, not a full WCAG conformance audit.

SOURCES
Figma: https://www.figma.com/design/WEWtTZn0EUeSv05ENy31Qf/Beyond-AI
Frames: 156:490 (Bold Tech), 97:4223 (Moodboard), 97:3588 (Stack Builder).
Brand icon: the supplied logo2.png; joined wordmark: BeyondAi.
Portfolio images and links: https://beyondai.ph/ (14 October 2026).
Per-image sources are recorded in portfolio/sources.json. The source site
labels Dermexia as sendagift; the displayed name follows its image and URL.
Font and Three.js license notices are in licenses/.

EDITING
The pages are plain HTML. design.css and stack-design.css contain source
styles. experience.* and selected.* add shared behavior and colours.
stack-three.js bundles Three.js locally. moodboard-ascii.* and
moodboard-matrix.* handle ASCII artwork. hub.* and portfolio.* handle the
collection pages. No React or Tailwind runtime is required.

Optional local preview from the repository:
  node scripts/serve-beyond.mjs
Then open http://127.0.0.1:4175/
