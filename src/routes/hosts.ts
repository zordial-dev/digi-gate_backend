import { Router } from 'express';
import { People } from '../models/index.js';
import { createUpload } from '../middleware/upload.js';

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
    const host = await People.create(data);
    res.status(201).json({ success: true, data: host });
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

export default router;