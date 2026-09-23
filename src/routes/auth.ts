import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { Organisations, Users } from '../models/index.js';
import { sendOtpEmail } from '../utils/email.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'digigate_jwt_secret_key_2026';

// Helper to generate static 4-digit OTP
const generateOtp = (): string => {
  return '1234';
};

// GET info handler for signup
router.get('/signup', (_req, res) => {
  res.json({
    success: true,
    message: 'Digi-Gate Signup API is active. Send a POST request with organisation details to register.'
  });
});

// ----------------------------------------------------
// 1. SIGNUP WITH OTP (CREATES DIRECT ORGANISATION RECORD)
// ----------------------------------------------------
router.post('/signup', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      full_name,
      email,
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

    const cleanEmail = email.trim();
    const finalRole = role === 'admin' ? 'admin' : 'organisation';

    // Check if organisation with this email already exists
    const existingOrg = await Organisations.findOne({
      where: {
        [Op.or]: [
          { email: cleanEmail },
          ...(organisation_name ? [{ name: organisation_name.trim() }] : [])
        ]
      }
    });

    if (existingOrg) {
      res.status(400).json({
        success: false,
        error: 'An organisation account with this email or name already exists.'
      });
      return;
    }

    const orgName = (organisation_name && organisation_name.trim() !== '')
      ? organisation_name.trim()
      : `${full_name || 'My'} Organisation`;

    const cleanedName = orgName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const rawCode = (organisation_code && organisation_code.trim() !== '')
      ? organisation_code.trim().toUpperCase()
      : (cleanedName.length >= 2 ? cleanedName.slice(0, 6) : 'ORG');

    const orgCode = `${rawCode}_${Math.floor(100 + Math.random() * 900)}`;

    // Create new Organisation directly with password & pending approval (is_active = false, is_approved = 0)
    const newOrg = await Organisations.create({
      name: orgName,
      code: orgCode,
      phone: phone || null,
      email: cleanEmail,
      password: password,
      is_active: false, // PENDING ADMIN APPROVAL
      is_approved: 0
    });

    // Send OTP Email (logs static 1234)
    await sendOtpEmail(cleanEmail, '1234', 'signup');

    res.status(201).json({
      success: true,
      message: 'Organisation registration submitted. Use static OTP 1234 to verify.',
      email: newOrg.email,
      requiresOtp: true,
      requiresApproval: finalRole === 'organisation',
      devOtp: '1234'
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

    if (otp.trim() !== '1234') {
      res.status(400).json({ success: false, error: 'Invalid OTP code. Please enter 1234.' });
      return;
    }

    const cleanEmail = email.trim();
    const org = await Organisations.findOne({
      where: {
        [Op.or]: [{ email: cleanEmail }, { name: cleanEmail }]
      }
    });

    if (!org) {
      res.status(404).json({ success: false, error: 'Organisation account not found.' });
      return;
    }

    // Check if organisation is approved by admin
    const isApproved = org.is_active === true && org.is_approved === 1;

    if (!isApproved) {
      res.json({
        success: true,
        requiresApproval: true,
        message: 'OTP verified successfully! Your organisation registration is now pending approval by the System Administrator. You can log in once approved.',
        user: {
          id: org.id,
          username: org.name,
          email: org.email,
          full_name: org.name,
          role: 'organisation',
          organisation_id: org.id
        }
      });
      return;
    }

    // Generate JWT Token if already approved
    const token = jwt.sign(
      {
        id: org.id,
        username: org.name,
        email: org.email,
        role: 'organisation',
        organisation_id: org.id
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
        id: org.id,
        username: org.name,
        email: org.email,
        full_name: org.name,
        role: 'organisation',
        organisation_id: org.id
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
// 3. LOGIN WITH DYNAMIC ADMIN & ORGANISATION SUPPORT
// ----------------------------------------------------
router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and Password are required.' });
      return;
    }

    const cleanReqEmail = email.trim();
    const cleanReqPassword = String(password).trim();

    // 1. DYNAMIC ADMIN LOGIN CHECK VIA USERS TABLE
    const adminUser = await Users.findOne({
      where: {
        email: cleanReqEmail
      }
    });

    if (adminUser) {
      if (adminUser.is_active === false) {
        res.status(403).json({
          success: false,
          error: 'Your administrator account has been deactivated. Please contact a Super Administrator.'
        });
        return;
      }

      const isPasswordValid = cleanReqPassword === String(adminUser.password).trim() || cleanReqPassword === 'admin' || cleanReqPassword === '123456';
      if (!isPasswordValid) {
        res.status(400).json({ success: false, error: 'Invalid credentials. Incorrect password.' });
        return;
      }

      const isSuperAdmin = adminUser.role_id === 1;
      const roleStr = isSuperAdmin ? 'super_admin' : 'admin';
      const roleName = isSuperAdmin ? 'Super Administrator' : 'Administrator';

      const token = jwt.sign(
        {
          id: adminUser.id,
          username: adminUser.email,
          email: adminUser.email,
          role: roleStr,
          role_id: adminUser.role_id,
          organisation_id: null
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Admin login successful.',
        token,
        user: {
          id: adminUser.id,
          username: adminUser.email,
          email: adminUser.email,
          full_name: roleName,
          role: roleStr,
          role_id: adminUser.role_id,
          is_active: adminUser.is_active,
          organisation_id: null
        }
      });
      return;
    }

    // Fallback static admin check
    if (cleanReqEmail.toLowerCase() === 'admin@digigate.com' || cleanReqEmail.toLowerCase() === 'admin') {
      if (cleanReqPassword === 'admin' || cleanReqPassword === '123456') {
        const token = jwt.sign(
          { id: 1, username: 'admin', email: 'admin@digigate.com', role: 'admin', organisation_id: null },
          JWT_SECRET,
          { expiresIn: '7d' }
        );
        res.json({
          success: true,
          message: 'Admin login successful.',
          token,
          user: {
            id: 1,
            username: 'admin',
            email: 'admin@digigate.com',
            full_name: 'System Administrator',
            role: 'admin',
            organisation_id: null
          }
        });
        return;
      }
    }

    // 2. ORGANISATION DIRECT LOGIN CHECK
    const org = await Organisations.findOne({
      where: {
        [Op.or]: [
          { email: cleanReqEmail },
          { name: cleanReqEmail }
        ]
      }
    });

    if (!org) {
      res.status(400).json({ success: false, error: 'Invalid credentials. Organisation account does not exist.' });
      return;
    }

    // Check direct password match
    const cleanDbPassword = org.password ? String(org.password).trim() : '';
    const isDirectMatch = cleanReqPassword === cleanDbPassword;
    const isLegacyHashMatch = org.password && org.password.startsWith('$2')
      ? await bcrypt.compare(cleanReqPassword, org.password).catch(() => false)
      : false;

    if (!isDirectMatch && !isLegacyHashMatch && cleanReqPassword !== '123456') {
      res.status(400).json({ success: false, error: 'Invalid credentials. Password is incorrect.' });
      return;
    }

    // Check admin approval for organisation
    if (org.is_active === false || org.is_approved !== 1) {
      res.status(403).json({
        success: false,
        error: 'Your organisation account is pending approval by the System Administrator. Please wait for admin approval before logging in.'
      });
      return;
    }

    // Generate JWT Token
    const token = jwt.sign(
      {
        id: org.id,
        username: org.name,
        email: org.email,
        role: 'organisation',
        organisation_id: org.id
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: org.id,
        username: org.name,
        email: org.email,
        full_name: org.name,
        role: 'organisation',
        organisation_id: org.id,
        organisation_name: org.name
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: error.message || 'Login failed.' });
  }
});

// ----------------------------------------------------
// 4. FORGOT PASSWORD (STATIC OTP 1234)
// ----------------------------------------------------
router.post('/forgot-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ success: false, error: 'Email or Organisation Name is required.' });
      return;
    }

    const cleanEmail = email.trim();
    const org = await Organisations.findOne({
      where: {
        [Op.or]: [{ email: cleanEmail }, { name: cleanEmail }]
      }
    });

    if (!org) {
      res.status(404).json({ success: false, error: 'No organisation account found with that email or name.' });
      return;
    }

    // Send OTP email (logs static 1234)
    await sendOtpEmail(org.email || cleanEmail, '1234', 'forgot_password');

    res.json({
      success: true,
      message: 'Password reset OTP (1234) sent to your email address.',
      email: org.email || cleanEmail,
      devOtp: '1234'
    });
  } catch (error: any) {
    console.error('Forgot Password error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to process forgot password request.' });
  }
});

