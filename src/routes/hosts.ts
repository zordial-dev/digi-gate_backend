import { Router } from 'express';
import { People, Organisations } from '../models/index.js';
import { createUpload } from '../middleware/upload.js';
import { sendHostWelcomeEmail, sendHostPasswordResetNotificationEmail } from '../utils/email.js';

const router = Router();

const profileUpload = createUpload({
  folder: 'profiles',
  filename: `profile_${Date.now()}`
});

// ============================================================
// GET /api/hosts/:id - Get single host
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const host = await People.findByPk(id);
    if (!host) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }
    res.json({ success: true, data: host });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// POST /api/hosts - Create host with profile picture
// ============================================================
router.post('/', profileUpload.single('profile_pic'), async (req, res) => {
  try {
    const data = { ...req.body };
    const file = (req as any).file;
    if (file) {
      data.profile_pic = `/profiles/${file.filename}`;
    }
    if (typeof data.unavailable_dates === 'string') {
      try { data.unavailable_dates = JSON.parse(data.unavailable_dates); } catch (_) {}
    }
    
    // Generate temporary password if not provided or empty
    const tempPassword = (data.password !== undefined && data.password !== null && String(data.password).trim() !== '')
      ? String(data.password).trim()
      : `DG-${Math.floor(100000 + Math.random() * 900000)}`;

    data.password = tempPassword;
    data.is_first_login = true;

    if (data.is_blocked !== undefined) {
      data.is_blocked = data.is_blocked === true || data.is_blocked === 'true';
    }

    const host = await People.create(data);

    // Fetch organisation name for welcome email
    let orgName = '';
    if (host.organisation_id) {
      try {
        const org = await Organisations.findByPk(host.organisation_id);
        if (org) orgName = org.name;
      } catch (_) {}
    }

    // Send Welcome Email (Host ID + Temp Password) as per sequence diagram
    if (host.email) {
      sendHostWelcomeEmail(host.email, host.full_name, host.id, tempPassword, orgName).catch((err) => {
        console.error('Failed to send host welcome email in background:', err);
      });
    }

    res.status(201).json({
      success: true,
      data: host,
      tempPassword,
      message: 'Host created successfully. Welcome email sent with temporary credentials.'
    });
  } catch (error) {
    console.error('Error creating host:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// PUT /api/hosts/:id - Update host with profile picture
// ============================================================
router.put('/:id', profileUpload.single('profile_pic'), async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const host = await People.findByPk(id);
    if (!host) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }
    
    const data = { ...req.body };
    const file = (req as any).file;
    if (file) {
      data.profile_pic = `/profiles/${file.filename}`;
    }
    if (typeof data.unavailable_dates === 'string') {
      try { data.unavailable_dates = JSON.parse(data.unavailable_dates); } catch (_) {}
    }
    if (data.password !== undefined && data.password !== null && String(data.password).trim() !== '') {
      data.password = String(data.password).trim();
    } else {
      delete data.password;
    }
    if (data.is_blocked !== undefined) {
      data.is_blocked = data.is_blocked === true || data.is_blocked === 'true';
    }
    
    await host.update(data);
    res.json({ success: true, data: host });
  } catch (error) {
    console.error('Error updating host:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// DELETE /api/hosts/:id - Delete host
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const host = await People.findByPk(id);
    if (!host) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }
    
    await host.destroy();
    res.json({ success: true, message: 'Host deleted successfully' });
  } catch (error) {
    console.error('Error deleting host:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// PATCH /api/hosts/:id/toggle-availability - Toggle host availability
// ============================================================
router.patch('/:id/toggle-availability', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const host = await People.findByPk(id);
    if (!host) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }
    
    await host.update({ is_available: !host.is_available });
    res.json({ success: true, data: host });
  } catch (error) {
    console.error('Error toggling host availability:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// PATCH /api/hosts/:id/unavailable-dates - Update unavailable dates calendar
// ============================================================
router.patch('/:id/unavailable-dates', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const host = await People.findByPk(id);
    if (!host) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }
    
    const { unavailable_dates } = req.body;
    let dates = unavailable_dates;
    if (typeof dates === 'string') {
      try { dates = JSON.parse(dates); } catch (_) {}
    }
    if (!Array.isArray(dates)) {
      return res.status(400).json({ success: false, error: 'unavailable_dates must be an array of date strings' });
    }

    await host.update({ unavailable_dates: dates });
    res.json({ success: true, data: host });
  } catch (error) {
    console.error('Error updating unavailable dates:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// PATCH /api/hosts/:id/toggle-block - Block / Unblock host
// ============================================================
router.patch('/:id/toggle-block', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const host = await People.findByPk(id);
    if (!host) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const newBlockedState = !(host.is_blocked || false);
    await host.update({ is_blocked: newBlockedState });
    res.json({
      success: true,
      data: host,
      message: `Host ${newBlockedState ? 'blocked' : 'unblocked'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling host block status:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ============================================================
// PATCH /api/hosts/:id/password - Reset / Change host password
// ============================================================
router.patch('/:id/password', async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    const host = await People.findByPk(id);
    if (!host) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }

    const { password } = req.body;
    // If password provided, use it; otherwise generate a new one
    const newPassword = (password && String(password).trim() !== '')
      ? String(password).trim()
      : `DG-${Math.floor(100000 + Math.random() * 900000)}`;

    // As per sequence diagram: "Host logs in with Super Admin-provided password -> No password change step required"
    await host.update({
      password: newPassword,
      is_first_login: false,
    });

    // Lookup organisation name for notification email
    let orgName = '';
    if (host.organisation_id) {
      try {
        const org = await Organisations.findByPk(host.organisation_id);
        if (org) orgName = org.name;
      } catch (_) {}
    }

    // Send Password Reset Email (No credentials included as per diagram)
    if (host.email) {
      sendHostPasswordResetNotificationEmail(host.email, host.full_name, orgName).catch((err) => {
        console.error('Failed to send host password reset notification in background:', err);
      });
    }

    res.json({
      success: true,
      data: host,
      newPassword,
      message: 'Host password updated successfully. Notification email sent to host.',
    });
  } catch (error) {
    console.error('Error changing host password:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;