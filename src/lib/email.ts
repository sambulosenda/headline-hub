export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Shown by mail apps as an unsubscribe button. */
  unsubscribeUrl?: string;
}

/**
 * Sends through Resend when RESEND_API_KEY and EMAIL_FROM are set; otherwise
 * prints the email, which is all local development needs.
 */
export async function sendEmail(email: Email): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.log(`[email] to ${email.to}: ${email.subject}\n${email.text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: email.unsubscribeUrl ? { "List-Unsubscribe": `<${email.unsubscribeUrl}>` } : undefined,
    }),
  });
  if (!res.ok) throw new Error(`Email send failed: ${res.status} ${await res.text()}`);
}
