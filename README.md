# BeyondAi website

The beyondai.ph marketing site, built with Next.js (App Router) and TypeScript. Every page is prerendered
as static HTML at build time and served from the CDN. The one server-side feature is the contact form,
which sends enquiries by email through Gmail / Google Workspace SMTP.

## Run

Requires Node.js 20.9 or newer.

```sh
npm install
cp .env.example .env.local   # then fill in the SMTP values (see "Contact form email" below)
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
    contact/actions.ts Server action for the contact form
    sitemap.ts, robots.ts
  components/          UI. Files starting with 'use client' run in the browser; everything else renders on the server only.
  content/             Site copy and data: products, services, portfolio, leadership, education, contact options
  lib/                 motion.ts (canvas animation loop), seo.ts (metadata), enquiry.ts (form rules),
                       mailer.ts + rate-limit.ts (server only)
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
| Contact form submission | Server action, run on demand when the form is posted. |
| `/sitemap.xml`, `/robots.txt` | Static, generated at build time. |

Content lives in the repository, so a deploy is the publishing step and ISR isn't needed. If content moves to a CMS,
add `export const revalidate = <seconds>` to the affected pages, or revalidate on publish.

## Contact form email

The form posts to a server action (`src/app/contact/actions.ts`) that validates the enquiry and sends it with
nodemailer through Gmail SMTP. The visitor's address is set as Reply-To, so replying in Gmail answers them directly.

1. Use a Google account with 2-Step Verification enabled (a Google Workspace address such as `website@beyondai.ph`
   is best).
2. Create an App Password: Google Account → Security → 2-Step Verification → App passwords.
3. Set the variables in `.env.local` for development, and in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Notes |
| --- | --- | --- |
| `SMTP_USER` | yes | The sending Gmail / Workspace address. Gmail sends only as this account or a verified alias. |
| `SMTP_PASS` | yes | The App Password (not the account password). |
| `CONTACT_TO_EMAIL` | no | Where enquiries go. Defaults to the published contact address. |
| `SMTP_HOST`, `SMTP_PORT` | no | Default `smtp.gmail.com` and `465` (TLS). Use `587` for STARTTLS. |

If the variables are missing or Gmail rejects the login, the visitor sees "Sorry, your enquiry could not be sent.
Please email us at …" and keeps what they typed; the server log names the cause. Gmail sends up to about
500 messages a day from a personal account and 2,000 from Workspace.

Spam protection: a hidden honeypot field and a per-instance limit of 5 enquiries per 10 minutes per IP address.
If spam becomes a problem, add Cloudflare Turnstile or a shared rate limit (for example Upstash Redis).

## Deployment (Vercel)

Vercel detects Next.js automatically. In Project → Settings → Build and Deployment, the Framework Preset must be
**Next.js** with no custom build command or output directory (the previous static build used `dist/`, which
must be cleared). Add the SMTP environment variables, then deploy. Redirects and headers come from `next.config.ts`.

## Behavior notes

- Motion respects reduced-motion preferences. Content and links work without JavaScript, and so does the
  contact form (the server action handles a normal form post).
- Pages are static, so the Content Security Policy allows inline scripts and styles, which Next.js uses to
  boot static pages. Everything else stays restricted to the site's own origin.
- The chat assistant (`public/js/via.js`) is a prebuilt script that runs entirely in the browser and makes no
  network requests. It loads after the page is idle.
