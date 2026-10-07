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

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  response?: string;
  error?: string;
  output?: any;
}

export const AWS_SES_COMMON_ERRORS: Record<string, { description: string; httpStatus: number }> = {
  AccountSuspendedException: {
    description: "The message can't be sent because the account's ability to send email has been permanently restricted.",
    httpStatus: 400,
  },
  BadRequestException: {
    description: "The input you provided is invalid.",
    httpStatus: 400,
  },
  LimitExceededException: {
    description: "There are too many instances of the specified resource type.",
    httpStatus: 400,
  },
  MailFromDomainNotVerifiedException: {
    description: "The message can't be sent because the sending domain isn't verified.",
    httpStatus: 400,
  },
  MessageRejected: {
    description: "The message can't be sent because it contains invalid content.",
    httpStatus: 400,
  },
  NotFoundException: {
    description: "The resource you attempted to access doesn't exist.",
    httpStatus: 404,
  },
  SendingPausedException: {
    description: "The message can't be sent because the account's ability to send email is currently paused.",
    httpStatus: 400,
  },
  TooManyRequestsException: {
    description: "Too many requests have been made to the operation.",
    httpStatus: 429,
  },
};

export const sendOtpEmail = async (
  email: string,
  otp: string,
  purpose: 'signup' | 'forgot_password'
): Promise<EmailSendResult> => {
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
          Your One-Time Password (OTP) for <strong>${email}</strong> is:
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
    let fromAddr = process.env.AWS_SES_FROM || process.env.SMTP_FROM || '"DigiGate Platform" <connexon@zordial.com>';

    if (!transporter) {
      const errorMsg = 'SMTP not configured on the server. Please check SMTP_HOST, AWS_SMTP_USERNAME, and AWS_SMTP_PASSWORD.';
      console.warn(`⚠️ [sendOtpEmail] ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        output: {
          status: 'NOT_CONFIGURED',
          message: errorMsg,
          host: process.env.SMTP_HOST || null,
          port: process.env.SMTP_PORT || null,
          docsUrl: 'https://docs.aws.amazon.com/ses/latest/APIReference-V2/CommonErrors.html',
        },
      };
    }

    const info = await transporter.sendMail({
      from: fromAddr,
      to: email,
      subject,
      html: htmlContent,
    });

    console.log(`✅ OTP email sent successfully to ${email}. MessageId: ${info.messageId}, Response: ${info.response}`);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      output: {
        status: 'SENT',
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
      },
    };
  } catch (error: any) {
    console.error(`❌ Failed to send OTP email via SMTP to ${email}:`, error);

    const rawMsg = `${error?.message || ''} ${error?.response || ''}`;
    let matchedErrorType: string | null = null;
    let matchedDetails: { description: string; httpStatus: number } | null = null;

    for (const [errType, details] of Object.entries(AWS_SES_COMMON_ERRORS)) {
      if (rawMsg.toLowerCase().includes(errType.toLowerCase())) {
        matchedErrorType = errType;
        matchedDetails = details;
        break;
      }
    }

    const serviceErrorOutput = {
      status: 'FAILED',
      message: error?.message || 'SMTP delivery failed',
      errorType: matchedErrorType || (error?.code ? `SMTP_${error.code}` : 'DeliveryError'),
      description: matchedDetails?.description || error?.message || 'SMTP delivery failed',
      httpStatusCode: matchedDetails?.httpStatus || 400,
      code: error?.code,
      command: error?.command,
      response: error?.response,
      responseCode: error?.responseCode,
      docsUrl: 'https://docs.aws.amazon.com/ses/latest/APIReference-V2/CommonErrors.html',
    };
    return {
      success: false,
      error: matchedDetails?.description || error?.message || 'Failed to send OTP email via SMTP service',
      output: serviceErrorOutput,
    };
  }
};

export const sendRegistrationReceivedEmail = async (
  email: string,
  orgName: string
): Promise<boolean> => {
  const subject = 'Registration Request Received - Digi-Gate';

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fdfd;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #035352; margin: 0; font-size: 24px; font-weight: bold;">DIGI-GATE</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Organisation Access & Visitor Management</p>
      </div>
      <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <h3 style="color: #1e293b; margin-top: 0; font-size: 18px;">Registration Request Received 📋</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Thank you for registering <strong>${orgName}</strong> with Digi-Gate.
        </p>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Your registration request has been submitted successfully and is currently under review by our Super Administrator team.
        </p>
        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0; color: #166534; font-size: 13px; font-weight: 500;">
            ✓ We have recorded your account credentials. Once your registration is approved, your Organisation Super Admin portal will be activated immediately.
          </p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          You will receive an email notification as soon as the verification review is complete.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Digi-Gate Access Control System &bull; All rights reserved.</p>
      </div>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`✉️ [REGISTRATION RECEIVED EMAIL] To: ${email} | Org: ${orgName}`);
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
      console.log(`✅ Registration received email sent successfully to ${email}`);
      return true;
    } else {
      console.log(`ℹ️ SMTP not configured. Email logged to console.`);
      return true;
    }
  } catch (error) {
    console.error(`⚠️ Failed to send registration received email via SMTP to ${email}:`, error);
    return false;
  }
};

export const sendSuperAdminApprovalRequestEmail = async (
  orgName: string,
  orgEmail: string,
  orgPhone?: string
): Promise<boolean> => {
  const adminEmail = process.env.SUPERADMIN_EMAIL || 'connexon@zordial.com';
  const subject = `[Action Required] New Organisation Registration: ${orgName}`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #035352; margin: 0; font-size: 24px; font-weight: bold;">DIGI-GATE SUPER ADMIN</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Approval & Verification Center</p>
      </div>
      <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #cbd5e1;">
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">New Organisation Registration Request 🏢</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          A new business has applied to onboard with Digi-Gate and is awaiting your review:
        </p>
        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Organisation:</strong> ${orgName}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Business Email:</strong> ${orgEmail}</p>
          ${orgPhone ? `<p style="margin: 4px 0; font-size: 14px; color: #1e293b;"><strong>Phone:</strong> ${orgPhone}</p>` : ''}
        </div>
        <p style="color: #475569; font-size: 13px; line-height: 1.5;">
          Please log in to your Digi-Gate SuperAdmin dashboard to review, approve, or deny this registration.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Digi-Gate Administrator Alerts</p>
      </div>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`🔔 [SUPERADMIN NOTIFICATION] Org: ${orgName} | Email: ${orgEmail}`);
  console.log(`==================================================\n`);

  try {
    const transporter = createTransporter();
    const fromAddr = process.env.AWS_SES_FROM || process.env.SMTP_FROM || '"DigiLocal Platform" <connexon@zordial.com>';

    if (transporter) {
      await transporter.sendMail({
        from: fromAddr,
        to: adminEmail,
        subject,
        html: htmlContent,
      });
      console.log(`✅ SuperAdmin notification email sent successfully to ${adminEmail}`);
      return true;
    } else {
      console.log(`ℹ️ SMTP not configured. Notification logged to console.`);
      return true;
    }
  } catch (error) {
    console.error(`⚠️ Failed to send SuperAdmin notification email to ${adminEmail}:`, error);
    return false;
  }
};

export const sendOrgApprovalEmail = async (
  email: string,
  orgName: string,
  randomPassword?: string,
  loginUrl?: string
): Promise<boolean> => {
  const targetUrl = loginUrl || process.env.ORG_LOGIN_URL || 'http://localhost:5173/login';
  const subject = 'Your Organisation Account Has Been Approved - DigiGate';

  const credentialSection = randomPassword
    ? `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        You can log in to your Organisation Portal using your registered email and the generated temporary password below:
      </p>
      <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; border-left: 4px solid #035352; margin: 20px 0;">
        <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: bold;">Temporary Password</p>
        <p style="margin: 6px 0 0 0; font-size: 20px; font-family: monospace; font-weight: bold; color: #035352; letter-spacing: 2px;">
          ${randomPassword}
        </p>
      </div>
    `
    : `
      <p style="color: #334155; font-size: 14px; line-height: 1.6;">
        You can now log in to your Organisation Portal using your registered business email (<strong>${email}</strong>) and the password you set during registration.
      </p>
    `;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f9fdfd;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #035352; margin: 0; font-size: 24px; font-weight: bold;">DIGI-GATE</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Organisation Access & Visitor Management</p>
      </div>
      <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <h3 style="color: #1e293b; margin-top: 0; font-size: 18px;">Registration Approved! 🎉</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Congratulations! Your organisation <strong>${orgName}</strong> has been approved by the Super Administrator.
        </p>
        ${credentialSection}
        <div style="text-align: center; margin: 28px 0 20px 0;">
          <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #035352; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 28px; border-radius: 8px;">
            Log In to Organisation Portal
          </a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Digi-Gate Access Control System &bull; All rights reserved.</p>
      </div>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`✉️ [APPROVAL EMAIL] To: ${email} | Org: ${orgName}`);
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
      console.log(`ℹ️ SMTP not configured. Approval logged to console.`);
      return true;
    }
  } catch (error) {
    console.error(`⚠️ Failed to send org approval email via SMTP to ${email}:`, error);
    return false;
  }
};

export const sendOrgRejectionEmail = async (
  email: string,
  orgName: string,
  reason: string
): Promise<boolean> => {
  const subject = `Update on Your Organisation Registration - Digi-Gate`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #fffaf0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #991b1b; margin: 0; font-size: 24px; font-weight: bold;">DIGI-GATE</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Organisation Access & Verification</p>
      </div>
      <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #fed7aa;">
        <h3 style="color: #991b1b; margin-top: 0; font-size: 18px;">Registration Request Update</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Thank you for your interest in Digi-Gate. After reviewing your registration for <strong>${orgName}</strong>, we are unable to approve your application at this time.
        </p>
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #991b1b; font-weight: bold;">Reason for Decision</p>
          <p style="margin: 6px 0 0 0; color: #b91c1c; font-size: 14px; line-height: 1.5;">
            ${reason}
          </p>
        </div>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
          If you have questions or would like to submit additional information, please contact our support team.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Digi-Gate Access Control System &bull; All rights reserved.</p>
      </div>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`✉️ [REJECTION EMAIL] To: ${email} | Org: ${orgName} | Reason: ${reason}`);
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
      console.log(`✅ Org rejection email sent successfully to ${email}`);
      return true;
    } else {
      console.log(`ℹ️ SMTP not configured. Rejection logged to console.`);
      return true;
    }
  } catch (error) {
    console.error(`⚠️ Failed to send org rejection email via SMTP to ${email}:`, error);
    return false;
  }
};

export const sendHostWelcomeEmail = async (
  email: string,
  hostName: string,
  hostId: number | string,
  tempPassword: string,
  orgName?: string
): Promise<boolean> => {
  const subject = `Welcome to Digi-Gate - Your Host Login Credentials`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #035352; margin: 0; font-size: 24px; font-weight: bold;">DIGI-GATE</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Host Access Portal</p>
      </div>
      <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h3 style="color: #1e293b; margin-top: 0; font-size: 18px;">Welcome, ${hostName}!</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          You have been added as a Host for <strong>${orgName || 'your organisation'}</strong> on the Digi-Gate platform. Below are your initial login credentials:
        </p>
        <div style="background-color: #f1f5f9; padding: 18px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #035352;">
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;"><strong>Host ID:</strong> ${hostId}</p>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #475569;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0; font-size: 14px; color: #0f172a;"><strong>Temporary Password:</strong> <span style="font-family: monospace; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-weight: bold; color: #035352;">${tempPassword}</span></p>
        </div>
        <p style="color: #d97706; font-size: 13px; line-height: 1.5; font-weight: 500;">
          ⚠️ For security reasons, you will be prompted to set a new password upon your first login.
        </p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/login" style="background-color: #035352; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: bold; display: inline-block;">
            Log In to Host Portal
          </a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Digi-Gate Access Control System &bull; All rights reserved.</p>
      </div>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`✉️ [HOST WELCOME EMAIL] To: ${email} | Host ID: ${hostId} | Temp Pass: ${tempPassword}`);
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
      console.log(`✅ Host welcome email sent successfully to ${email}`);
      return true;
    } else {
      console.log(`ℹ️ SMTP not configured. Welcome email logged to console.`);
      return true;
    }
  } catch (error) {
    console.error(`⚠️ Failed to send host welcome email via SMTP to ${email}:`, error);
    return false;
  }
};

export const sendHostPasswordResetNotificationEmail = async (
  email: string,
  hostName: string,
  orgName?: string
): Promise<boolean> => {
  const subject = `Your Digi-Gate Host Password Has Been Reset`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 550px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #035352; margin: 0; font-size: 24px; font-weight: bold;">DIGI-GATE</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Host Access Portal</p>
      </div>
      <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
        <h3 style="color: #1e293b; margin-top: 0; font-size: 18px;">Hello, ${hostName}</h3>
        <p style="color: #334155; font-size: 14px; line-height: 1.6;">
          Your host password for <strong>${orgName || 'Digi-Gate'}</strong> has been reset by the Administrator.
        </p>
        <p style="color: #475569; font-size: 13px; line-height: 1.6;">
          For security purposes, credentials are not included in this email. Please contact your Organisation Administrator to obtain your new password.
        </p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="http://localhost:5173/login" style="background-color: #035352; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: bold; display: inline-block;">
            Open Host Login
          </a>
        </div>
      </div>
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">Digi-Gate Access Control System &bull; All rights reserved.</p>
      </div>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`✉️ [HOST RESET NOTIFICATION] To: ${email} | Name: ${hostName} (No credentials sent)`);
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
      console.log(`✅ Host reset notification email sent successfully to ${email}`);
      return true;
    } else {
      console.log(`ℹ️ SMTP not configured. Reset notification logged to console.`);
      return true;
    }
  } catch (error) {
    console.error(`⚠️ Failed to send host reset notification email to ${email}:`, error);
    return false;
  }
};

