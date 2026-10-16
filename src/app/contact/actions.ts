'use server';
// Email fallback for the contact form. Enquiries go from the browser straight to the BeyondAi Admin API; the form
// calls this only when that API fails (5xx, network or CORS error, timeout), so the enquiry still reaches the team.
// Nothing is stored here. The action is reachable by anyone, so it re-validates and keeps the honeypot and rate limit.
import { headers } from 'next/headers';
import { parseLead } from '@/lib/enquiry';
import { sendEnquiryEmail } from '@/lib/mailer';
import { allowRequest } from '@/lib/rate-limit';

export async function sendEnquiryByEmail(input: unknown): Promise<'sent' | 'invalid' | 'error'> {
  // Honeypot: people never see the companyUrl field; bots that fill it get a normal-looking success.
  const trap = (input as { companyUrl?: unknown } | null)?.companyUrl;
  if (typeof trap === 'string' && trap) return 'sent';

  const parsed = parseLead(input);
  if (!parsed.ok) return 'invalid';

  const h = await headers();
  const client = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!allowRequest(client)) return 'error';

  try {
    await sendEnquiryEmail(parsed.data);
    return 'sent';
  } catch (err) {
    // Log the cause only; the enquiry itself is personal data.
    console.error('[contact] fallback enquiry email failed:', err instanceof Error ? err.message : err);
    return 'error';
  }
}
