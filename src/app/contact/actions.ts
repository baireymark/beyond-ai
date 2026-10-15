'use server';
// Contact form submission. Runs on the server for both the enhanced form (fetch) and the no-JavaScript form post.
import { headers } from 'next/headers';
import { parseEnquiry, type EnquiryState } from '@/lib/enquiry';
import { sendEnquiryEmail } from '@/lib/mailer';
import { allowRequest } from '@/lib/rate-limit';

export async function sendEnquiry(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  // Honeypot: people never see the "website" field; bots that fill it get a normal-looking success.
  if (form.get('website')) return { status: 'sent' };

  const parsed = parseEnquiry(form);
  if (!parsed.ok) return { status: 'invalid', fields: parsed.fields };

  const h = await headers();
  const client = h.get('x-real-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!allowRequest(client)) return { status: 'error' };

  try {
    await sendEnquiryEmail(parsed.data);
    return { status: 'sent' };
  } catch (err) {
    // Log the cause only; the enquiry itself is personal data.
    console.error('[contact] enquiry email failed:', err instanceof Error ? err.message : err);
    return { status: 'error' };
  }
}
