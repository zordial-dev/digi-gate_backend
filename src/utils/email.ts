import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.AWS_SMTP_USERNAME || process.env.SMTP_USER;
  const pass = process.env.AWS_SMTP_PASSWORD || process.env.SMTP_PASS;

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
          Your static 4-digit One-Time Password (OTP) for <strong>${email}</strong> is:
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
    const fromAddr = process.env.AWS_SES_FROM || process.env.SMTP_FROM || '"DigiLocal Platform" <connexon@zordial.com>';

    if (transporter) {
      await transporter.sendMail({
        from: fromAddr,
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
    return true;
  }
};

export const sendOrgApprovalEmail = async (
  email: string,
  orgName: string,
  randomPassword: string,
  loginUrl?: string
): Promise<boolean> => {
  const targetUrl = loginUrl || process.env.ORG_LOGIN_URL || 'http://localhost:5173/login';
  const subject = 'Your Organisation Account Has Been Approved - DigiGate';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fdfd;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #035352; margin: 0; font-size: 24px; font-weight: bold;">DIGI-GATE</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Organisation Access & Visitor Management</p>
      </div>
      <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <h3 style="color: #1e293b; margin-top: 0; font-size: 18px;">Registration Approved! 🎉</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Congratulations! Your organisation <strong>${orgName}</strong> has been approved by the System Administrator.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          You can now log in to your Organisation Portal using your registered email and the generated password below:
        </p>

        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; border-left: 4px solid #035352; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold;">Temporary Password</p>
          <p style="margin: 6px 0 0 0; font-size: 20px; font-family: monospace; font-weight: bold; color: #035352; letter-spacing: 2px;">
            ${randomPassword}
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #035352; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
            Log In to Organisation Portal
          </a>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; margin-top: 24px;">
          <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">
            <strong>⚠️ Important Security Note:</strong> Please reset your password once successfully logged in via the Change Password feature in your portal.
          </p>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Digi-Gate Access Control System &bull; All rights reserved.</p>
      </div>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`✉️ [APPROVAL EMAIL] To: ${email} | Org: ${orgName} | Password: ${randomPassword}`);
  console.log(`==================================================\n`);

  try {
    const transporter = createTransporter();
    const fromAddr = process.env.AWS_SES_FROM || process.env.SMTP_FROM || '"DigiLocal Platform" <connexon@zordial.com>';

    if (transporter) {
      await transporter.sendMail({
        from: fromAddr,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`✅ Org approval email sent successfully to ${email}`);
      return true;
    } else {
      console.log(`ℹ️ SMTP not configured. Password printed to console log above.`);
      return true;
    }
  } catch (error) {
    console.error(`⚠️ Failed to send org approval email via SMTP to ${email}:`, error);
    return false;
  }
};
