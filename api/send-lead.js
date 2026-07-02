// ─── InfiniteAg — Lead Form Handler ──────────────────────────────────────────
// Vercel Serverless Function (Node.js)
// POST /api/send-lead — sends new quote request email via Resend SDK
// ─────────────────────────────────────────────────────────────────────────────

const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, email, city, service, message } = req.body || {};

  // ── Server-side validation ──────────────────────────────────────────────────
  if (!name || !phone || !email) {
    return res.status(400).json({ error: 'Name, phone number, and email are required.' });
  }

  const phoneDigits = (phone || '').replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit US phone number.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // ── Resolve env vars ───────────────────────────────────────────────────────
  const apiKey    = process.env.RESEND_API_KEY;
  const fromEmail = process.env.LEAD_FROM_EMAIL;
  const toEmail   = process.env.LEAD_TO_EMAIL;

  if (!apiKey || !fromEmail || !toEmail) {
    console.error('[send-lead] Missing env vars. Ensure RESEND_API_KEY, LEAD_FROM_EMAIL, and LEAD_TO_EMAIL are set.');
    return res.status(500).json({ error: 'Email service is not configured.' });
  }

  // ── Build email body ───────────────────────────────────────────────────────
  const submittedTime = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' });

  const textLines = [
    'New quote request from InfiniteAg website',
    '─'.repeat(44),
    `Name:  ${name}`,
    `Phone: ${phone}`,
    `Email: ${email}`,
  ];
  if (city) textLines.push(`City:    ${city}`);
  if (service) textLines.push(`Service: ${service}`);
  if (message) textLines.push('', 'Message:', message);
  textLines.push(
    '',
    '─'.repeat(44),
    `Submitted: ${submittedTime} ET`,
    'Call or text the customer directly to follow up.',
  );
  const textBody = textLines.join('\n');

  const htmlRows = [
    `<tr><td style="padding:6px 0;color:#68766C;width:90px;vertical-align:top">Name</td><td style="padding:6px 0;font-weight:600">${escapeHtml(name)}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#68766C;vertical-align:top">Phone</td><td style="padding:6px 0;font-weight:600"><a href="tel:${escapeHtml(phoneDigits)}" style="color:#3F8F46">${escapeHtml(phone)}</a></td></tr>`,
    `<tr><td style="padding:6px 0;color:#68766C;vertical-align:top">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(email)}" style="color:#3F8F46">${escapeHtml(email)}</a></td></tr>`,
  ];
  if (city) htmlRows.push(`<tr><td style="padding:6px 0;color:#68766C;vertical-align:top">City</td><td style="padding:6px 0">${escapeHtml(city)}</td></tr>`);
  if (service) htmlRows.push(`<tr><td style="padding:6px 0;color:#68766C;vertical-align:top">Service</td><td style="padding:6px 0">${escapeHtml(service)}</td></tr>`);
  htmlRows.push(`<tr><td style="padding:6px 0;color:#68766C;vertical-align:top">Submitted</td><td style="padding:6px 0;font-size:13px;color:#68766C">${escapeHtml(submittedTime)} ET</td></tr>`);

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;color:#1D2A22">
      <h2 style="color:#174A2A;margin-bottom:4px">New Quote Request</h2>
      <p style="color:#68766C;margin-top:0;font-size:13px">Submitted via InfiniteAg website</p>
      <hr style="border:none;border-top:1px solid #E6EDE2;margin:16px 0"/>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        ${htmlRows.join('\n        ')}
      </table>
      ${message ? `<hr style="border:none;border-top:1px solid #E6EDE2;margin:16px 0"/><p style="color:#68766C;font-size:13px;margin-bottom:4px">Message</p><p style="margin-top:0">${escapeHtml(message).replace(/\n/g, '<br/>')}</p>` : ''}
      <hr style="border:none;border-top:1px solid #E6EDE2;margin:20px 0"/>
      <p style="font-size:12px;color:#A0A0A0">Call or text <strong>${escapeHtml(phone)}</strong> to follow up with this customer.</p>
    </div>
  `;

  console.log('[send-lead] Received submission. City:', city || 'n/a', '| Service:', service || 'n/a');

  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from:    fromEmail,
      to:      [toEmail],
      replyTo: email,
      subject: `New Quote Request — ${name} (${phone})`,
      text:    textBody,
      html:    htmlBody,
    });

    if (error) {
      console.error('[send-lead] Resend error:', error.name, error.message);
      return res.status(502).json({ error: 'Failed to send email. Please try again.' });
    }

    console.log('[send-lead] Email sent. ID:', data?.id);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('[send-lead] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Unexpected error. Please try again.' });
  }
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
