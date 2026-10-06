/**
 * MessageCentral CPaaS SMS OTP Service
 * Handles sending and verifying OTPs via MessageCentral API
 */

const BASE_URL = process.env.MESSAGECENTRAL_BASE_URL || 'https://cpaas.messagecentral.com';
const CUSTOMER_ID = process.env.MESSAGECENTRAL_CUSTOMER_ID || '';
const AUTH_TOKEN = process.env.MESSAGECENTRAL_AUTH_TOKEN || '';
const FLOW_TYPE = process.env.MESSAGECENTRAL_FLOW_TYPE || 'SMS';

// In-memory store for verification IDs (mobile -> verificationId)
const verificationStore = new Map<string, { verificationId: string; expiresAt: number }>();

/**
 * Parse a mobile number string into countryCode + 10-digit number
 */
function parseMobile(inputPhone: string): { countryCode: string; mobileNumber: string } {
  let countryCode = '91';
  let mobileNumber = inputPhone.replace(/\D/g, '');

  if (mobileNumber.length > 10 && mobileNumber.startsWith('91')) {
    mobileNumber = mobileNumber.slice(2);
  } else if (mobileNumber.length > 10) {
    countryCode = mobileNumber.slice(0, mobileNumber.length - 10);
    mobileNumber = mobileNumber.slice(-10);
  }

  return { countryCode, mobileNumber };
}

/**
 * Send OTP SMS via MessageCentral
 * Returns { success, verificationId, message }
 */
export async function sendSmsOtp(mobile: string): Promise<{ success: boolean; verificationId?: string; message: string }> {
  if (!CUSTOMER_ID || !AUTH_TOKEN) {
    console.error('❌ MessageCentral credentials missing');
    return { success: false, message: 'SMS service is not configured.' };
  }

  const { countryCode, mobileNumber } = parseMobile(mobile);

  const url = new URL(`${BASE_URL}/verification/v3/send`);
  url.searchParams.append('countryCode', countryCode);
  url.searchParams.append('customerId', CUSTOMER_ID);
  url.searchParams.append('flowType', FLOW_TYPE);
  url.searchParams.append('mobileNumber', mobileNumber);
  url.searchParams.append('otpLength', '6');

  try {
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'authToken': AUTH_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { responseCode: response.status, message: text };
    }

    if (response.ok && data?.responseCode === 200) {
      const verificationId = data?.data?.verificationId;
      if (verificationId) {
        // Store verificationId for later validation (10 min expiry)
        verificationStore.set(mobileNumber, {
          verificationId,
          expiresAt: Date.now() + 10 * 60 * 1000,
        });
      }
      console.log(`✅ SMS OTP sent to +${countryCode}${mobileNumber}`);
      return { success: true, verificationId, message: 'OTP sent successfully' };
    } else {
      console.error('⚠️ MessageCentral error:', data);
      return { success: false, message: data?.message || 'Failed to send OTP' };
    }
  } catch (err: any) {
    console.error('❌ SMS OTP send failed:', err.message);
    return { success: false, message: 'SMS service unavailable. Please try again.' };
  }
}

/**
 * Verify OTP via MessageCentral
 * Returns { success, message }
 */
export async function verifySmsOtp(mobile: string, otp: string): Promise<{ success: boolean; message: string }> {
  if (!CUSTOMER_ID || !AUTH_TOKEN) {
    return { success: false, message: 'SMS service is not configured.' };
  }

  const { countryCode, mobileNumber } = parseMobile(mobile);

  // Get stored verificationId
  const stored = verificationStore.get(mobileNumber);
  if (!stored) {
    return { success: false, message: 'No OTP was sent to this number. Please request a new OTP.' };
  }

  if (Date.now() > stored.expiresAt) {
    verificationStore.delete(mobileNumber);
    return { success: false, message: 'OTP has expired. Please request a new OTP.' };
  }

  const url = new URL(`${BASE_URL}/verification/v3/validateOtp`);
  url.searchParams.append('countryCode', countryCode);
  url.searchParams.append('mobileNumber', mobileNumber);
  url.searchParams.append('verificationId', stored.verificationId);
  url.searchParams.append('customerId', CUSTOMER_ID);
  url.searchParams.append('code', otp);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'authToken': AUTH_TOKEN,
      },
    });

    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { responseCode: response.status, message: text };
    }

    if (response.ok && data?.responseCode === 200 && data?.data?.verificationStatus === 'VERIFICATION_COMPLETED') {
      verificationStore.delete(mobileNumber);
      console.log(`✅ OTP verified for +${countryCode}${mobileNumber}`);
      return { success: true, message: 'OTP verified successfully' };
    } else {
      console.log(`❌ OTP verification failed for +${countryCode}${mobileNumber}:`, data?.data?.verificationStatus || data?.message);
      return { success: false, message: 'Invalid OTP code. Please check and try again.' };
    }
  } catch (err: any) {
    console.error('❌ SMS OTP verify failed:', err.message);
    return { success: false, message: 'Verification service unavailable. Please try again.' };
  }
}
