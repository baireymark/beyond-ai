// Sends contact enquiries through Gmail / Google Workspace SMTP. Server-only: credentials never reach the browser.
import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { site } from '@/content/site';
import { enquiryLines, topicLabel, type Enquiry } from '@/lib/enquiry';

let transporter: Transporter | undefined;

function smtp() {
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, ''); // Google shows app passwords in groups of four
  if (!user || !pass) throw new Error('Email is not configured: set SMTP_USER and SMTP_PASS (see .env.example).');
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465, // 465: TLS from the first byte; 587: STARTTLS, which requireTLS makes mandatory
      requireTLS: port !== 465,
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return { transporter, user };
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export async function sendEnquiryEmail(e: Enquiry): Promise<void> {
  const { transporter, user } = smtp();
  const lines = enquiryLines(e);
  await transporter.sendMail({
    // Gmail only sends as the signed-in account (or a verified alias); the visitor goes in Reply-To.
    from: { name: `${site.brand} website`, address: user },
    to: process.env.CONTACT_TO_EMAIL?.trim() || site.email,
    replyTo: { name: e.name, address: e.email },
    subject: `${topicLabel(e.topic)} — ${e.name}`,
    text: lines.join('\n'),
    html: `<div style="font:15px/1.5 system-ui,sans-serif">${lines.map(l => (l ? `<p style="margin:0 0 4px;white-space:pre-wrap">${escapeHtml(l)}</p>` : '<br>')).join('')}</div>`,
  });
}
