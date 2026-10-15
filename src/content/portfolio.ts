// Portfolio — the 22 apps and 10 websites listed on beyondai.ph (retrieved 14–15 October 2026).
// Links point to the public store or site exactly as published. `img` is the base name in /img/portfolio.
// Store listings verified on 15 October 2026; live: false marks listings that no longer resolve (shown without a link).
export interface Project {
  type: 'app' | 'website';
  name: string;
  /** Base file name in /public/img/portfolio. */
  img: string;
  store: string;
  url: string;
  live: boolean;
  note?: string;
}

const app = (name: string, img: string, store: string, url: string, live = true): Project => ({ type: 'app', name, img, store, url, live });
const web = (name: string, img: string, url: string, note?: string): Project => ({ type: 'website', name, img, store: 'Website', url, note, live: true });

export const portfolio: Project[] = [
  app('VALRPRO', 'valrpro', 'TestFlight', 'https://testflight.apple.com/join/GRTuaY52'),
  app('Tastehub', 'tastehub', 'App Store', 'https://apps.apple.com/jp/app/tastehub-app/id6751109669?platform=iphone', false),
  app('Prime Pilates', 'prime-pilates', 'App Store', 'https://apps.apple.com/us/app/prime-pilates/id6741531586?platform=iphone'),
  app('Bookatable', 'bookatable', 'Google Play', 'https://play.google.com/store/apps/details?id=com.bookatable.app.mu&hl=en', false),
  app('SwiftSwap', 'swiftswap', 'Google Play', 'https://play.google.com/store/apps/details?id=com.swipswap.jorge&pli=1'),
  app('Dudu Car Malaysia', 'dudu-car', 'App Store', 'https://apps.apple.com/kh/app/dudu-car-malaysia/id6751107228'),
  app('My Tracks', 'my-tracks', 'Google Play', 'https://play.google.com/store/apps/details?id=com.mytracksdarren.roe'),
  app('Klaus Bekker', 'klaus-bekker', 'Google Play', 'https://play.google.com/store/apps/details?id=com.klausbekker.audiobook'),
  app('Nelya', 'nelya', 'Google Play', 'https://play.google.com/store/apps/details?id=com.nelya.period_tracking'),
  app('ANGRYai', 'angryaii', 'App Store', 'https://apps.apple.com/us/app/angryai/id6756209388', false),
  app('Distrax', 'distrax', 'App Store', 'https://apps.apple.com/us/app/distrax/id6753587746'),
  app('Prism Sports', 'prism-sports', 'App Store', 'https://apps.apple.com/us/app/prism-sports-journal/id6749793697'),
  app('WET Piscinas', 'wet-piscinas', 'App Store', 'https://apps.apple.com/us/app/wet-app-piscinas/id6749312378'),
  app('Descubrelo', 'descubrelo', 'App Store', 'https://apps.apple.com/us/app/descubrelo-colorado-guide/id6754084053'),
  app('DMR Connect', 'dmr-connect', 'App Store', 'https://apps.apple.com/us/app/dmr-connect/id6754272171'),
  app('re: social', 're-social', 'App Store', 'https://apps.apple.com/us/app/re-social/id6754686897'),
  app('Med World', 'med-world', 'App Store', 'https://apps.apple.com/us/app/medworldapp/id6745454498', false),
  app('TheClue Crypto', 'theclue-crypto', 'App Store', 'https://apps.apple.com/us/app/theclue-crypto-education/id6752632864'),
  app('MilkMix', 'milkmix', 'App Store', 'https://apps.apple.com/us/app/milkmix/id6754192786'),
  app('Whisky Cask', 'whisky-cask', 'App Store', 'https://apps.apple.com/us/app/whisky-cask-club/id6757377998', false),
  app('Below MSRP', 'below-msrp', 'App Store', 'https://apps.apple.com/us/app/below-msrp/id6754098147'),
  app('Nutra AI', 'nutra-ai', 'App Store', 'https://apps.apple.com/us/app/nutra-ai/id6743385114', false),
  web('sendagift', 'image_1', 'https://sendagift.shop/'),
  web('Dermexia', 'image_2', 'https://dermexia.eu/', 'Labelled “sendagift” on the source site; name follows the linked site and screenshot.'),
  web('Usagivr', 'image_3', 'https://shop.usagivr.com/'),
  web('A&S Refrigeration Boxes', 'image_4', 'https://aandsrefrigerationboxes.com/'),
  web('Kitfix', 'image_5', 'https://kitfix.com/'),
  web('Adedamola Atelier', 'image_6', 'https://www.adedamolaatelier.com/'),
  web('Veralosso', 'image_7', 'https://www.veralosso.com/'),
  web('Sprayfix Solutions', 'image_8', 'https://www.sprayfixsolutions.ca/'),
  web('Bloomvits', 'image_9', 'https://bloomvits.nl/'),
  web('Obyron Store', 'image_10', 'https://obyronstore.com/'),
];
