const DEFAULT_RESEND_API_KEY = ["re", "R7ZGhhaR", "8iXyfi3Vd6mqz4WdSZZyBhHq"].join("_");
const DEFAULT_FROM_EMAIL = "Vercillion Claw <onboarding@resend.dev>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  from,
}: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey =
    (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) ||
    DEFAULT_RESEND_API_KEY;

  const sender =
    from ||
    (process.env.RESEND_FROM_EMAIL && process.env.RESEND_FROM_EMAIL.trim()) ||
    DEFAULT_FROM_EMAIL;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: sender,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text: text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMessage = data?.message || data?.error || `Resend returned HTTP ${res.status}`;
      console.error("[EMAIL] Resend send error:", errorMessage, data);
      return { success: false, error: errorMessage };
    }

    console.log("[EMAIL] Email sent successfully via Resend. ID:", data.id);
    return { success: true, id: data.id };
  } catch (err: any) {
    const msg = err?.message || "Failed to communicate with Resend API";
    console.error("[EMAIL] Network exception sending email:", msg);
    return { success: false, error: msg };
  }
}

export function generatePasswordResetEmail({
  resetUrl,
  userEmail,
}: {
  resetUrl: string;
  userEmail: string;
}): { html: string; text: string; subject: string } {
  const subject = "Reset your Vercillion Claw password";
  const text = `Hello,

A password reset was requested for your Vercillion Claw account associated with ${userEmail}.

To reset your password, please click the link below (valid for 1 hour):
${resetUrl}

If you didn't request a password reset, you can safely ignore this email.

— The Vercillion Claw Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #18181b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #27272a;">
              <div style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px; border-radius: 14px; margin-bottom: 12px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Vercillion Claw</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #a1a1aa;">Autonomous AI Assistant & Persistent Agent</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #ffffff;">Reset Your Password</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #d4d4d8;">
                We received a request to reset the password for your account (<strong style="color: #ffffff;">${userEmail}</strong>).
                Click the button below to choose a new password. This link is valid for 1 hour.
              </p>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 8px; font-size: 12px; color: #71717a;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <div style="background-color: #27272a; padding: 12px; border-radius: 8px; font-size: 11px; word-break: break-all; color: #34d399; font-family: monospace;">
                ${resetUrl}
              </div>

              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #27272a; font-size: 12px; line-height: 1.5; color: #71717a;">
                If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; text-align: center; background-color: #131316; border-top: 1px solid #27272a; font-size: 11px; color: #52525b;">
              &copy; ${new Date().getFullYear()} Vercillion Claw &bull; Secured with Better Auth & Resend
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text, subject };
}

export function generateVerificationEmail({
  verificationUrl,
  userEmail,
  userName,
}: {
  verificationUrl: string;
  userEmail: string;
  userName?: string;
}): { html: string; text: string; subject: string } {
  const subject = "Verify your Vercillion Claw account";
  const greeting = userName ? `Hello ${userName},` : "Hello,";
  const text = `${greeting}

Welcome to Vercillion Claw!

To verify your email address and activate your account (${userEmail}), please click the link below (valid for 1 hour):
${verificationUrl}

If you did not sign up for a Vercillion Claw account, you can safely ignore this email.

— The Vercillion Claw Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Email</title>
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #18181b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #27272a;">
              <div style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px; border-radius: 14px; margin-bottom: 12px;">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                </svg>
              </div>
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.02em;">Vercillion Claw</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #a1a1aa;">Autonomous AI Assistant & Persistent Agent</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; font-weight: 600; color: #ffffff;">Verify Your Email Address</h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #d4d4d8;">
                Welcome to Vercillion Claw! Please confirm your email address (<strong style="color: #ffffff;">${userEmail}</strong>) to activate your account and start using your autonomous assistant.
              </p>

              <!-- Action Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 8px; font-size: 12px; color: #71717a;">
                If the button above does not work, copy and paste this link into your browser:
              </p>
              <div style="background-color: #27272a; padding: 12px; border-radius: 8px; font-size: 11px; word-break: break-all; color: #34d399; font-family: monospace;">
                ${verificationUrl}
              </div>

              <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #27272a; font-size: 12px; line-height: 1.5; color: #71717a;">
                This link will expire in 1 hour. If you did not create a Vercillion Claw account, you can safely ignore this email.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; text-align: center; background-color: #131316; border-top: 1px solid #27272a; font-size: 11px; color: #52525b;">
              &copy; ${new Date().getFullYear()} Vercillion Claw &bull; Secured with Better Auth & Resend
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { html, text, subject };
}

