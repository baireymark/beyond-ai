// Release checks against a running build: metadata, headings, images, links, anchors, ARIA references,
// brand/localization rules, legacy redirects, the 404 page and response headers.
// Usage:  npm run build && npm start        (in one terminal)
//         npm run check                     (in another; add -- --external to also request every external link,
//                                            or -- --base=https://preview-url to check a deployment)
import fs from 'node:fs';

const base = (process.argv.find(a => a.startsWith('--base='))?.slice(7) || 'http://localhost:5193').replace(/\/$/, '');
const external = process.argv.includes('--external');
const legacy = JSON.parse(fs.readFileSync(new URL('../config/redirects.json', import.meta.url), 'utf8'));
const problems = [], notes = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);
const get = (path, init = {}) => fetch(base + path, { redirect: 'manual', ...init });
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
const pathOf = loc => { const u = new URL(loc, base); return u.pathname + u.hash; };

try { await get('/'); } catch { console.error(`No server at ${base}. Run "npm run build && npm start" first.`); process.exit(1); }

/* Pages: everything in the sitemap, plus the 404 page */
const sitemap = await (await get('/sitemap.xml')).text();
const routes = [...sitemap.matchAll(/<loc>https?:\/\/[^/<]+([^<]*)<\/loc>/g)].map(m => m[1] || '/');
const docs = new Map();
for (const route of routes) {
  const res = await get(route);
  if (res.status !== 200) { fail(route, `sitemap page returned ${res.status}`); continue; }
  docs.set(route, await res.text());
}
const missing = await get('/this-page-does-not-exist');
if (missing.status !== 404) fail('/404', `unknown URL returned ${missing.status}`);
const notFoundHtml = await missing.text();
if (!/<meta name="robots" content="noindex"/.test(notFoundHtml)) fail('/404', 'missing noindex');
docs.set('/404', notFoundHtml);

const idsOf = html => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const status = new Map(); // internal path → final status after following redirects
async function resolve(path) {
  if (!status.has(path)) {
    status.set(path, (async () => {
      let res = await get(path), hops = 0;
      while (res.status >= 300 && res.status < 400 && hops++ < 3) res = await get(pathOf(res.headers.get('location')).split('#')[0]);
      return res.status;
    })());
  }
  return status.get(path);
}
const externalLinks = new Map();

