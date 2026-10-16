# BeyondAi website

The beyondai.ph marketing site, built with Next.js (App Router) and TypeScript. Every page is prerendered
as static HTML at build time and served from the CDN. The contact form posts enquiries from the browser to the
BeyondAi Admin enquiry API, which saves them as leads; if that API fails, a server action emails the enquiry instead.

## Run

Requires Node.js 20.9 or newer.

```sh
npm install
cp .env.example .env.local   # then fill in the values (see "Contact form" below)
npm run dev
```

Open **http://localhost:5193**. On Windows, use `npm.cmd` if PowerShell blocks `npm.ps1`.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server with hot reload on port 5193. |
| `npm run build` | Production build. Prerenders every page and type-checks. |
| `npm start` | Serves the production build on port 5193. |
| `npm run lint` | ESLint (Next.js core-web-vitals and TypeScript rules). |
| `npm run typecheck` | TypeScript only. |
| `npm run check` | Release checks against a running server (`npm run build && npm start` first): metadata, headings, images, links, anchors, ARIA references, every legacy redirect, the 404 page and response headers. Add `-- --external` to also request every external link, or `-- --base=https://…` to check a deployment. |

## Project layout

```
src/
  app/                 Routes (App Router). One folder per URL; [slug] folders are generated from content.
    layout.tsx         <html>, fonts, navigation, footer, page-level effects, chat widget
    contact/actions.ts Email fallback (server action) for the contact form
    sitemap.ts, robots.ts
  components/          UI. Files starting with 'use client' run in the browser; everything else renders on the server only.
  content/             Site copy and data: products, services, portfolio, leadership, education, contact options
  lib/                 motion.ts (canvas animation loop), seo.ts (metadata), enquiry.ts (lead payload and field rules),
                       enquiry-api.ts (API request, response handling, fallback), mailer.ts + rate-limit.ts (server only)
  styles/              site.css (design system), v3.css (V3 additions), via.css (chat widget)
  fonts/               Self-hosted fonts, loaded through next/font (licenses in public/licenses)
public/                Images, icons, manifest, the prebuilt chat widget (js/via.js) and font licenses
config/redirects.json  Legacy URLs → current URLs (301). Used by next.config.ts and the release checks.
next.config.ts         Redirects, security headers, cache headers, image settings
```

To edit copy, change the files in `src/content/` or the page in `src/app/`. To add a product or service, add an
entry in `src/content/products.ts` or `services.ts`: its page, navigation, footer link and sitemap entry follow.

## Rendering

| Route | Rendering |
| --- | --- |
| All pages, including `/products/[slug]` and `/services/[slug]` | Static, prerendered at build time. Unknown slugs return 404. |
| Contact form submission | Browser → BeyondAi Admin API. The email fallback is a server action, run on demand. |
| `/sitemap.xml`, `/robots.txt` | Static, generated at build time. |

Content lives in the repository, so a deploy is the publishing step and ISR isn't needed. If content moves to a CMS,
add `export const revalidate = <seconds>` to the affected pages, or revalidate on publish.

## Contact form

The browser posts each enquiry as JSON straight to `{NEXT_PUBLIC_ENQUIRY_API_URL}/api/leads` (BeyondAi Admin), which
validates it, checks the Cloudflare Turnstile token and saves it as a lead. This site stores nothing and holds no
database credentials. The request is deliberately not proxied through this site: the admin app checks the browser's
`Origin` and rate-limits by the visitor's IP address.

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_ENQUIRY_API_URL` | Base URL of the admin app, e.g. `https://beyondai-admin-rosy.vercel.app` (local: `http://localhost:3001`). Its origin is added to the Content Security Policy's `connect-src`. |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Turnstile site key. `1x00000000000000000000AA` always passes (local development). |
| `NEXT_PUBLIC_CONSENT_NOTICE_VERSION` | Privacy notice version the consent checkbox refers to (currently `2026-10`). Must equal the admin app's `CONSENT_NOTICE_VERSION`. |

These are inlined into the browser bundle at build time, so redeploy after changing them. In the admin app, add this
site's origins (production, staging, previews you test on, `http://localhost:3000`) to `CORS_ALLOWED_ORIGINS`.

Option values, the consent wording (pending legal approval) and the `?topic=` aliases used by links elsewhere on
the site are in `src/content/contact.ts`. The browser applies the API's limits for instant feedback; the API is the
final authority. How the form handles each response:

| Response | The visitor sees | Turnstile |
| --- | --- | --- |
| 201 | "Thanks, we'll reply within one business day." The form is cleared. | reset |
| 400 | Each message next to its field; `_form` and other messages at the top. Focus moves to the first invalid field. | kept |
| 403 | "We couldn't verify your submission. Please try again." | reset |
| 413 | "Your message is too long." | kept |
| 429 | "Too many submissions. Please try again in N minutes." (`Retry-After`; the admin app must list it in `Access-Control-Expose-Headers`, otherwise "in a few minutes") | kept |
| 5xx, network or CORS failure, timeout (15 s) | The email fallback below; if that fails too, "Something went wrong. Please try again, or email us at …". What was typed is kept. | reset |

### Email fallback

Only when the API fails (never for 400, 403, 413 or 429, which would bypass its checks), the form calls a server
action (`src/app/contact/actions.ts`) that re-validates the enquiry and emails it with nodemailer through Gmail SMTP,
marked "API fallback" so it can be added to BeyondAi Admin by hand. The visitor's address is the Reply-To. The action
keeps the honeypot and a per-instance limit of 5 emails per 10 minutes per IP address.

1. Use a Google account with 2-Step Verification enabled (a Google Workspace address such as `website@beyondai.ph`
   is best).
2. Create an App Password: Google Account → Security → 2-Step Verification → App passwords.
3. Set the variables in `.env.local` for development, and in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `SMTP_USER` | yes | The sending Gmail / Workspace address. Gmail sends only as this account or a verified alias. |
| `SMTP_PASS` | yes | The App Password (not the account password). |
| `CONTACT_TO_EMAIL` | no | Where fallback emails go. Defaults to the published contact address. |
| `SMTP_HOST`, `SMTP_PORT` | no | Default `smtp.gmail.com` and `465` (TLS). Any other port uses STARTTLS, which is required. |

If the SMTP variables are missing or Gmail rejects the login, the server log names the cause (never the enquiry).

## Deployment (Vercel)

Vercel detects Next.js automatically. In Project → Settings → Build and Deployment, the Framework Preset must be
**Next.js** with no custom build command or output directory (the previous static build used `dist/`, which
must be cleared). Add the environment variables from `.env.example`, then deploy. Redirects and headers come from `next.config.ts`.

## Behavior notes

- Motion respects reduced-motion preferences. Content and links work without JavaScript. The contact form needs it
  (Turnstile runs in the browser); without it the form shows the contact email address instead.
- Pages are static, so the Content Security Policy allows inline scripts and styles, which Next.js uses to
  boot static pages. Everything else stays restricted to the site's own origin, plus the enquiry API (`connect-src`) and
  Cloudflare Turnstile (`script-src`, `frame-src`) for the contact form.
- The chat assistant (`public/js/via.js`) is a prebuilt script that runs entirely in the browser and makes no
  network requests. It loads after the page is idle.
