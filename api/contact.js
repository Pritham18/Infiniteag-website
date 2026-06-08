// ─── InfiniteAg — Contact Form Handler ───────────────────────────────────────
// Vercel Serverless Function (Node.js)
// Receives form POST, sends email via Resend API to Agri@INFINITEAGWORLD.COM
//
// SETUP CHECKLIST (one-time):
//  1. Add RESEND_API_KEY in Vercel → Settings → Environment Variables
//  2. Sign up at resend.com and verify the domain "infiniteagworld.com"
//     (add the DNS TXT record Resend gives you in your WordPress domain DNS)
//  3. Once domain is verified, the "from" address below becomes active.
//     Until then, change FROM_ADDRESS to "onboarding@resend.dev" for testing.
// ─────────────────────────────────────────────────────────────────────────────

const TO_ADDRESS   = 'Agri@INFINITEAGWORLD.COM';
const FROM_ADDRESS = 'InfiniteAg Website <onboarding@resend.dev>';
const RESEND_API   = 'https://api.resend.com/emails';

module.exports = async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, address, service, message } = req.body || {};

  // ── Server-side validation ──────────────────────────────────────────────────
  if (!name || !email || !address) {
    return res.status(400).json({ error: 'Name, email, and address are required.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  // ── Check API key is configured ────────────────────────────────────────────
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY environment variable is not set.');
    return res.status(500).json({ error: 'Email service is not configured yet.' });
  }

  // ── Build email body ───────────────────────────────────────────────────────
  const serviceLabel = service || 'Not specified';
  const messageText  = message  || 'None';

  const textBody = [
    'New quote request from InfiniteAg website',
    '─'.repeat(44),
    `Name:     ${name}`,
    `Email:    ${email}`,
    `Address:  ${address}`,
    `Service:  ${serviceLabel}`,
    '',
    `Message:`,
    messageText,
    '',
    '─'.repeat(44),
    'Reply directly to this email to respond to the enquiry.',
  ].join('\n');

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px;color:#1D2A22">
      <h2 style="color:#174A2A;margin-bottom:4px">New Quote Request</h2>
      <p style="color:#68766C;margin-top:0;font-size:13px">Submitted via InfiniteAg website</p>
      <hr style="border:none;border-top:1px solid #E6EDE2;margin:16px 0"/>
      <table style="width:100%;border-collapse:collapse;font-size:15px">
        <tr><td style="padding:6px 0;color:#68766C;width:90px">Name</td><td style="padding:6px 0;font-weight:600">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:6px 0;color:#68766C">Email</td><td style="padding:6px 0"><a href="mailto:${escapeHtml(email)}" style="color:#3F8F46">${escapeHtml(email)}</a></td></tr>
        <tr><td style="padding:6px 0;color:#68766C">Address</td><td style="padding:6px 0">${escapeHtml(address)}</td></tr>
        <tr><td style="padding:6px 0;color:#68766C">Service</td><td style="padding:6px 0">${escapeHtml(serviceLabel)}</td></tr>
      </table>
      ${message ? `<hr style="border:none;border-top:1px solid #E6EDE2;margin:16px 0"/><p style="color:#68766C;font-size:13px;margin-bottom:4px">Message</p><p style="margin-top:0">${escapeHtml(message).replace(/\n/g, '<br/>')}</p>` : ''}
      <hr style="border:none;border-top:1px solid #E6EDE2;margin:20px 0"/>
      <p style="font-size:12px;color:#A0A0A0">Reply to this email to contact ${escapeHtml(name)} directly.</p>
    </div>
  `;

  // ── Send via Resend ────────────────────────────────────────────────────────
  try {
    const response = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [TO_ADDRESS],
        reply_to: email,
        subject: `New Quote Request — ${name}`,
        text: textBody,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Resend API error:', errData);
      return res.status(502).json({ error: 'Failed to send email. Please try again.' });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Contact handler error:', err);
    return res.status(500).json({ error: 'Unexpected error. Please try again.' });
  }
};

// Simple HTML escape to prevent XSS in email body
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