for (const [route, html] of docs) {
  const body = html.slice(html.indexOf('<body')).replace(/<script[\s\S]*?<\/script>/g, '');
  if (!/<title>[^<]{10,}<\/title>/.test(html)) fail(route, 'missing or short <title>');
  if (!/<meta name="description" content="[^"]{50,}"/.test(html)) fail(route, 'missing or short meta description');
  if (route !== '/404' && !new RegExp(`<link rel="canonical" href="https://[^"]+${route === '/' ? '/?' : route}"`).test(html)) fail(route, 'missing or wrong canonical');
  if (!/<html lang="en"[\s>]/.test(html)) fail(route, 'missing lang');
  const og = (html.match(/property="og:image" content="https?:\/\/[^/]+([^"]+)"/) || [])[1];
  if (route !== '/404' && (!og || (await resolve(og)) !== 200)) fail(route, `og:image missing or not served: ${og}`);
  const h1 = (body.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) fail(route, `expected one <h1>, found ${h1}`);

  for (const [tag] of body.matchAll(/<img\b[^>]*>/g)) {
    const src = decode((tag.match(/\ssrc="([^"]+)"/) || [])[1] || '');
    if (!/\salt="/.test(tag)) fail(route, `img without alt: ${src}`);
    if (!/\swidth="\d+"/.test(tag) || !/\sheight="\d+"/.test(tag)) fail(route, `img without dimensions: ${src}`);
    const candidates = [src, ...decode((tag.match(/\ssrcset="([^"]+)"/i) || [, ''])[1]).split(',').map(s => s.trim().split(' ')[0])].filter(Boolean);
    for (const url of new Set(candidates.slice(0, 2))) if ((await resolve(url)) !== 200) fail(route, `image not served: ${url}`);
  }

  const ids = idsOf(html);
  for (const [tag, rawHref] of body.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>/g)) {
    const href = decode(rawHref);
    if (/^(mailto|tel):/.test(href)) continue;
    if (/^https?:\/\//.test(href)) {
      if (!/target="_blank"/.test(tag) || !/rel="noopener noreferrer"/.test(tag)) fail(route, `external link without target/rel: ${href}`);
      if (!externalLinks.has(href)) externalLinks.set(href, route);
      continue;
    }
    const [pathAndQuery, hash] = href.split('#');
    const path = pathAndQuery.split('?')[0] || route;
    if (path !== route && (await resolve(path)) !== 200) { fail(route, `broken internal link ${href}`); continue; }
    const target = path === route ? html : docs.get(path);
    if (hash && target && !idsOf(target).has(hash)) fail(route, `missing anchor ${href}`);
  }
  for (const [, refs] of body.matchAll(/aria-(?:labelledby|describedby|controls)="([^"]+)"/g)) {
    for (const id of refs.split(/\s+/)) if (!ids.has(id)) fail(route, `aria reference to missing id "${id}"`);
  }

  const visible = body.replace(/<[^>]+>/g, ' ');
  const variant = visible.match(/Beyond\s+AI|Beyond\s+ai|BeyondAI\b|Beyond-AI(?!\.io)/);
  if (variant) fail(route, `brand variant "${variant[0]}"`);
  if (/Dhaka|Bangladesh/i.test(visible)) fail(route, 'Bangladesh-centred reference in public copy');
}

/* Legacy URLs: every entry in config/redirects.json, plus the static build's .html and /index.html forms */
const redirectCases = [
  ...legacy.map(r => [r.source.replace(':slug', 'agentic-ai'), r.destination.replace(':slug', 'agentic-ai')]),
  ['/about.html', '/about'], ['/about/index.html', '/about'], ['/products/erp/index.html', '/products/erp'], ['/services/cybersecurity.html', '/services/cybersecurity'],
];
for (const [from, to] of redirectCases) {
  const res = await get(from);
  const loc = res.headers.get('location');
  if (res.status !== 301 || !loc || pathOf(loc) !== to) fail('redirects', `${from} → ${res.status} ${loc ?? ''} (expected 301 → ${to})`);
  else if ((await resolve(to.split('#')[0])) !== 200) fail('redirects', `${from} → ${to}, which does not load`);
}
const slash = await get('/about/');
if (![301, 308].includes(slash.status) || pathOf(slash.headers.get('location') || '') !== '/about') fail('redirects', `/about/ → ${slash.status} (expected permanent redirect to /about)`);

/* Headers and static files */
const home = await get('/');
for (const h of ['content-security-policy', 'x-content-type-options', 'referrer-policy', 'permissions-policy']) if (!home.headers.get(h)) fail('headers', `missing ${h} on /`);
if (home.headers.get('x-powered-by')) fail('headers', 'x-powered-by should be disabled');
for (const [path, expect] of [['/img/og.png', 'max-age=604800'], ['/js/via.js', 'immutable']]) {
  const res = await get(path);
  if (res.status !== 200) fail('static', `${path} returned ${res.status}`);
  else if (!(res.headers.get('cache-control') || '').includes(expect)) fail('headers', `${path} cache-control is "${res.headers.get('cache-control')}"`);
}
for (const path of ['/robots.txt', '/site.webmanifest', '/favicon.ico', '/favicon-32.png', '/apple-touch-icon.png', '/licenses/geist-OFL.txt']) {
  if ((await resolve(path)) !== 200) fail('static', `${path} not served`);
}
if (!(await (await get('/robots.txt')).text()).includes('/sitemap.xml')) fail('/robots.txt', 'does not reference the sitemap');

if (external) {
  for (const [href, route] of externalLinks) {
    try {
      const res = await fetch(href, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (link check)' }, signal: AbortSignal.timeout(20000) });
      if (res.status >= 400) fail(route, `external ${res.status}: ${href}`); else notes.push(`ok ${res.status} ${href}`);
    } catch (e) { fail(route, `external error (${e.cause?.code || e.name}): ${href}`); }
    await new Promise(r => setTimeout(r, 400));
  }
}

console.log(`Checked ${docs.size} pages, ${redirectCases.length + 1} redirects and ${externalLinks.size} unique external links${external ? ' (requested)' : ' (not requested; use -- --external)'} on ${base}.`);
if (notes.length) console.log(notes.join('\n'));
if (problems.length) { console.log(`\n${problems.length} problem(s):\n` + problems.join('\n')); process.exitCode = 1; }
else console.log('No problems found.');