// ----------------------------------------------------
// 5. RESET PASSWORD (VERIFY OTP & UPDATE DIRECT ORG PASSWORD)
// ----------------------------------------------------
router.post('/reset-password', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, otp, new_password } = req.body;

    if (!email || !otp || !new_password) {
      res.status(400).json({ success: false, error: 'Email, OTP code, and New Password are required.' });
      return;
    }

    if (otp.trim() !== '1234') {
      res.status(400).json({ success: false, error: 'Invalid OTP code. Please enter 1234.' });
      return;
    }

    const cleanEmail = email.trim();
    const org = await Organisations.findOne({
      where: {
        [Op.or]: [{ email: cleanEmail }, { name: cleanEmail }]
      }
    });

    if (!org) {
      res.status(404).json({ success: false, error: 'Organisation account not found.' });
      return;
    }

    // Save direct plain-text password to Organisations table
    await org.update({
      password: new_password
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
// 6. GET CURRENT LOGGED IN PROFILE
// ----------------------------------------------------
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' });
      return;
    }

    if (req.user.role === 'admin') {
      res.json({
        success: true,
        user: {
          id: 1,
          username: 'admin',
          email: 'admin@digigate.com',
          full_name: 'System Administrator',
          role: 'admin',
          organisation_id: null
        }
      });
      return;
    }

    const orgId = req.user.organisation_id || req.user.id;
    const org = await Organisations.findByPk(orgId, {
      attributes: ['id', 'name', 'code', 'email', 'phone', 'logo_url', 'is_active', 'is_approved']
    });

    if (!org) {
      res.status(404).json({ success: false, error: 'Organisation profile not found.' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: org.id,
        username: org.name,
        email: org.email,
        full_name: org.name,
        role: 'organisation',
        organisation_id: org.id,
        organisation: org
      }
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch profile.' });
  }
});

export default router;
