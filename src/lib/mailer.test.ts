// SMTP settings and message fields for enquiry emails. nodemailer is replaced by a stub, so nothing is sent.
import { describe, expect, it, vi } from 'vitest';
import { site } from '@/content/site';
import type { Enquiry } from './enquiry';

const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn<(mail: Record<string, unknown>) => Promise<object>>(async () => ({}));
  return { sendMail, createTransport: vi.fn<(options: Record<string, unknown>) => { sendMail: typeof sendMail }>(() => ({ sendMail })) };
});
vi.mock('nodemailer', () => ({ default: { createTransport } }));

const enquiry: Enquiry = { name: 'Ana Reyes', email: 'ana@example.ph', organization: '', topic: 'demo', interest: '', preferredTime: '', message: 'Hello' };

// The transport is created once per module instance, so each test loads a fresh copy with its own environment.
async function loadMailer(env: Record<string, string> = {}) {
  const defaults = { SMTP_USER: 'website@beyondai.ph', SMTP_PASS: 'abcd efgh ijkl mnop', SMTP_HOST: '', SMTP_PORT: '', CONTACT_TO_EMAIL: '' };
  for (const [name, value] of Object.entries({ ...defaults, ...env })) vi.stubEnv(name, value);
  vi.resetModules();
  return (await import('./mailer')).sendEnquiryEmail;
}

describe('sendEnquiryEmail', () => {
  it.each(['SMTP_USER', 'SMTP_PASS'])('fails without %s and creates no transport', async name => {
    const send = await loadMailer({ [name]: '' });
    await expect(send(enquiry)).rejects.toThrow('Email is not configured');
    expect(createTransport).not.toHaveBeenCalled();
  });

  it('connects to Gmail over implicit TLS by default, with the app password spaces removed', async () => {
    await (await loadMailer())(enquiry);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({
      host: 'smtp.gmail.com', port: 465, secure: true, requireTLS: false,
      auth: { user: 'website@beyondai.ph', pass: 'abcdefghijklmnop' },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
    }));
  });

  it('requires STARTTLS on port 587', async () => {
    await (await loadMailer({ SMTP_HOST: 'smtp.example.com', SMTP_PORT: '587' }))(enquiry);
    expect(createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.example.com', port: 587, secure: false, requireTLS: true }));
  });

  it('reuses one transport for later enquiries', async () => {
    const send = await loadMailer();
    await send(enquiry);
    await send(enquiry);
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('sends to the published address from the configured account, with the visitor as Reply-To', async () => {
    await (await loadMailer())(enquiry);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: { name: 'BeyondAi website', address: 'website@beyondai.ph' },
      to: site.email,
      replyTo: { name: 'Ana Reyes', address: 'ana@example.ph' },
      subject: 'Product demo — Ana Reyes',
    }));
  });

  it('sends to CONTACT_TO_EMAIL when it is set', async () => {
    await (await loadMailer({ CONTACT_TO_EMAIL: ' sales@beyondai.ph ' }))(enquiry);
    expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ to: 'sales@beyondai.ph' }));
  });

  it('escapes visitor markup in the HTML part and keeps the text part verbatim', async () => {
    await (await loadMailer())({ ...enquiry, name: '<b>Ana</b>', message: '<img src=x onerror="alert(1)">' });
    const { html, text } = sendMail.mock.calls[0][0];
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(html).not.toMatch(/<img|<b>/);
    expect(text).toContain('<img src=x onerror="alert(1)">');
  });

  it('passes SMTP failures to the caller', async () => {
    const send = await loadMailer();
    sendMail.mockRejectedValueOnce(new Error('Invalid login'));
    await expect(send(enquiry)).rejects.toThrow('Invalid login');
  });
});
