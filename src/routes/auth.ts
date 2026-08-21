import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { Users, Organisations } from '../models/index.js';
import { sendOtpEmail } from '../utils/email.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'digigate_jwt_secret_key_2026';

// Helper to generate 6-digit OTP
const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// GET info handler for signup
router.get('/signup', (_req, res) => {
  res.json({
    success: true,
    message: 'Digi-Gate Signup API is active. Send a POST request with organisation and user details to register.'
  });
});

// ----------------------------------------------------
// 1. SIGNUP WITH OTP (CREATES ORG + SINGLE ORG USER)
// ----------------------------------------------------
router.post('/signup', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      full_name,
      email,
      username,
      phone,
      password,
      role,
      organisation_name,
      organisation_code
    } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and Password are required.' });
      return;
    }

    const finalUsername = (username && username.trim() !== '') ? username.trim() : email.trim();
    const finalRole = role === 'admin' ? 'admin' : 'organisation';

    // Check if user already exists
    const existingUser = await Users.findOne({
      where: {
        [Op.or]: [
          { email: email.trim() },
          { username: finalUsername }
        ]
      }
    });

    if (existingUser) {
      res.status(400).json({ success: false, error: 'A user account with this email or username already exists.' });
      return;
    }

    let finalOrgId: number | null = null;

    if (finalRole === 'organisation' || organisation_name) {
      const orgName = (organisation_name && organisation_name.trim() !== '')
        ? organisation_name.trim()
        : `${full_name || 'My'} Organisation`;

      const cleanedName = orgName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const rawCode = (organisation_code && organisation_code.trim() !== '')
        ? organisation_code.trim().toUpperCase()
        : (cleanedName.length >= 2 ? cleanedName.slice(0, 6) : 'ORG');

      const orgCode = `${rawCode}_${Math.floor(100 + Math.random() * 900)}`;

      // Check if organisation with this name or code exists and already has a user
      const existingOrg = await Organisations.findOne({
        where: {
          [Op.or]: [{ name: orgName }, { code: orgCode }]
        }
      });

      if (existingOrg) {
        const userInOrg = await Users.findOne({ where: { organisation_id: existingOrg.id } });
        if (userInOrg) {
          res.status(400).json({
            success: false,
            error: 'An account for this organisation already exists. Only one user is permitted per organisation.'
          });
          return;
        }
        finalOrgId = existingOrg.id;
      } else {
        // Create new Organisation with is_active = false (Pending Admin Approval)
        const newOrg = await Organisations.create({
          name: orgName,
          code: orgCode,
          phone: phone || null,
          email: email.trim(),
          is_active: false // PENDING ADMIN APPROVAL
        });
        finalOrgId = newOrg.id;
      }
    }

    // Store direct plain text password
    const directPassword = password;

    // Generate 6-digit OTP
    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create single user for organisation
    const newUser = await Users.create({
      username: finalUsername,
      email: email.trim(),
      password: directPassword,
      full_name: full_name || null,
      phone: phone || null,
      role: finalRole,
      organisation_id: finalOrgId,
      is_verified: false,
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt
    });

    // Send OTP Email
    await sendOtpEmail(email.trim(), otpCode, 'signup');

    res.status(201).json({
      success: true,
      message: 'Organisation registration submitted. An OTP code has been sent to your email. Administrator approval is required before logging in.',
      email: newUser.email,
      requiresOtp: true,
      requiresApproval: finalRole === 'organisation',
      devOtp: otpCode
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, error: error.message || 'Registration failed.' });
  }
});

// ----------------------------------------------------
// 2. VERIFY OTP (SIGNUP)
// ----------------------------------------------------
router.post('/verify-otp', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ success: false, error: 'Email and OTP code are required.' });
      return;
    }

    const user = await Users.findOne({
      where: {
        [Op.or]: [{ email: email.trim() }, { username: email.trim() }]
      },
      include: [{ model: Organisations, as: 'organisation' }]
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    if (user.otp_code !== otp.trim()) {
      res.status(400).json({ success: false, error: 'Invalid OTP code. Please check and try again.' });
      return;
    }

    if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
      res.status(400).json({ success: false, error: 'OTP code has expired. Please request a new one.' });
      return;
    }

    // Mark user as verified & clear OTP
    await user.update({
      is_verified: true,
      otp_code: null,
      otp_expires_at: null
    });

    // Check if organisation is approved by admin
    let isApproved = true;
    if (user.role === 'organisation' && user.organisation_id) {
      const org = await Organisations.findByPk(user.organisation_id);
      if (!org || org.is_active === false) {
        isApproved = false;
      }
    }

    if (!isApproved) {
      res.json({
        success: true,
        requiresApproval: true,
        message: 'OTP verified successfully! Your organisation registration is now pending approval by the System Administrator. You can log in once approved.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          organisation_id: user.organisation_id
        }
      });
      return;
    }

    // Generate JWT Token if already approved
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organisation_id: user.organisation_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      requiresApproval: false,
      message: 'OTP verified successfully.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        organisation_id: user.organisation_id
      }
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, error: error.message || 'OTP verification failed.' });
  }
});

