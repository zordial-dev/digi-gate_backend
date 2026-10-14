import express, { Router } from 'express';
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
    const cleanEmail = data.email ? String(data.email).trim().toLowerCase() : '';
    const orgId = data.organisation_id ? parseInt(String(data.organisation_id), 10) : null;
    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: 'Host email address is required.' });
    }
    if (!data.full_name || !String(data.full_name).trim()) {
      return res.status(400).json({ success: false, error: 'Host full name is required.' });
    }
    if (!orgId) {
      return res.status(400).json({ success: false, error: 'Organisation ID is required.' });
    }
    // Check if host with this email already exists in this organisation
    const existingHost = await People.findOne({
      where: {
        organisation_id: orgId,
        email: cleanEmail,
      },
    });
    if (existingHost) {
      return res.status(400).json({
        success: false,
        error: `A host with email "${cleanEmail}" already exists in this organisation.`,
      });
    }
    data.email = cleanEmail;
    data.organisation_id = orgId;
    
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
    // Send Welcome Email (Host ID + Temp Password)
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
  } catch (error: any) {
    console.error('Error creating host:', error);
    if (
      error.name === 'SequelizeUniqueConstraintError' ||
      error.original?.code === '23505' ||
      error.parent?.code === '23505' ||
      String(error.message).includes('already exists')
    ) {
      return res.status(400).json({
        success: false,
        error: 'A host with this email already exists in this organisation.',
      });
    }
    res.status(500).json({ success: false, error: error.message || 'Failed to create host.' });
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
// PATCH /api/hosts/:id/availability & /unavailable-dates
// ============================================================
const handleUpdateAvailability = async (req: express.Request, res: express.Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const host = await People.findByPk(id);
    if (!host) {
      return res.status(404).json({ success: false, error: 'Host not found' });
    }
    
    const updateData: any = {};
    const {
      unavailable_dates,
      available_from,
      available_to,
      lunch_from,
      lunch_to,
      working_days,
      date_overrides,
    } = req.body;

    if (unavailable_dates !== undefined) {
      let dates = unavailable_dates;
      if (typeof dates === 'string') {
        try { dates = JSON.parse(dates); } catch (_) {}
      }
      if (Array.isArray(dates)) {
        updateData.unavailable_dates = dates;
      }
    }

    if (available_from !== undefined) updateData.available_from = available_from || '09:00:00';
    if (available_to !== undefined) updateData.available_to = available_to || '18:00:00';
    if (lunch_from !== undefined) updateData.lunch_from = lunch_from || '13:00:00';
    if (lunch_to !== undefined) updateData.lunch_to = lunch_to || '14:00:00';

    if (working_days !== undefined) {
      let days = working_days;
      if (typeof days === 'string') {
        try { days = JSON.parse(days); } catch (_) {}
      }
      if (Array.isArray(days)) {
        updateData.working_days = days;
      }
    }

    if (date_overrides !== undefined) {
      let overrides = date_overrides;
      if (typeof overrides === 'string') {
        try { overrides = JSON.parse(overrides); } catch (_) {}
      }
      if (typeof overrides === 'object' && overrides !== null) {
        updateData.date_overrides = overrides;
      }
    }

    await host.update(updateData);
    res.json({ success: true, data: host });
  } catch (error) {
    console.error('Error updating availability:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

router.patch('/:id/unavailable-dates', handleUpdateAvailability);
router.patch('/:id/availability', handleUpdateAvailability);

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