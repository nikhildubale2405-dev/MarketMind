import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export interface SendEmailResult {
  success: boolean;
  message: string;
}

/**
 * Sends a 6-digit verification OTP code to a user's email via SMTP (Nodemailer).
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  otpCode: string,
  displayName?: string
): Promise<SendEmailResult> {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = (process.env.SMTP_USER || "").trim();
  const rawPass = (process.env.SMTP_PASS || "").trim();
  // Strip spaces from Gmail App Password (e.g. "nzib walc narb psiu" -> "nzibwalcnarbpsiu")
  const cleanPass = rawPass.replace(/\s+/g, "");

  let smtpFrom = (process.env.SMTP_FROM || "").trim();
  // Fix malformed from address (e.g. missing @, domain typo, or placeholder string)
  if (!smtpFrom || !smtpFrom.includes("@") || smtpFrom === "SMTP_FROM") {
    smtpFrom = `"MarketMind Auth" <${smtpUser}>`;
  }

  const recipientName = displayName || toEmail.split("@")[0];

  const isPlaceholder = (val: string) =>
    !val ||
    val === "SMTP_USER" ||
    val === "SMTP_PASS" ||
    val.includes("your-gmail") ||
    val.includes("your-16-char") ||
    val === "@gmail.com";

  if (isPlaceholder(smtpUser) || isPlaceholder(cleanPass)) {
    console.warn("[EMAIL] SMTP credentials not set or using placeholders. Printing OTP to console.");
    printConsoleOtp(toEmail, recipientName, otpCode);
    return {
      success: false,
      message: "SMTP credentials not configured in .env. OTP printed to server console.",
    };
  }

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 12px 24px; border-radius: 12px; margin-bottom: 12px;">
          <span style="color: white; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">MarketMind</span>
        </div>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0; font-weight: 500;">Email Verification</p>
      </div>

      <p style="color: #334155; font-size: 15px; margin-bottom: 8px;">Hello <strong>${recipientName}</strong>,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Thanks for signing up for MarketMind! Use the verification code below to confirm your email address and activate your account.
      </p>

      <div style="background: #f8fafc; border: 2px dashed #c7d2fe; padding: 24px 16px; border-radius: 14px; text-align: center; margin: 0 0 24px;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Verification Code</p>
        <span style="font-size: 40px; font-weight: 900; color: #1e1b4b; font-family: 'Courier New', monospace; letter-spacing: 8px;">${otpCode}</span>
        <p style="margin: 10px 0 0; color: #94a3b8; font-size: 12px;">Expires in <strong>10 minutes</strong></p>
      </div>

      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 20px;">
        If you didn't request this email, you can safely ignore it.
      </p>

      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 0 0 16px;" />
      <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin: 0;">
        &copy; ${new Date().getFullYear()} MarketMind Trading Journal
      </p>
    </div>
  `;

  try {
    // For Gmail, nodemailer's built-in service: "gmail" handles SSL/TLS and ports reliably
    const transporter =
      smtpHost === "smtp.gmail.com" || smtpUser.endsWith("@gmail.com")
        ? nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: smtpUser,
              pass: cleanPass,
            },
          })
        : nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: cleanPass,
            },
          });

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `${otpCode} — Your MarketMind verification code`,
      html: htmlContent,
    });

    console.log(`[EMAIL] ✓ Verification OTP sent to ${toEmail} (Message ID: ${info.messageId})`);
    return { success: true, message: "Verification email sent successfully." };
  } catch (err: any) {
    console.error(`[EMAIL] ✗ Failed to send email to ${toEmail}:`, err.message || err);
    // Print to console as emergency fallback
    printConsoleOtp(toEmail, recipientName, otpCode);
    return {
      success: false,
      message: err.message || "Failed to send verification email.",
    };
  }
}

function printConsoleOtp(email: string, name: string, otp: string) {
  console.log(`
╔══════════════════════════════════════════════════════╗
║       MARKETMIND — EMAIL VERIFICATION (FALLBACK)     ║
╠══════════════════════════════════════════════════════╣
║  To:   ${email.padEnd(44)}  ║
║  Name: ${name.padEnd(44)}  ║
║  OTP:  ${otp.padEnd(44)}  ║
║  Note: Code expires in 10 minutes                    ║
╚══════════════════════════════════════════════════════╝
  `);
}