// GET info handler for browser testing
router.get('/login', (_req, res) => {
  res.json({
    success: true,
    message: 'Digi-Gate Authentication API is active. Send a POST request with { email, password } to authenticate.'
  });
});

// ----------------------------------------------------
// 3. LOGIN WITH ADMIN APPROVAL CHECK
// ----------------------------------------------------
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email/Username and Password are required.' });
      return;
    }

    // Find user by email or username
    const user = await Users.findOne({
      where: {
        [Op.or]: [{ email: email.trim() }, { username: email.trim() }]
      },
      include: [{ model: Organisations, as: 'organisation' }]
    });

    console.log('=== LOGIN ATTEMPT RECEIVED ===');
    console.log('Payload:', { email, password });
    console.log('DB User:', user ? { id: user.id, username: user.username, email: user.email, dbPassword: user.password } : 'NOT FOUND');

    if (!user) {
      res.status(400).json({ success: false, error: 'Invalid credentials. User does not exist.' });
      return;
    }

    // Check direct plain-text password (robust against whitespace)
    const cleanReqPassword = String(password).trim();
    const cleanDbPassword = String(user.password).trim();
    const isDirectMatch = cleanReqPassword === cleanDbPassword || password === user.password;
    const isLegacyHashMatch = user.password && user.password.startsWith('$2') 
      ? await bcrypt.compare(cleanReqPassword, user.password).catch(() => false) 
      : false;

    if (!isDirectMatch && !isLegacyHashMatch) {
      res.status(400).json({ success: false, error: 'Invalid credentials. Password is incorrect.' });
      return;
    }

    // CHECK ADMIN APPROVAL FOR ORGANISATIONS
    if (user.role === 'organisation') {
      const org = user.organisation_id ? await Organisations.findByPk(user.organisation_id) : null;
      if (!org || org.is_active === false) {
        res.status(403).json({
          success: false,
          error: 'Your organisation account is pending approval by the System Administrator. Please wait for admin approval before logging in.'
        });
        return;
      }
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        organisation_id: user.organisation_id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        organisation_id: user.organisation_id,
        organisation_name: user.organisation?.name || null
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message || 'Login failed.' });
  }
});

// ----------------------------------------------------
// 4. FORGOT PASSWORD (REQUEST OTP)
// ----------------------------------------------------
router.post('/forgot-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email or Username is required.' });
      return;
    }

    const user = await Users.findOne({
      where: {
        [Op.or]: [{ email: email.trim() }, { username: email.trim() }]
      }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'No account found with that email or username.' });
      return;
    }

    // Generate 6-digit OTP
    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.update({
      otp_code: otpCode,
      otp_expires_at: otpExpiresAt
    });

    // Send OTP email
    await sendOtpEmail(user.email, otpCode, 'forgot_password');

    res.json({
      success: true,
      message: 'Password reset OTP sent to your email address.',
      email: user.email,
      devOtp: otpCode
    });
  } catch (error: any) {
    console.error('Forgot Password error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process forgot password request.' });
  }
});

// ----------------------------------------------------
// 5. RESET PASSWORD (VERIFY OTP & UPDATE PASSWORD)
// ----------------------------------------------------
router.post('/reset-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      res.status(400).json({ success: false, error: 'Email, OTP code, and New Password are required.' });
      return;
    }

    const user = await Users.findOne({
      where: {
        [Op.or]: [{ email: email.trim() }, { username: email.trim() }]
      }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    if (user.otp_code !== otp.trim()) {
      res.status(400).json({ success: false, error: 'Invalid OTP code.' });
      return;
    }

    if (user.otp_expires_at && new Date(user.otp_expires_at) < new Date()) {
      res.status(400).json({ success: false, error: 'OTP code has expired. Please request a new one.' });
      return;
    }

    // Save direct plain-text password
    await user.update({
      password: new_password,
      otp_code: null,
      otp_expires_at: null,
      is_verified: true
    });

    res.json({
      success: true,
      message: 'Password reset successfully. Please sign in with your new password.'
    });
  } catch (error: any) {
    console.error('Reset Password error:', error);
    res.status(500).json({ success: false, error: error.message || 'Password reset failed.' });
  }
});

// ----------------------------------------------------
// 6. GET CURRENT LOGGED IN USER
// ----------------------------------------------------
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' });
      return;
    }

    const user = await Users.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'otp_code', 'otp_expires_at'] },
      include: [{ model: Organisations, as: 'organisation', attributes: ['id', 'name', 'logo_url', 'is_active'] }]
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User profile not found.' });
      return;
    }

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch profile.' });
  }
});

export default router;
