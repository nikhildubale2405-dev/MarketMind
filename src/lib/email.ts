import dotenv from "dotenv";

dotenv.config();

export interface SendEmailResult {
  success: boolean;
  message: string;
  isDevFallback?: boolean;
  devOtp?: string;
}

/**
 * Sends a 6-digit verification OTP code to a user's email.
 * If SMTP variables (SMTP_HOST, SMTP_USER, etc.) are set in .env, sends via Nodemailer.
 * Otherwise, outputs a formatted box in the server console for local testing.
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
  const smtpFrom = process.env.SMTP_FROM || `"MarketMind Auth" <no-reply@marketmind.com>`;

  const recipientName = displayName || toEmail.split("@")[0];

  // If SMTP credentials are configured, attempt sending real email via Nodemailer
  if (smtpHost && smtpUser && smtpPass) {
    try {
      // Dynamic import of nodemailer so app runs even if module isn't installed in dev
      const nodemailer = await import("nodemailer").catch(() => null);
      if (nodemailer) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #4f46e5; margin: 0; font-size: 24px;">MarketMind</h1>
              <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Email Verification Code</p>
            </div>
            
            <p style="color: #334155; font-size: 15px;">Hello <strong>${recipientName}</strong>,</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">
              Thank you for signing up for MarketMind! Please enter the 6-digit verification code below to verify your account registration.
            </p>
            
            <div style="background-color: #f1f5f9; padding: 18px; border-radius: 12px; text-align: center; margin: 24px 0; letter-spacing: 6px;">
              <span style="font-size: 32px; font-weight: bold; color: #1e1b4b; font-family: monospace;">${otpCode}</span>
            </div>

            <p style="color: #64748b; font-size: 12px; text-align: center;">
              This code will expire in <strong>10 minutes</strong>. If you did not request this, please ignore this email.
            </p>
            
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
              &copy; ${new Date().getFullYear()} MarketMind Trading Journal. All rights reserved.
            </p>
          </div>
        `;

        await transporter.sendMail({
          from: smtpFrom,
          to: toEmail,
          subject: `${otpCode} is your MarketMind verification code`,
          html: htmlContent
        });

        console.log(`[EMAIL SERVICE] Verification OTP email successfully sent to ${toEmail}`);
        return { success: true, message: "Verification email sent successfully." };
      }
    } catch (err: any) {
      console.error("[EMAIL SERVICE ERROR] Failed to send via Nodemailer:", err.message);
      // Fallback to console print below
    }
  }

  // Local Development Fallback: Print OTP code to server console
  console.log("\n============================================================");
  console.log("  [MARKETMIND EMAIL SERVICE - LOCAL DEV OTP]");
  console.log(`  To: ${toEmail} (${recipientName})`);
  console.log(`  VERIFICATION CODE: [ ${otpCode} ]`);
  console.log("  Expires in: 10 minutes");
  console.log("============================================================\n");

  return {
    success: true,
    message: "Verification OTP generated. Check server logs or SMTP inbox.",
    isDevFallback: !smtpHost,
    devOtp: otpCode
  };
}
