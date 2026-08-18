import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
};

export const sendOtpEmail = async (email: string, otp: string, purpose: 'signup' | 'forgot_password'): Promise<boolean> => {
  const subject = purpose === 'signup' 
    ? 'Digi-Gate Verification OTP' 
    : 'Digi-Gate Password Reset OTP';

  const titleText = purpose === 'signup'
    ? 'Verify Your Account'
    : 'Reset Your Password';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 12px; background-color: #f9fdfd;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #035352; margin: 0;">DIGI-GATE</h2>
        <p style="color: #666; font-size: 12px; margin-top: 4px;">Security & Access Control</p>
      </div>
      <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e2e8f0;">
        <h3 style="color: #172525; margin-top: 0;">${titleText}</h3>
        <p style="color: #4a5d5c; font-size: 14px; line-height: 1.5;">
          Your 6-digit One-Time Password (OTP) for <strong>${email}</strong> is:
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #035352; background: #F3E8BC; padding: 12px 24px; border-radius: 8px; border: 1px solid #e0d49d;">
            ${otp}
          </span>
        </div>
        <p style="color: #718096; font-size: 12px; margin-bottom: 0;">
          This OTP is valid for 10 minutes. If you did not request this code, please ignore this email.
        </p>
      </div>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`🔑 [OTP GENERATED] To: ${email} | Purpose: ${purpose} | OTP: ${otp}`);
  console.log(`==================================================\n`);

  try {
    const transporter = createTransporter();
    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"Digi-Gate Security" <noreply@digigate.com>',
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`✅ OTP email sent successfully to ${email}`);
      return true;
    } else {
      console.log(`ℹ️ SMTP not configured. OTP printed to console log above.`);
      return true;
    }
  } catch (error) {
    console.error(`⚠️ Failed to send OTP email via SMTP to ${email}:`, error);
    // Still return true so signup/reset flow doesn't block local dev testing
    return true;
  }
};
