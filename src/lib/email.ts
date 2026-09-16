import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export interface SendEmailResult {
  success: boolean;
  message: string;
}

/**
 * Sends a 6-digit verification OTP code to a user's email via SMTP (Nodemailer).
 *
 * Configuration (in .env):
 *   SMTP_HOST   — e.g. smtp.gmail.com
 *   SMTP_PORT   — e.g. 587
 *   SMTP_USER   — your email address
 *   SMTP_PASS   — App Password (for Gmail: generate at myaccount.google.com/apppasswords)
 *   SMTP_FROM   — display name + address, e.g. "MarketMind <you@gmail.com>"
 *
 * If SMTP is not configured, the OTP is printed in the server console instead.
 */
export async function sendVerificationOtpEmail(
  toEmail: string,
  otpCode: string,
  displayName?: string
): Promise<SendEmailResult> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || "587", 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || `MarketMind <${smtpUser}>`;

  const recipientName = displayName || toEmail.split("@")[0];

  // Check if SMTP credentials are actually set (not placeholder values)
  const isSmtpConfigured =
    smtpHost &&
    smtpUser &&
    smtpPass &&
    smtpHost !== "smtp.gmail.com" ||
    (smtpHost === "smtp.gmail.com" &&
      smtpUser &&
      smtpPass &&
      smtpUser !== "your-gmail@gmail.com" &&
      smtpPass !== "your-16-char-app-password");

  if (!isSmtpConfigured) {
    // Print OTP to server console
    printConsoleOtp(toEmail, recipientName, otpCode);
    return { success: true, message: "OTP generated. Check server console (SMTP not configured)." };
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 12px 24px; border-radius: 12px; margin-bottom: 12px;">
          <span style="color: white; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">MarketMind</span>
        </div>
        <p style="color: #64748b; font-size: 13px; margin: 4px 0 0;">Email Verification</p>
      </div>

      <p style="color: #334155; font-size: 15px; margin-bottom: 8px;">Hello <strong>${recipientName}</strong>,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Thanks for signing up for MarketMind! Use the verification code below to confirm your email address and activate your account.
      </p>

      <div style="background: #f8fafc; border: 2px dashed #c7d2fe; padding: 24px 16px; border-radius: 14px; text-align: center; margin: 0 0 24px;">
        <p style="margin: 0 0 8px; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Verification Code</p>
        <span style="font-size: 42px; font-weight: 900; color: #1e1b4b; font-family: 'Courier New', monospace; letter-spacing: 10px;">${otpCode}</span>
        <p style="margin: 10px 0 0; color: #94a3b8; font-size: 12px;">Expires in <strong>10 minutes</strong></p>
      </div>

      <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-bottom: 20px;">
        If you didn't create a MarketMind account, you can safely ignore this email.
      </p>

      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 0 0 16px;" />
      <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin: 0;">
        &copy; ${new Date().getFullYear()} MarketMind Trading Journal
      </p>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject: `${otpCode} — Your MarketMind verification code`,
      html: htmlContent,
    });

    console.log(`[EMAIL] ✓ Verification OTP sent to ${toEmail}`);
    return { success: true, message: "Verification email sent successfully." };
  } catch (err: any) {
    console.error(`[EMAIL] ✗ Failed to send to ${toEmail}:`, err.message);
    // Fallback to console print so registration flow still works
    printConsoleOtp(toEmail, recipientName, otpCode);
    return { success: true, message: "OTP generated. Email sending failed — check server console." };
  }
}

function printConsoleOtp(email: string, name: string, otp: string) {
  console.log(`
╔══════════════════════════════════════════════════════╗
║       MARKETMIND — EMAIL VERIFICATION (CONSOLE)      ║
╠══════════════════════════════════════════════════════╣
║  To:   ${email.padEnd(44)}  ║
║  Name: ${name.padEnd(44)}  ║
║  OTP:  ${otp.padEnd(44)}  ║
║  Note: Code expires in 10 minutes                    ║
╚══════════════════════════════════════════════════════╝
  `);
  console.warn("[EMAIL] SMTP not configured or using placeholder values.");
  console.warn("[EMAIL] Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env to send real emails.");
}
